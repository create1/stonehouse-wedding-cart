/**
 * Wedding Quote Submission API
 * Sends email notifications via Resend — no database required for MVP
 */

const { Resend } = require('resend');

const PROTEIN_NAMES = {
  vegetarian: 'Vegetarian (Seasonal Vegetable Entrée)',
  chicken:    'Chicken',
  fish:       'Fish',
  steak:      'Steak',
  outside:    'Outside Catering (Approved Vendor)',
};

const BEVERAGE_NAMES = {
  'beer-wine':      'Beer & Wine Package',
  'premium':        'Premium Package',
  'premium-liquor': 'Top Shelf Package',
};

const BEVERAGE_INCLUDES = {
  'beer-wine':      ['Domestic & craft beer selection', 'Curated wine selection (red & white)', 'Non-alcoholic beverages', '4-hour bar service'],
  'premium':        ['Everything in Beer & Wine', 'Premium spirits & mixers', 'Cocktail menu', 'Signature cocktail option', '4-hour bar service'],
  'premium-liquor': ['Everything in Premium', 'Top-shelf liquors', 'Specialty cocktails', 'Champagne toast', '5-hour bar service'],
};

const FLORAL_NAMES = {
  intimate: 'Intimate Package',
  classic:  'Classic Package',
  elegant:  'Elegant Package',
  luxury:   'Luxury Package',
};

const FLORAL_PRICES = {
  intimate: '$1,500', classic: '$2,500', elegant: '$5,000', luxury: '$10,000',
};

const FLORAL_INCLUDES = {
  intimate: ['Bridal bouquet', 'Boutonniere', 'Ceremony arch arrangement', 'Centerpieces for up to 8 tables'],
  classic:  ['Bridal bouquet + 2 bridesmaid bouquets', 'Boutonnieres (up to 4)', 'Ceremony arch arrangement', 'Centerpieces for up to 15 tables', 'Cocktail hour arrangements'],
  elegant:  ['Full bridal party bouquets & boutonnieres', 'Ceremony arch + aisle décor', 'Centerpieces for up to 20 tables', 'Cocktail hour arrangements', 'Sweetheart table arrangement'],
  luxury:   ['Complete floral design for entire event', 'Unlimited bridal party florals', 'Grand ceremony installation', 'Premium centerpieces (all tables)', 'Cocktail hour & lounge arrangements', 'Floral designer on-site throughout event'],
};

