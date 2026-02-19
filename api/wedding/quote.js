/**
 * Wedding Quote Submission API
 * Handles quote submissions, validation, and storage
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Wedding Quote Submission Handler
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart, quote, contact, timestamp } = req.body;

    // Validate required fields
    if (!cart || !quote || !contact) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['cart', 'quote', 'contact']
      });
    }

    // Validate contact information
    if (!contact.name || !contact.email || !contact.phone) {
      return res.status(400).json({
        error: 'Missing contact information',
        required: ['name', 'email', 'phone']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Server-side price recalculation for security
    // (Prevent client-side manipulation)
    const WeddingCalculator = require('../../src/js/wedding-calculator-node.js');
    const calculator = new WeddingCalculator(cart.venueCity || 'unincorporated');
    const serverQuote = calculator.calculateCompleteQuote(cart);

    // Compare totals (allow small rounding differences)
    const clientTotal = quote.totals.grandTotal;
    const serverTotal = serverQuote.totals.grandTotal;
    const difference = Math.abs(clientTotal - serverTotal);

    if (difference > 1.00) {
      console.warn('Price mismatch detected:', {
        client: clientTotal,
        server: serverTotal,
        difference
      });
      
      // Log but don't reject - use server calculation
      quote.totals = serverQuote.totals;
    }

    // Generate quote number
    const quoteNumber = `WQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Prepare database record
    const quoteRecord = {
      quote_number: quoteNumber,
      event_date: cart.venue.date,
      guest_count: cart.guestCount,
      
      // Venue
      venue_type: cart.venue.type,
      venue_hours: cart.venue.hours,
      venue_cost: serverQuote.venue.cost,
      
      // Catering
      catering_protein1: cart.catering.protein1,
      catering_protein2: cart.catering.protein2,
      catering_sides: cart.catering.sides,
      catering_appetizers: cart.catering.appetizers,
      average_meal_cost: serverQuote.catering.avgProteinPrice,
      catering_total: serverQuote.catering.total,
      
      // Beverages
      beverage_package: cart.beverages.package,
      beverage_cost: serverQuote.beverages.total,
      
      // Service fee
      service_fee: serverQuote.serviceFee.amount,
      
      // Add-ons
      floral_package: cart.addOns.floral,
      floral_cost: serverQuote.addOns.floral.cost,
      photography: cart.addOns.photography,
      photography_cost: serverQuote.addOns.photography.cost,
      wedding_planner: cart.addOns.weddingPlanner,
      wedding_planner_cost: serverQuote.addOns.weddingPlanner.cost,
      wedding_planner_free: serverQuote.addOns.weddingPlanner.isFree,
      dj_service: cart.addOns.dj,
      dj_cost: serverQuote.addOns.dj.cost,
      
      // Tax calculation
      taxable_subtotal: serverQuote.totals.taxableSubtotal,
      non_taxable_subtotal: serverQuote.totals.nonTaxableSubtotal,
      sales_tax_rate: serverQuote.tax.rate,
      sales_tax_amount: serverQuote.totals.salesTax,
      
      // Discount
      full_package_eligible: serverQuote.fullPackage.eligible,
      full_package_discount: serverQuote.totals.discount,
      
      // Total
      grand_total: serverQuote.totals.grandTotal,
      
      // Contact
      customer_name: contact.name,
      customer_email: contact.email,
      customer_phone: contact.phone,
      customer_message: contact.message,
      preferred_contact: contact.preferredContact,
      
      // Full cart state for reference
      cart_state: JSON.stringify(cart),
      quote_details: JSON.stringify(serverQuote),
      
      // Status
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Insert into database
    const { data, error } = await supabase
      .from('wedding_quotes')
      .insert([quoteRecord])
      .select();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save quote to database');
    }

    // Send notification email to customer
    try {
      await sendCustomerEmail(contact.email, contact.name, quoteNumber, serverQuote);
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification to admin
    try {
      await sendAdminNotification(quoteRecord, serverQuote);
    } catch (emailError) {
      console.error('Failed to send admin email:', emailError);
    }

    // Return success response
    res.status(200).json({
      success: true,
      quoteNumber,
      quoteId: data[0]?.id,
      message: 'Quote submitted successfully',
      estimatedTotal: serverQuote.totals.grandTotal
    });

  } catch (error) {
    console.error('Error processing quote:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process quote. Please try again or contact us directly.'
    });
  }
};

/**
 * Send confirmation email to customer
 */
async function sendCustomerEmail(email, name, quoteNumber, quote) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailHtml = generateCustomerEmailHTML(name, quoteNumber, quote);

  await resend.emails.send({
    from: 'Stone House Weddings <weddings@stonehouse.io>',
    to: email,
    subject: `Your Wedding Quote #${quoteNumber} - Stone House`,
    html: emailHtml
  });
}

/**
 * Send notification email to admin
 */
