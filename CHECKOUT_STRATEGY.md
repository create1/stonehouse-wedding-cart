# Stone House Venue — Checkout & Payment Strategy
**Branch**: `feature/checkout-payment`  
**Last Updated**: February 2026  
**Status**: Framework established, implementation in progress

---

## 1. Executive Summary

We are adding a direct booking and payment layer to the existing quote/shopping-cart application. Couples who have configured their event quote can:

1. Review their full itemized quote
2. Confirm they've checked date availability (bold warning)
3. Sign a digital rental agreement (click-to-agree, ESIGN Act compliant)
4. Pay a 50% deposit via **credit card or ACH bank transfer** using Stripe Embedded Checkout
5. Receive an automated booking confirmation email

The remaining 50% balance is due 30 days before the event date and is collected separately.

---

## 2. Strategic Decisions & Rationale

### Decision 1: Stripe (not Square, not Braintree)
**Why Stripe:**
- Best-in-class ACH direct debit support (`us_bank_account` payment method)
- Embedded Checkout keeps users on our domain (better conversion, no redirect fear)
- Best developer experience; excellent Vercel/serverless support
- PCI-DSS compliant out of the box — we never touch raw card numbers
- Financial Connections for instant ACH bank verification (vs. micro-deposit waiting 1-2 days)

### Decision 2: Embedded Checkout (not Stripe-hosted redirect)
**Why Embedded:**
- User stays on `stonehousevenue.com` domain throughout — higher trust
- We control the page header/footer and can show availability warning and contract above payment
- `ui_mode: 'embedded'` with `return_url` is the modern Stripe recommendation
- Still fully PCI compliant — Stripe's iframe handles card data

### Decision 3: 50% Deposit (not full payment)
**Why 50% Deposit:**
- Industry standard for event venues
- Lower friction at booking — couples aren't committing full $15,000+ upfront
- Gives venue cash flow while protecting against last-minute cancellations
- Remaining 50% collected manually or via a second Stripe Payment Link 30 days pre-event
- TODO: automate the second payment collection in Phase 2

### Decision 4: Click-to-Agree Contract (not DocuSign)
**Why Click-to-Agree:**
- Legally binding under ESIGN Act (2000) and UETA — no third-party service required
- Zero additional cost (DocuSign/HelloSign = $25–$50/mo)
- Simpler UX — user doesn't need to leave the page or check email to sign
- We store: typed legal name + ISO timestamp + IP address + user-agent as Stripe session metadata
- Upgrade path: if venue wants wet-signature-style PDF, add DocuSeal (open source) in Phase 2

### Decision 5: Server-side Amount Validation
**Why Server-side:**
- Never trust client-submitted totals — a user could manipulate the quote total in DevTools
- `create-checkout.js` imports `wedding-calculator-node.js` and recalculates from the submitted quote parameters
- This means the Stripe session amount always reflects the authoritative server-side calculation
- Client sends quote *parameters* (venue choice, guest count, options) — server calculates the dollar amount

---

## 3. Architecture Overview

```
[index.html — Quote Builder]
         |
         | User clicks "Proceed to Book"
         | Quote parameters passed via URL params or sessionStorage
         v
[checkout.html — 4-step booking flow]
  Step 1: Quote Review
    - Full itemized breakdown
    - Deposit amount (50%) shown prominently
    - Remaining balance shown
  Step 2: Availability Warning + Contract
    - BOLD red warning: confirm date with venue
    - Scrollable rental agreement text
    - Typed name field + checkbox
    - "Continue to Payment" button (disabled until signed)
  Step 3: Payment (Stripe Embedded)
    - Availability warning shown again (above payment element)
    - card + us_bank_account options
    - Stripe handles all PCI-sensitive data
  Step 4: Confirmation
    - Session ID returned via return_url
    - Booking summary shown
    - Confirmation email sent (webhook triggers this)
         |
         | checkout.js → POST /api/wedding/create-checkout
         v
[api/wedding/create-checkout.js — Vercel Serverless]
  - Validates request (has required fields)
  - Recalculates grand total server-side
  - Creates Stripe Checkout Session
  - Returns { clientSecret }
         |
         | Stripe processes payment
         v
[Stripe Webhook → /api/wedding/webhook.js]
  - Verifies webhook signature
  - On checkout.session.completed:
    → Sends booking confirmation email (Resend)
    → Logs booking (console for now; DB in Phase 2)
         |
         v
[api/wedding/booking-confirmation.js]
  - Sends email to couple (all event details + deposit receipt)
  - Sends email to venue management (new booking alert)
```

