// api/wedding/create-checkout.js
// Vercel serverless function — Stripe Checkout Session creator
// SECURITY: This file runs server-side only. STRIPE_SECRET_KEY never reaches the client.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Import server-side calculator to validate amounts independently of client
let WeddingCalculator;
try {
  WeddingCalculator = require('../../src/js/wedding-calculator-node.js');
} catch (e) {
  // Fallback if path differs in Vercel environment
  WeddingCalculator = require('../wedding-calculator-node.js');
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { quoteData, signerName, signerTimestamp, signerUserAgent } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!quoteData || !signerName || !signerTimestamp) {
      return res.status(400).json({ error: 'Missing required fields: quoteData, signerName, signerTimestamp' });
    }
    if (!quoteData.eventDate || !quoteData.guestCount) {
      return res.status(400).json({ error: 'quoteData must include eventDate and guestCount' });
    }

    // ── Recalculate server-side (never trust client totals) ───────────────────
    const calculator = new WeddingCalculator('nevada-city');
    const serverTotal = calculator.calculateTotal(quoteData);
    const grandTotal = serverTotal.grandTotal;

    if (!grandTotal || grandTotal <= 0) {
      return res.status(400).json({ error: 'Invalid quote total' });
    }

    // ── Calculate 50% deposit ─────────────────────────────────────────────────
    const depositAmount = Math.round(grandTotal * 0.50 * 100); // Stripe uses cents

    // ── Get client IP for contract record ────────────────────────────────────
    const signerIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown';

    // ── Create Stripe Checkout Session ────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      currency: 'usd',
      payment_method_types: ['card', 'us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Stone House Venue — 50% Deposit',
              description: `Event: ${quoteData.eventDate} | Guests: ${quoteData.guestCount} | Balance due 30 days before event`,
            },
            unit_amount: depositAmount,
          },
          quantity: 1,
        },
      ],
      return_url: `${req.headers.origin}/checkout.html?session_id={CHECKOUT_SESSION_ID}`,
      // Store contract signing record and booking details as metadata
      metadata: {
        signerName: signerName.substring(0, 500),
        signerTimestamp,
        signerIp,
        signerUserAgent: (signerUserAgent || '').substring(0, 500),
        eventDate: quoteData.eventDate,
        guestCount: String(quoteData.guestCount),
        grandTotal: grandTotal.toFixed(2),
        depositAmount: (depositAmount / 100).toFixed(2),
        balanceDue: (grandTotal * 0.50).toFixed(2),
        venueOption: quoteData.venueOption || '',
      },
    });

    res.json({ clientSecret: session.client_secret });

  } catch (err) {
    console.error('create-checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
};