async function sendAdminNotification(quoteRecord, quote) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const adminEmail = process.env.ADMIN_EMAIL || 'bookings@stonehouse.io';

  const emailHtml = `
    <h2>New Wedding Quote Submitted</h2>
    <p><strong>Quote Number:</strong> ${quoteRecord.quote_number}</p>
    <p><strong>Customer:</strong> ${quoteRecord.customer_name}</p>
    <p><strong>Email:</strong> ${quoteRecord.customer_email}</p>
    <p><strong>Phone:</strong> ${quoteRecord.customer_phone}</p>
    <p><strong>Event Date:</strong> ${new Date(quoteRecord.event_date).toLocaleDateString()}</p>
    <p><strong>Guest Count:</strong> ${quoteRecord.guest_count}</p>
    <p><strong>Estimated Total:</strong> $${quote.totals.grandTotal.toFixed(2)}</p>
    <p><strong>Preferred Contact:</strong> ${quoteRecord.preferred_contact}</p>
    ${quoteRecord.customer_message ? `<p><strong>Message:</strong> ${quoteRecord.customer_message}</p>` : ''}
    <hr>
    <p><a href="${process.env.ADMIN_PANEL_URL}/quotes/${quoteRecord.quote_number}">View Full Quote in Admin Panel</a></p>
  `;

  await resend.emails.send({
    from: 'Stone House Notifications <notifications@stonehouse.io>',
    to: adminEmail,
    subject: `New Wedding Quote: ${quoteRecord.customer_name} - $${quote.totals.grandTotal.toFixed(2)}`,
    html: emailHtml
  });
}

/**
 * Generate customer email HTML
 */
function generateCustomerEmailHTML(name, quoteNumber, quote) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37, #8B4053); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .quote-number { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 1.2em; font-weight: bold; color: #D4AF37; }
        .line-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total-row { display: flex; justify-content: space-between; padding: 15px 0; font-size: 1.3em; font-weight: bold; color: #D4AF37; border-top: 3px solid #D4AF37; margin-top: 15px; }
        .cta-button { display: inline-block; background: #D4AF37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Your Inquiry!</h1>
          <p>Stone House - Nevada City, California</p>
        </div>
        
        <div class="content">
          <p>Dear ${name},</p>
          
          <p>Thank you for considering Stone House for your wedding! We're thrilled to help you plan your special day.</p>
          
          <div class="quote-number">
            Quote #${quoteNumber}
          </div>

          <h2>Your Wedding Package Estimate</h2>
          
          <div class="line-item">
            <span>Event Date:</span>
            <strong>${new Date(quote.venue.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
          
          <div class="line-item">
            <span>Guest Count:</span>
            <strong>${quote.catering.guestCount} guests</strong>
          </div>

          <div class="line-item">
            <span>Venue (${quote.venue.typeName}):</span>
            <strong>$${quote.venue.cost.toFixed(2)}</strong>
          </div>

          <div class="line-item">
            <span>Catering (${quote.catering.protein1Name} & ${quote.catering.protein2Name}):</span>
            <strong>$${quote.catering.total.toFixed(2)}</strong>
          </div>

          ${quote.beverages.total > 0 ? `
          <div class="line-item">
            <span>Beverages (${quote.beverages.packageName}):</span>
            <strong>$${quote.beverages.total.toFixed(2)}</strong>
          </div>
          ` : ''}

          ${quote.serviceFee.amount > 0 ? `
          <div class="line-item">
            <span>Service Fee (20%):</span>
            <strong>$${quote.serviceFee.amount.toFixed(2)}</strong>
          </div>
          ` : ''}

          ${quote.addOns.total > 0 ? `
          <div class="line-item">
            <span>Add-On Services:</span>
            <strong>$${quote.addOns.total.toFixed(2)}</strong>
          </div>
          ` : ''}

          <div class="line-item">
            <span>Sales Tax (${quote.tax.ratePercent}):</span>
            <strong>$${quote.totals.salesTax.toFixed(2)}</strong>
          </div>

          ${quote.fullPackage.eligible ? `
          <div class="line-item" style="color: #27AE60;">
            <span>★ Full Package Discount (10%):</span>
            <strong>-$${quote.totals.discount.toFixed(2)}</strong>
          </div>
          ` : ''}

          <div class="total-row">
            <span>ESTIMATED TOTAL:</span>
            <span>$${quote.totals.grandTotal.toFixed(2)}</span>
          </div>

          ${quote.fullPackage.eligible ? `
          <p style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #D4AF37;">
            <strong>🎉 Congratulations!</strong> Your package qualifies for our Full Package discount, saving you $${quote.fullPackage.totalSavings.toFixed(2)}!
          </p>
          ` : ''}

          <h3>What's Next?</h3>
          <ul>
            <li>Our wedding team will review your quote within 24 hours</li>
            <li>We'll reach out via ${contact.preferredContact} to discuss your vision</li>
            <li>Schedule a private tour to see the venue</li>
            <li>Finalize your package and secure your date</li>
          </ul>

          <div style="text-align: center;">
            <a href="tel:+15302655050" class="cta-button">Call Us: (530) 265-5050</a>
          </div>

          <p><em>This is an estimate based on your selections. Final pricing will be confirmed upon booking and may be subject to availability.</em></p>
        </div>

        <div class="footer">
          <p><strong>Stone House</strong><br>
          107 Sacramento Street, Nevada City, CA 95959<br>
          (530) 265-5050 | bookings@stonehouse.io</p>
          
          <p style="font-size: 0.8em; color: #999;">
            This quote is valid for 30 days. Pricing and availability subject to change.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
