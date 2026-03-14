// api/wedding/webhook.js
// Stripe webhook handler — MUST receive raw body (not parsed JSON)
// Vercel config in vercel.json sets bodyParser: false for this route

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Venue management contact info (update as needed)
const VENUE_EMAIL = 'info@stonehousevenue.com';
const VENUE_NAME = 'Stone House Venue';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // req.body must be the raw buffer/string — NOT parsed JSON
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Booking confirmed:', session.id, session.metadata);

    try {
      await sendBookingConfirmationEmails(session);
    } catch (emailErr) {
      // Log but don't fail the webhook — Stripe will retry on 5xx
      console.error('Failed to send confirmation emails:', emailErr);
    }
  }

  // Return 200 quickly so Stripe doesn't retry
  res.json({ received: true });
};

// ── Email Senders ──────────────────────────────────────────────────────────────

async function sendBookingConfirmationEmails(session) {
  const m = session.metadata || {};
  const depositAmount = parseFloat(m.depositAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const balanceDue = parseFloat(m.balanceDue || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const grandTotal = parseFloat(m.grandTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const coupleEmail = session.customer_details?.email;
  const coupleName = m.signerName || session.customer_details?.name || 'Guest';

  // Email to the couple
  if (coupleEmail) {
    await resend.emails.send({
      from: `${VENUE_NAME} <bookings@stonehousevenue.com>`,
      to: coupleEmail,
      subject: `Booking Confirmed — Stone House Venue | ${m.eventDate}`,
      html: buildCoupleEmail({ coupleName, depositAmount, balanceDue, grandTotal, eventDate: m.eventDate, guestCount: m.guestCount, sessionId: session.id }),
    });
  }

  // Email to venue management
  await resend.emails.send({
    from: `Booking System <bookings@stonehousevenue.com>`,
    to: VENUE_EMAIL,
    subject: `NEW BOOKING — ${m.eventDate} | ${coupleName}`,
    html: buildVenueEmail({ coupleName, coupleEmail, depositAmount, balanceDue, grandTotal, metadata: m, sessionId: session.id }),
  });
}

function buildCoupleEmail({ coupleName, depositAmount, balanceDue, grandTotal, eventDate, guestCount, sessionId }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  h1 { color: #5c4a3a; }
  .highlight { background: #f9f5f0; border-left: 4px solid #8b6f5a; padding: 16px; margin: 20px 0; }
  .amount { font-size: 1.4em; font-weight: bold; color: #5c4a3a; }
  .warning { background: #fff3cd; border: 2px solid #856404; padding: 16px; margin: 20px 0; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; }
  .footer { font-size: 0.85em; color: #888; margin-top: 40px; }
</style></head>
<body>
  <h1>Your Booking is Confirmed!</h1>
  <p>Dear ${coupleName},</p>
  <p>Thank you for booking Stone House Venue! We're so excited to celebrate with you.</p>

  <div class="highlight">
    <table>
      <tr><td><strong>Event Date</strong></td><td>${eventDate}</td></tr>
      <tr><td><strong>Guest Count</strong></td><td>${guestCount}</td></tr>
      <tr><td><strong>Total Quote</strong></td><td>${grandTotal}</td></tr>
      <tr><td><strong>Deposit Paid</strong></td><td class="amount">${depositAmount} ✓</td></tr>
      <tr><td><strong>Balance Due</strong></td><td>${balanceDue} <em>(due 30 days before event)</em></td></tr>
    </table>
  </div>

  <div class="warning">
    <strong>⚠️ Important Next Step:</strong> Please contact our venue management team to confirm your date is officially reserved on our calendar. Your payment holds your intent to book, but final calendar confirmation is completed by our team.
    <br><br>Contact us at: <a href="mailto:${VENUE_EMAIL}">${VENUE_EMAIL}</a>
  </div>

  <p>Your booking reference: <code>${sessionId}</code></p>

  <p>We'll be in touch soon with more details about your event planning process.</p>
  <p>With excitement,<br><strong>Stone House Venue Team</strong></p>

  <div class="footer">
    This email confirms receipt of your deposit payment. Your rental agreement was signed electronically on ${new Date().toLocaleDateString()}.
  </div>
</body>
</html>`;
}

function buildVenueEmail({ coupleName, coupleEmail, depositAmount, balanceDue, grandTotal, metadata: m, sessionId }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  h1 { color: #c0392b; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px; border: 1px solid #ddd; }
  th { background: #f5f5f5; padding: 8px; text-align: left; }
  .meta { font-size: 0.85em; color: #666; }
</style></head>
<body>
  <h1>🎉 New Booking Received</h1>

  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Client Name</td><td><strong>${coupleName}</strong></td></tr>
    <tr><td>Client Email</td><td>${coupleEmail || 'not provided'}</td></tr>
    <tr><td>Event Date</td><td><strong>${m.eventDate}</strong></td></tr>
    <tr><td>Guest Count</td><td>${m.guestCount}</td></tr>
    <tr><td>Venue Option</td><td>${m.venueOption || 'see quote'}</td></tr>
    <tr><td>Grand Total</td><td>${grandTotal}</td></tr>
    <tr><td>Deposit Paid</td><td><strong>${depositAmount}</strong></td></tr>
    <tr><td>Balance Due</td><td>${balanceDue}</td></tr>
    <tr><td>Stripe Session</td><td><code>${sessionId}</code></td></tr>
  </table>

  <h3>Contract Signing Record</h3>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Signed Name</td><td>${m.signerName}</td></tr>
    <tr><td>Timestamp</td><td>${m.signerTimestamp}</td></tr>
    <tr><td>IP Address</td><td>${m.signerIp}</td></tr>
  </table>

  <p class="meta">View full payment details in your <a href="https://dashboard.stripe.com">Stripe Dashboard</a>.</p>
  <p><strong>Action Required:</strong> Contact the client to confirm their date is officially on your calendar.</p>
</body>
</html>`;
}
