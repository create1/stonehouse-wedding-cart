---
name: stripe-checkout-stonehouse
description: Implements Stripe embedded checkout with ACH and credit card for the Stone House Venue booking flow. Use when building or modifying checkout.html, create-checkout.js, webhook.js, or any Stripe-related payment code in this project. Covers session creation, embedded Payment Element, webhook handling, ESIGN-compliant click-to-agree contract, and deposit calculation.
---

# Stripe Checkout — Stone House Venue

## Quick Reference

- Stripe mode: **Embedded Checkout** (`ui_mode: 'embedded'`)
- Payment methods: `card` + `us_bank_account` (ACH)
- Deposit: 50% of grand total at booking
- Contract: click-to-agree (ESIGN compliant) before payment renders

## 1. Server — Create Checkout Session

File: `api/wedding/create-checkout.js`

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const { quoteData, signerName, signerTimestamp } = req.body;

  // Validate on server — never trust client totals
  const grandTotal = recalculateTotal(quoteData); // import from wedding-calculator-node.js
  const depositAmount = Math.round(grandTotal * 0.50 * 100); // cents

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'payment',
    currency: 'usd',
    payment_method_types: ['card', 'us_bank_account'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Stone House Venue — 50% Deposit', description: quoteData.eventDate },
        unit_amount: depositAmount,
      },
      quantity: 1,
    }],
    return_url: `${req.headers.origin}/checkout.html?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      signerName,
      signerTimestamp,
      eventDate: quoteData.eventDate,
      guestCount: quoteData.guestCount,
      grandTotal: grandTotal.toString(),
    },
  });

  res.json({ clientSecret: session.client_secret });
};
```

## 2. Client — Embed Checkout

In `src/js/checkout.js`:

```js
const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);

async function mountStripeCheckout(quoteData, signerName, signerTimestamp) {
  const res = await fetch('/api/wedding/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteData, signerName, signerTimestamp }),
  });
  const { clientSecret } = await res.json();

  const checkout = await stripe.initEmbeddedCheckout({ clientSecret });
  checkout.mount('#stripe-checkout');
}
```

In `checkout.html` — load Stripe JS before your script:
```html
<script src="https://js.stripe.com/v3/"></script>
<script>window.STRIPE_PUBLISHABLE_KEY = 'pk_test_...';</script>
```

## 3. Webhook Handler

File: `api/wedding/webhook.js`

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await sendBookingConfirmation(session); // call booking-confirmation.js
  }

  res.json({ received: true });
};
```

**CRITICAL**: Vercel must receive the raw body for webhook signature verification.
Add to `vercel.json`:
```json
{ "functions": { "api/wedding/webhook.js": { "bodyParser": false } } }
```

## 4. Contract Step (ESIGN Compliance)

Required elements in checkout.html before payment renders:
- Scrollable `<div class="contract-text">` containing full rental agreement
- `<input type="text" id="signer-name">` — legal name field
- `<input type="checkbox" id="agree-checkbox">` — "I have read and agree"
- Payment section starts hidden; revealed only when checkbox is checked
- On form submit: capture `signerName`, `new Date().toISOString()`, send to `create-checkout.js`

## 5. Availability Warning

Must appear in BOTH the contract step and the payment step:
```html
<div class="availability-warning">
  <strong>⚠️ IMPORTANT: Before submitting payment, you must confirm with Stone House
  venue management that your event date is available. Submitting payment does not
  guarantee your date.</strong>
</div>
```

## 6. Return URL Handling

On the `return_url` page (`checkout.html?session_id=...`):
```js
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');
if (sessionId) showConfirmation(sessionId);
```

## 7. Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:
- `STRIPE_SECRET_KEY` — secret key (never in client code)
- `STRIPE_PUBLISHABLE_KEY` — publishable key (safe for client)
- `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Webhooks

## 8. Testing

Use Stripe test keys first:
- Test card: `4242 4242 4242 4242` any future date, any CVC
- Test ACH: use Stripe's test routing/account numbers
- Test webhook: `stripe listen --forward-to localhost:3000/api/wedding/webhook`

## Additional Resources
- See [CHECKOUT_STRATEGY.md](../../CHECKOUT_STRATEGY.md) for full architecture and decision log
