// src/js/checkout.js
// Client-side checkout flow for Stone House Venue
// Handles: step navigation, contract gate, Stripe Embedded Checkout mount, confirmation display

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = ['review', 'contract', 'payment', 'confirmation'];

// ── State ─────────────────────────────────────────────────────────────────────
let currentStep = 0;
let quoteData = null;
let stripeCheckout = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Check for Stripe confirmation return (session_id in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    showConfirmationStep(sessionId);
    return;
  }

  // Load quote data from sessionStorage (set by index.html when user clicks "Book Now")
  const stored = sessionStorage.getItem('stoneHouseQuote');
  if (!stored) {
    showError('No quote data found. Please return to the quote builder and try again.');
    return;
  }

  try {
    quoteData = JSON.parse(stored);
  } catch (e) {
    showError('Invalid quote data. Please return to the quote builder and try again.');
    return;
  }

  renderReviewStep();
  showStep(0);
  wireContractGate();
});

// ── Step Navigation ───────────────────────────────────────────────────────────
function showStep(index) {
  currentStep = index;
  STEPS.forEach((step, i) => {
    const el = document.getElementById(`step-${step}`);
    if (el) el.style.display = i === index ? 'block' : 'none';
  });

  // Update progress indicators
  document.querySelectorAll('.checkout-step-indicator').forEach((el, i) => {
    el.classList.toggle('active', i === index);
    el.classList.toggle('completed', i < index);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step 1: Review ────────────────────────────────────────────────────────────
function renderReviewStep() {
  if (!quoteData) return;

  const grandTotal = quoteData.grandTotal || 0;
  const deposit = grandTotal * 0.50;
  const balance = grandTotal * 0.50;

  const reviewEl = document.getElementById('review-summary');
  if (!reviewEl) return;

  reviewEl.innerHTML = `
    <div class="review-row">
      <span>Event Date</span><span>${quoteData.eventDate || 'Not selected'}</span>
    </div>
    <div class="review-row">
      <span>Guest Count</span><span>${quoteData.guestCount || 0} guests</span>
    </div>
    <div class="review-row">
      <span>Venue</span><span>${formatVenueLabel(quoteData.venueOption)}</span>
    </div>
    ${quoteData.catering ? `<div class="review-row"><span>Catering</span><span>${formatCateringLabel(quoteData.catering)}</span></div>` : ''}
    <div class="review-divider"></div>
    <div class="review-row subtotal">
      <span>Subtotal</span><span>${fmt(quoteData.subtotal || grandTotal / 1.08875)}</span>
    </div>
    <div class="review-row">
      <span>Sales Tax (8.875%)</span><span>${fmt(quoteData.tax || 0)}</span>
    </div>
    <div class="review-row total">
      <span><strong>Grand Total</strong></span><span><strong>${fmt(grandTotal)}</strong></span>
    </div>
    <div class="review-divider"></div>
    <div class="review-row deposit-row">
      <span><strong>Deposit Due Today (50%)</strong></span>
      <span class="deposit-amount"><strong>${fmt(deposit)}</strong></span>
    </div>
    <div class="review-row balance-row">
      <span>Remaining Balance (due 30 days before event)</span>
      <span>${fmt(balance)}</span>
    </div>
  `;
}

// ── Step 2: Contract Gate ─────────────────────────────────────────────────────
function wireContractGate() {
  const agreeCheckbox = document.getElementById('agree-checkbox');
  const signerNameInput = document.getElementById('signer-name');
  const continueBtn = document.getElementById('contract-continue-btn');

  if (!agreeCheckbox || !continueBtn) return;

  function updateContinueBtn() {
    const hasName = signerNameInput && signerNameInput.value.trim().length >= 2;
    const isChecked = agreeCheckbox.checked;
    continueBtn.disabled = !(hasName && isChecked);
    continueBtn.classList.toggle('btn-ready', hasName && isChecked);
  }

  agreeCheckbox.addEventListener('change', updateContinueBtn);
  if (signerNameInput) signerNameInput.addEventListener('input', updateContinueBtn);

  continueBtn.addEventListener('click', async () => {
    const signerName = signerNameInput ? signerNameInput.value.trim() : '';
    if (!signerName) {
      alert('Please enter your legal name to sign the agreement.');
      return;
    }
    if (!agreeCheckbox.checked) {
      alert('Please check the agreement box to continue.');
      return;
    }
    await initPaymentStep(signerName);
  });
}

// ── Step 3: Payment ───────────────────────────────────────────────────────────
async function initPaymentStep(signerName) {
  showStep(2); // Move to payment step

  const loadingEl = document.getElementById('stripe-loading');
  const errorEl = document.getElementById('stripe-error');
  if (loadingEl) loadingEl.style.display = 'block';
  if (errorEl) errorEl.style.display = 'none';

  try {
    // Create Stripe Checkout Session via our serverless function
    const response = await fetch('/api/wedding/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteData,
        signerName,
        signerTimestamp: new Date().toISOString(),
        signerUserAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create checkout session');
    }

    const { clientSecret } = await response.json();

    // Mount Stripe Embedded Checkout
    const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
    stripeCheckout = await stripe.initEmbeddedCheckout({ clientSecret });
    stripeCheckout.mount('#stripe-checkout');

    if (loadingEl) loadingEl.style.display = 'none';

  } catch (err) {
    console.error('Payment init error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = `Error: ${err.message}. Please try again or contact us directly.`;
    }
  }
}

// ── Step 4: Confirmation ──────────────────────────────────────────────────────
function showConfirmationStep(sessionId) {
  // Hide all checkout steps, show confirmation
  STEPS.forEach(step => {
    const el = document.getElementById(`step-${step}`);
    if (el) el.style.display = 'none';
  });

  const confirmEl = document.getElementById('step-confirmation');
  if (confirmEl) {
    confirmEl.style.display = 'block';

    const sessionEl = document.getElementById('confirm-session-id');
    if (sessionEl) sessionEl.textContent = sessionId;

    // Restore quote data if available
    const stored = sessionStorage.getItem('stoneHouseQuote');
    if (stored) {
      try {
        const quote = JSON.parse(stored);
        const dateEl = document.getElementById('confirm-event-date');
        if (dateEl) dateEl.textContent = quote.eventDate || '';
      } catch (e) { /* ignore */ }
    }

    // Clean up sessionStorage after successful booking
    sessionStorage.removeItem('stoneHouseQuote');
  }

  // Remove session_id from URL without reload
  const url = new URL(window.location.href);
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', url.toString());
}

// ── "Book Now" button handler (called from wedding-cart.js) ───────────────────
window.proceedToCheckout = function(quotePayload) {
  sessionStorage.setItem('stoneHouseQuote', JSON.stringify(quotePayload));
  window.location.href = '/checkout.html';
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatVenueLabel(option) {
  const labels = {
    'single-room': 'Single Room (Hourly)',
    'partial-building-hourly': 'Partial Venue (Hourly)',
    'partial-building-12hr': 'Partial Venue (12-Hour)',
    'partial-building-12hr-peak': 'Partial Venue (12-Hour, Peak)',
    'full-building': 'Full Building Buyout',
    'full-building-peak': 'Full Building Buyout (Peak/Saturday)',
  };
  return labels[option] || option || 'See quote details';
}

function formatCateringLabel(catering) {
  if (!catering) return 'Not included';
  const style = { buffet: 'Buffet', familyStyle: 'Family Style', plated: 'Plated' }[catering.serviceStyle] || catering.serviceStyle;
  return `${style} service`;
}

function showError(message) {
  const errEl = document.getElementById('checkout-fatal-error');
  if (errEl) {
    errEl.textContent = message;
    errEl.style.display = 'block';
  }
  console.error('Checkout error:', message);
}
