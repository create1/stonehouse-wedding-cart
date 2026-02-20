/**
 * Wedding Quote Submission API
 * Sends email notifications via Resend — no database required for MVP
 */

const { Resend } = require('resend');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cart, quote, contact } = req.body;

    if (!cart || !contact?.name || !contact?.email || !contact?.phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const quoteNumber = `WQ-${Date.now().toString(36).toUpperCase()}`;
    const grandTotal = quote?.totals?.grandTotal || 0;
    const eventDate = cart?.venue?.date
      ? new Date(cart.venue.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Not selected';

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return res.status(500).json({ error: 'Email service not configured. Missing RESEND_API_KEY.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromAddress = process.env.FROM_EMAIL
      ? `Stone House Weddings <${process.env.FROM_EMAIL}>`
      : 'Stone House Weddings <onboarding@resend.dev>';

    // Admin emails — use env var or fallback to Resend account email for testing
    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
      : process.env.RESEND_TEST_EMAIL
        ? [process.env.RESEND_TEST_EMAIL]
        : ['bookings@stonehouse.io', 'jr@stonehouse.io'];

    // Build itemized summary for emails
    const itemLines = buildItemLines(cart, quote);
    const emailArgs = { contact, quoteNumber, eventDate, guestCount: cart.guestCount, grandTotal, itemLines };

    // Email to admins
    const adminResult = await resend.emails.send({
      from: fromAddress,
      to: adminEmails,
      reply_to: contact.email,
      subject: `New Wedding Quote: ${contact.name} — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(grandTotal)}`,
      html: adminEmailHTML(emailArgs)
    });

    if (adminResult.error) {
      console.error('Admin email error:', JSON.stringify(adminResult.error));
      return res.status(500).json({ error: `Email failed: ${adminResult.error.message || JSON.stringify(adminResult.error)}` });
    }

    // Confirmation to customer
    const customerResult = await resend.emails.send({
      from: fromAddress,
      to: contact.email,
      subject: `Your Wedding Quote #${quoteNumber} — Stone House`,
      html: customerEmailHTML(emailArgs)
    });

    if (customerResult.error) {
      console.error('Customer email error:', JSON.stringify(customerResult.error));
    }

    return res.status(200).json({
      success: true,
      quoteNumber,
      message: 'Quote submitted successfully'
    });

  } catch (error) {
    console.error('Quote submission error:', error.message, error);
    return res.status(500).json({
      error: error.message || 'Failed to process quote. Please contact us at bookings@stonehouse.io'
    });
  }
};

function buildItemLines(cart, quote) {
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  const lines = [];

  if (quote?.venue?.cost > 0) {
    lines.push({ label: 'Venue', value: fmt(quote.venue.cost) });
  }
  if (quote?.catering?.total > 0) {
    lines.push({ label: 'Catering', value: fmt(quote.catering.total) });
  }
  if (quote?.beverages?.total > 0) {
    lines.push({ label: 'Bar Service', value: fmt(quote.beverages.total) });
  }
  if (quote?.serviceFee?.amount > 0) {
    lines.push({ label: 'Service Fee (20%)', value: fmt(quote.serviceFee.amount) });
  }
  if (quote?.addOns?.total > 0) {
    lines.push({ label: 'Add-On Services', value: fmt(quote.addOns.total) });
  }
  if (quote?.totals?.salesTax > 0) {
    lines.push({ label: `Sales Tax (${quote.tax?.ratePercent || '7.75%'})`, value: fmt(quote.totals.salesTax) });
  }
  if (quote?.fullPackage?.eligible && quote?.totals?.discount > 0) {
    lines.push({ label: '★ Full Package Discount (10%)', value: `-${fmt(quote.totals.discount)}`, highlight: true });
  }
  return lines;
}

function adminEmailHTML({ contact, quoteNumber, eventDate, guestCount, grandTotal, itemLines }) {
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const rows = itemLines.map(l => `
    <tr>
      <td style="padding:8px 0;color:${l.highlight ? '#27AE60' : '#555'};border-bottom:1px solid #eee;">${l.label}</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;color:${l.highlight ? '#27AE60' : '#333'};border-bottom:1px solid #eee;">${l.value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
    <div style="background:linear-gradient(135deg,#D4AF37,#8B4053);padding:24px;border-radius:8px 8px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:1.4rem;">New Wedding Quote Submitted</h1>
    </div>
    <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#555;">Quote Number</td><td style="text-align:right;font-weight:700;color:#D4AF37;">${quoteNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Name</td><td style="text-align:right;font-weight:600;">${contact.name}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="text-align:right;"><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Phone</td><td style="text-align:right;"><a href="tel:${contact.phone}">${contact.phone}</a></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Event Date</td><td style="text-align:right;font-weight:600;">${eventDate}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Guests</td><td style="text-align:right;font-weight:600;">${guestCount}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Preferred Contact</td><td style="text-align:right;">${contact.preferredContact || 'Email'}</td></tr>
      </table>
      ${contact.message ? `<div style="background:#f9f9f9;padding:12px;border-radius:6px;margin-top:12px;"><strong>Message:</strong><p style="margin:6px 0 0;">${contact.message}</p></div>` : ''}
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
      <h3 style="margin:0 0 12px;color:#333;">Quote Breakdown</h3>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}
        <tr>
          <td style="padding:14px 0 0;font-size:1.2rem;font-weight:700;color:#D4AF37;">ESTIMATED TOTAL</td>
          <td style="padding:14px 0 0;text-align:right;font-size:1.2rem;font-weight:700;color:#D4AF37;">${fmt(grandTotal)}</td>
        </tr>
      </table>
    </div>
  </body></html>`;
}

function customerEmailHTML({ contact, quoteNumber, eventDate, guestCount, grandTotal, itemLines }) {
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const rows = itemLines.map(l => `
    <tr>
      <td style="padding:8px 0;color:${l.highlight ? '#27AE60' : '#555'};border-bottom:1px solid #eee;">${l.label}</td>
      <td style="padding:8px 0;text-align:right;font-weight:600;color:${l.highlight ? '#27AE60' : '#333'};border-bottom:1px solid #eee;">${l.value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
    <div style="background:linear-gradient(135deg,#D4AF37,#8B4053);padding:32px 24px;border-radius:8px 8px 0 0;text-align:center;">
      <h1 style="color:white;margin:0 0 8px;font-size:1.6rem;">Thank You, ${contact.name}!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:0;">We've received your wedding quote request</p>
    </div>
    <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
      <div style="background:#f9f9f9;padding:16px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;color:#555;font-size:0.9rem;">Your Quote Number</p>
        <p style="margin:6px 0 0;font-size:1.4rem;font-weight:700;color:#D4AF37;">${quoteNumber}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#555;">Event Date</td><td style="text-align:right;font-weight:600;">${eventDate}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Guest Count</td><td style="text-align:right;font-weight:600;">${guestCount} guests</td></tr>
      </table>
      <h3 style="margin:0 0 12px;color:#333;">Your Package Estimate</h3>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}
        <tr>
          <td style="padding:14px 0 0;font-size:1.2rem;font-weight:700;color:#D4AF37;">ESTIMATED TOTAL</td>
          <td style="padding:14px 0 0;text-align:right;font-size:1.2rem;font-weight:700;color:#D4AF37;">${fmt(grandTotal)}</td>
        </tr>
      </table>
      <div style="background:#FFF8DC;border-left:4px solid #D4AF37;padding:14px;border-radius:4px;margin-top:24px;">
        <strong>What happens next?</strong>
        <ul style="margin:8px 0 0;padding-left:20px;color:#555;">
          <li>Our team will review your quote within 24 hours</li>
          <li>We'll reach out via ${contact.preferredContact || 'email'} to discuss your vision</li>
          <li>We'll schedule a private tour of the venue</li>
        </ul>
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="tel:+15302655050" style="background:#D4AF37;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">(530) 265-5050</a>
      </div>
      <p style="text-align:center;color:#aaa;font-size:0.8rem;margin-top:24px;">
        Stone House · 107 Sacramento Street, Nevada City, CA 95959<br>
        bookings@stonehouse.io · This is an estimate subject to availability.
      </p>
    </div>
  </body></html>`;
}