---

## 4. Data Flow

### What the client sends to `create-checkout.js`:
```json
{
  "quoteData": {
    "venueRooms": ["full-building"],
    "venueOption": "full-building-12hr-peak",
    "eventDate": "2026-09-12",
    "guestCount": 120,
    "catering": {
      "protein1": "chicken",
      "protein2": "fish",
      "serviceStyle": "plated"
    },
    "addOns": ["photography", "florals"],
    "dessert": true
  },
  "signerName": "Jane Smith",
  "signerTimestamp": "2026-02-19T18:00:00.000Z",
  "signerUserAgent": "Mozilla/5.0..."
}
```

### What `create-checkout.js` stores in Stripe metadata:
```json
{
  "signerName": "Jane Smith",
  "signerTimestamp": "2026-02-19T18:00:00.000Z",
  "signerIp": "192.168.1.1",
  "eventDate": "2026-09-12",
  "guestCount": "120",
  "grandTotal": "18500.00",
  "depositAmount": "9250.00",
  "venueOption": "full-building-12hr-peak"
}
```

---

## 5. File Structure

```
/
├── checkout.html                        ← NEW: 4-step booking flow
├── index.html                           ← MODIFIED: add "Book Now" CTA button
├── pricing.html                         ← unchanged
│
├── src/
│   ├── js/
│   │   ├── checkout.js                  ← NEW: client-side checkout logic
│   │   ├── wedding-cart.js              ← MODIFIED: add "Book Now" button + pass quote to checkout
│   │   ├── wedding-calculator.js        ← unchanged
│   │   ├── wedding-calculator-node.js   ← unchanged (used server-side too)
│   │   └── wedding-pricing-config.js    ← unchanged
│   └── css/
│       ├── checkout.css                 ← NEW: checkout page styles
│       └── wedding-cart.css             ← unchanged
│
├── api/
│   └── wedding/
│       ├── create-checkout.js           ← NEW: Stripe session creator
│       ├── webhook.js                   ← NEW: Stripe webhook handler
│       ├── booking-confirmation.js      ← NEW: sends confirmation emails
│       └── quote.js                     ← unchanged
│
├── vercel.json                          ← MODIFIED: add webhook route (raw body)
├── package.json                         ← MODIFIED: add stripe dependency
│
└── .cursor/
    ├── rules/
    │   └── checkout-payment.mdc         ← Persistent AI guidance for this feature
    └── skills/
        └── stripe-checkout-stonehouse/
            └── SKILL.md                 ← AI skill for Stripe implementation
```

---

## 6. Rental Agreement Contract Text

The following text must appear in the checkout contract step. This is the agreement the customer signs:

```
STONE HOUSE VENUE — RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into between Stone House Venue ("Venue") 
and the undersigned renter ("Client") upon payment of the deposit described herein.

1. EVENT DATE & SPACE
   Client reserves the venue for the date and spaces selected in their quote. 
   This reservation is NOT confirmed until (a) this Agreement is signed, AND 
   (b) the 50% deposit payment is successfully processed.

   IMPORTANT: Client is responsible for confirming date availability with Venue 
   management BEFORE submitting payment. Venue management can be reached at 
   [CONTACT INFO]. Submitting payment without confirming availability does not 
   create a binding reservation on a date that is already booked.

2. PAYMENT TERMS
   A 50% non-refundable deposit is due at signing. The remaining 50% balance 
   is due 30 days prior to the event date. Failure to pay the remaining balance 
   by the due date may result in cancellation of the reservation.

3. CANCELLATION POLICY
   - Cancellations more than 180 days before event: deposit refunded minus a 
     $500 administrative fee.
   - Cancellations 90–180 days before event: 50% of deposit refunded.
   - Cancellations less than 90 days before event: deposit is non-refundable.
   - In the event of a date change (if an alternative date is available), a 
     $250 rescheduling fee applies.

4. CAPACITY & USE
   Client agrees to comply with the Venue's stated capacity limits and all 
   applicable local ordinances regarding noise, fire codes, and occupancy.

5. CATERING & VENDORS
   All catering services provided through Stone House Venue include necessary 
   rentals, plates, and flatware as described in the quote. Outside catering 
   requires prior written approval.

6. DAMAGE & LIABILITY
   Client is responsible for any damage to the Venue, its furnishings, or 
   property caused by Client, guests, or vendors. A security deposit of $500 
   is collected separately and refunded within 14 days post-event if no damage 
   is found.

7. FORCE MAJEURE
   Neither party shall be liable for failure to perform due to circumstances 
   beyond their reasonable control (natural disaster, government order, etc.). 
   In such cases, a full refund will be issued.

8. ELECTRONIC SIGNATURE
   By typing your legal name and checking the agreement box below, you 
   acknowledge that you have read, understand, and agree to all terms of this 
   Rental Agreement. This constitutes a legally binding electronic signature 
   under the ESIGN Act and UETA.

9. GOVERNING LAW
   This Agreement is governed by the laws of the State of California, 
   County of Nevada.
```