const VENUE_NAMES = {
  partialBuilding:     'Single Floor Rental (Lounge, Dining Room, Patio & Cavern)',
  partialBuildingFlat: 'Single Floor — 12 Hour Block (Lounge, Dining Room, Patio & Cavern)',
  fullBuilding:    'Full Building (Hourly)',
  premiumEventCap: 'Full Building — 12-Hour Block',
};

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
}

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
    const grandTotal  = quote?.totals?.grandTotal || 0;
    const eventDate   = cart?.venue?.date
      ? new Date(cart.venue.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Not selected';

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return res.status(500).json({ error: 'Email service not configured.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromAddress = process.env.FROM_EMAIL
      ? `Stone House Weddings <${process.env.FROM_EMAIL}>`
      : 'Stone House Weddings <onboarding@resend.dev>';

    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
      : ['bookings@stonehouse.io'];

    const emailArgs = { cart, quote, contact, quoteNumber, eventDate, grandTotal };

    const adminResult = await resend.emails.send({
      from:     fromAddress,
      to:       adminEmails,
      reply_to: contact.email,
      subject:  `New Wedding Quote: ${contact.name} — ${fmt(grandTotal)} — ${eventDate}`,
      html:     buildEmailHTML(emailArgs, true),
    });

    if (adminResult.error) {
      console.error('Admin email error:', JSON.stringify(adminResult.error));
      return res.status(500).json({ error: `Email failed: ${adminResult.error.message || JSON.stringify(adminResult.error)}` });
    }

    await resend.emails.send({
      from:    fromAddress,
      to:      contact.email,
      subject: `Your Wedding Quote #${quoteNumber} — Stone House`,
      html:    buildEmailHTML(emailArgs, false),
    }).catch(err => console.error('Customer email error:', err));

    return res.status(200).json({ success: true, quoteNumber, message: 'Quote submitted successfully' });

  } catch (error) {
    console.error('Quote submission error:', error.message, error);
    return res.status(500).json({ error: error.message || 'Failed to process quote. Please contact us at bookings@stonehouse.io' });
  }
};

function buildEmailHTML({ cart, quote, contact, quoteNumber, eventDate, grandTotal }, isAdmin) {
  const guestCount  = cart?.guestCount || 0;
  const venueType   = cart?.venue?.type;
  const venueHours  = cart?.venue?.hours;
  const protein1    = cart?.catering?.protein1;
  const protein2    = cart?.catering?.protein2;
  const sidesQty    = cart?.catering?.sidesQty || 0;
  const appsQty     = cart?.catering?.appetizersQty || 0;
  const bevPackage  = cart?.beverages?.package;
  const floralPkg   = cart?.addOns?.floral;
  const hasPhoto    = cart?.addOns?.photography;
  const hasPlanner  = cart?.addOns?.weddingPlanner;
  const hasDJ       = cart?.addOns?.dj;

  const venueCost     = quote?.venue?.cost               || 0;
  const cateringTotal = quote?.catering?.total            || 0;
  const sidesTotal    = quote?.catering?.sides?.cost      || 0;
  const appsTotal     = quote?.catering?.appetizers?.cost || 0;
  const bevTotal      = quote?.beverages?.total           || 0;
  const serviceFee    = quote?.serviceFee?.amount         || 0;
  const floralCost    = quote?.addOns?.floral?.cost       || 0;
  const photoCost     = quote?.addOns?.photography?.cost  || 0;
  const plannerCost   = quote?.addOns?.weddingPlanner?.cost || 0;
  const djCost        = quote?.addOns?.dj?.cost           || 0;
  const salesTax      = quote?.totals?.salesTax           || 0;
  const season        = quote?.season                     || '';

  const sh = (title) =>
    `<tr><td colspan="2" style="padding:22px 0 6px;">
      <strong style="font-size:0.95rem;color:#8B4053;display:block;border-bottom:2px solid #D4AF37;padding-bottom:4px;">${title}</strong>
    </td></tr>`;

  const r = (label, value, sub) =>
    `<tr>
      <td style="padding:7px 12px 7px 0;color:#444;vertical-align:top;line-height:1.5;">
        ${label}${sub ? `<br><span style="font-size:0.78rem;color:#999;">${sub}</span>` : ''}
      </td>
      <td style="padding:7px 0;text-align:right;font-weight:600;color:#222;vertical-align:top;white-space:nowrap;min-width:80px;">${value || ''}</td>
    </tr>`;

  const note = (text) =>
    `<tr><td colspan="2" style="padding:2px 0 8px;font-size:0.78rem;color:#bbb;font-style:italic;">${text}</td></tr>`;

  const divRow = () =>
    `<tr><td colspan="2"><hr style="border:none;border-top:1px solid #eee;margin:6px 0;"></td></tr>`;

  let rows = '';

  // Contact
  rows += sh('📋 Contact Information');
  rows += r('Name', contact.name);
  rows += r('Email', `<a href="mailto:${contact.email}" style="color:#D4AF37;">${contact.email}</a>`);
  rows += r('Phone', `<a href="tel:${contact.phone}" style="color:#D4AF37;">${contact.phone}</a>`);
  if (contact.preferredContact) rows += r('Preferred Contact', contact.preferredContact);
  if (contact.message) rows += r('Message', `<em style="color:#666;">${contact.message}</em>`);

  // Event
  rows += sh('📅 Event Details');
  rows += r('Wedding Date', eventDate);
  rows += r('Guest Count', `${guestCount} guests`);
  if (season) rows += r('Season', season);

  // Venue
  rows += sh('🏛️ Venue');
  if (venueType) {
    const vName = VENUE_NAMES[venueType] || venueType;
    const vSub  = venueType === 'partialBuildingFlat'      ? 'Full-day access (12 hours) · 40% off hourly rate · Lounge (upstairs bar), Dining Room, Patio & Cavern'      : venueType === 'partialBuilding'      ? `${venueHours || 5} hours · 3-hour minimum · Lounge (upstairs bar), Dining Room, Patio & Cavern`      : venueType === 'fullBuilding'
      ? `${venueHours || 5} hours · 3-hour minimum · Lounge, Great Hall, Show Room, Patio, Cavern & Parlour`
      : 'Full-day access · Lounge, Great Hall, Show Room, Patio, Cavern & Parlour';
    rows += r(vName, fmt(venueCost), vSub);
  } else {
    rows += r('Venue', fmt(venueCost));
  }

  // Catering
  rows += sh('🍽️ Catering');
  if (protein1 === 'outside') {
    rows += r('Outside Catering', fmt(1000), 'Approved vendor · Kitchen access & coordination included');
  } else {
    rows += note('All catering includes salad course & dessert');
    if (protein1) rows += r(`Entrée 1: ${PROTEIN_NAMES[protein1] || protein1}`, '');
    if (protein2) rows += r(`Entrée 2: ${PROTEIN_NAMES[protein2] || protein2}`, '');
    if (cateringTotal > 0) {
      const ppp = guestCount > 0 ? fmt(cateringTotal / guestCount) : '';
      rows += r(`${guestCount} guests × ${ppp}/person`, fmt(cateringTotal));
    }
    if (sidesQty > 0) {
      rows += r(
        `Additional Sides — ${sidesQty} side dish${sidesQty > 1 ? 'es' : ''}`,
        fmt(sidesTotal),
        `${guestCount} guests × $8/person × ${sidesQty} side${sidesQty > 1 ? 's' : ''} · Final selections confirmed during planning`
      );
    }
    if (appsQty > 0) {
      rows += r(
        `Passed Appetizers — ${appsQty} appetizer${appsQty > 1 ? 's' : ''}`,
        fmt(appsTotal),
        `${guestCount} guests × $6/person × ${appsQty} appetizer${appsQty > 1 ? 's' : ''} · Final selections confirmed during planning`
      );
    }
  }

  // Bar
  if (bevPackage) {
    rows += sh('🍷 Bar Service');
    const bName = BEVERAGE_NAMES[bevPackage] || bevPackage;
    const bInc  = (BEVERAGE_INCLUDES[bevPackage] || []).join(' · ');
    rows += r(bName, fmt(bevTotal), bInc);
  }

  // Service Fee
  if (serviceFee > 0) {
    rows += sh('📋 Service Fee');
    rows += r('20% Service Fee (food & beverage)', fmt(serviceFee),
      `Taxable · Applied to ${fmt(cateringTotal + bevTotal)} food & beverage total`);
  }

  // Add-ons
  const hasAddOns = floralPkg || hasPhoto || hasPlanner || hasDJ;
  if (hasAddOns) {
    rows += sh('✨ Add-On Services');
    rows += note('All add-on services are tax-exempt');
    if (floralPkg) {
      const fName = `${FLORAL_NAMES[floralPkg] || floralPkg} — ${FLORAL_PRICES[floralPkg] || ''}`;
      const fInc  = (FLORAL_INCLUDES[floralPkg] || []).join(' · ');
      rows += r(`Floral: ${fName}`, fmt(floralCost), fInc);
    }
    if (hasPhoto) {
      rows += r('Professional Photography', fmt(photoCost),
        '8 hours of coverage · 2 photographers · 500+ edited images delivered digitally');
    }
    if (hasPlanner) {
      rows += r('Wedding Planning & Coordination', fmt(plannerCost),
        'Day-of coordination · Timeline management · Vendor communication · Rehearsal direction');
    }
    if (hasDJ) {
      rows += r('DJ Entertainment', fmt(djCost),
        '5 hours · Professional sound system · Dance floor lighting · MC services');
    }
  }

  // Financial summary
  rows += sh('💰 Financial Summary');
  const taxableBase = cateringTotal + sidesTotal + appsTotal + bevTotal + serviceFee;
  const nonTaxable  = venueCost + floralCost + photoCost + plannerCost + djCost;
  rows += r('Taxable Subtotal (catering, bar & service fee)', fmt(taxableBase));
  rows += r('Non-Taxable Subtotal (venue & add-ons)', fmt(nonTaxable));
  rows += r('Sales Tax (7.75% on taxable items)', fmt(salesTax));
  rows += divRow();
  rows += `<tr>
    <td style="padding:14px 0 0;font-size:1.2rem;font-weight:700;color:#D4AF37;">ESTIMATED TOTAL</td>
    <td style="padding:14px 0 0;text-align:right;font-size:1.2rem;font-weight:700;color:#D4AF37;">${fmt(grandTotal)}</td>
  </tr>`;

  const headerTitle = isAdmin
    ? `New Wedding Quote — ${contact.name}`
    : `Thank You, ${contact.name}!`;
  const headerSub = isAdmin
    ? `Quote #${quoteNumber} · ${eventDate} · ${guestCount} guests`
    : `We've received your wedding quote request — #${quoteNumber}`;

  const nextSteps = !isAdmin ? `
    <div style="background:#FFF8DC;border-left:4px solid #D4AF37;padding:14px 18px;border-radius:4px;margin:28px 0 0;">
      <strong>What Happens Next?</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#555;line-height:1.9;">
        <li>Our team will review your quote within 24 hours</li>
        <li>We'll reach out via ${contact.preferredContact || 'email'} to discuss your vision</li>
        <li>We'll schedule a private tour of the venue</li>
      </ul>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="tel:+15302655050" style="background:#D4AF37;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">(530) 265-5050</a>
    </div>` : '';

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333;background:#f5f5f5;">
  <div style="background:linear-gradient(135deg,#D4AF37,#8B4053);padding:32px 28px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:white;margin:0 0 8px;font-size:1.5rem;">${headerTitle}</h1>
    <p style="color:rgba(255,255,255,0.88);margin:0;font-size:0.95rem;">${headerSub}</p>
  </div>
  <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${nextSteps}
    <p style="color:#bbb;font-size:0.78rem;text-align:center;margin-top:28px;line-height:1.7;">
      Stone House · 107 Sacramento Street, Nevada City, CA 95959<br>
      bookings@stonehouse.io<br>
      This is an estimate. All pricing is subject to availability and final contract terms.
    </p>
  </div>
</body></html>`;
}