**TODO**: Have this contract reviewed by a licensed attorney before going live.

---

## 7. Implementation Phases

### Phase 1 — MVP (current branch)
- [ ] Scaffold `checkout.html` with 4-step UI
- [ ] Implement `src/js/checkout.js` (step navigation, contract gate, Stripe mount)
- [ ] Implement `api/wedding/create-checkout.js` (Stripe session, server-side validation)
- [ ] Implement `api/wedding/webhook.js` (payment confirmation, email trigger)
- [ ] Implement `api/wedding/booking-confirmation.js` (email to couple + venue)
- [ ] Add "Book Now" button to `index.html` quote summary
- [ ] Add `stripe` npm package
- [ ] Update `vercel.json` for raw body webhook route
- [ ] Add Stripe test keys to `.env` and Vercel env vars
- [ ] End-to-end test with Stripe test card `4242 4242 4242 4242`
- [ ] End-to-end test with Stripe test ACH bank account

### Phase 2 — After Launch
- [ ] Automated second-payment reminder (30 days pre-event) via Stripe Payment Links
- [ ] Booking database (Supabase or Vercel KV) to store all booking records
- [ ] Admin dashboard to view bookings, download contracts, see payment status
- [ ] PDF contract generation with booking details + signed agreement
- [ ] Date availability calendar integration (block dates after booking)

---

## 8. Testing Checklist (before merging to main)

### Stripe Test Scenarios
- [ ] Credit card payment completes: `4242 4242 4242 4242`
- [ ] Card decline handled gracefully: `4000 0000 0000 0002`
- [ ] ACH payment initiated and pending state shown correctly
- [ ] Webhook fires `checkout.session.completed` → confirmation email sent
- [ ] Webhook signature verification rejects tampered requests

### UX Scenarios
- [ ] Availability warning visible in both contract step and payment step
- [ ] Payment button disabled until contract checkbox is checked
- [ ] Signer name field required (cannot submit blank)
- [ ] Quote data correctly passed from index.html to checkout.html
- [ ] Deposit amount = exactly 50% of grand total
- [ ] Mobile layout renders correctly on iPhone/Android

### Security
- [ ] Stripe secret key NOT present in any client-side file
- [ ] Server recalculates total (cannot be manipulated by client)
- [ ] Webhook rejects requests without valid signature

---

## 9. Environment Setup

### Development
```bash
# Install dependencies
npm install stripe

# Set env vars in .env (local only — gitignored)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...

# Run local server
python3 -m http.server 3000

# In second terminal: forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/wedding/webhook
```

### Production (Vercel)
Set all env vars in Vercel Dashboard → Project → Settings → Environment Variables.
Use live Stripe keys for production, test keys for Preview deployments.

---

## 10. Open Questions (to resolve before launch)

1. **Security deposit**: Collect the $500 security deposit via Stripe at booking, or handle manually?
2. **Contract review**: Has a California attorney reviewed the rental agreement text?
3. **Stripe account**: Does the venue already have a Stripe account, or does one need to be created?
4. **ACH wait time**: Do we clearly communicate to customers that ACH takes 4 business days to settle (vs. instant for cards)?
5. **Second payment collection**: Manual invoice at 30 days, or automated Stripe subscription/PaymentLink?
6. **Date blocking**: After a booking is confirmed, how do we prevent double-bookings? (Phase 2: integrate with a calendar/availability system)
7. **Refund policy enforcement**: Is the cancellation policy above acceptable to the venue owner?
