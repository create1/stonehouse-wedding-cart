/**
 * Wedding Shopping Cart - Main Controller
 * Handles all UI interactions, state management, and calculations
 */

import { WEDDING_PRICING_CONFIG, WeddingPricingHelpers } from './wedding-pricing-config.js';
import { WeddingCalculator } from './wedding-calculator.js';

class WeddingCart {
  constructor() {
    this.calculator = new WeddingCalculator('unincorporated');
    this.currentStep = 1;
    
    // Cart state
    this.cart = {
      venue: {
        type: null,
        date: null,
        hours: 5
      },
      guestCount: 100,
      catering: {
        protein1: null,
        protein2: null,
        sides: [],
        appetizers: []
      },
      beverages: {
        package: null
      },
      addOns: {
        floral: null,
        photography: false,
        weddingPlanner: false,
        dj: false
      }
    };

    this.init();
  }

  init() {
    this.setupDatePicker();
    this.setupGuestCountSlider();
    this.setupVenueSelection();
    this.setupProteinSelection();
    this.setupSidesAndAppetizers();
    this.setupBeverageSelection();
    this.setupAddOnServices();
    this.setupNavigation();
    this.setupModals();
    this.setupMobileBar();
    this.updatePriceSummary();
  }

  // ===================================
  // DATE PICKER SETUP
  // ===================================
  setupDatePicker() {
    const dateInput = document.getElementById('wedding-date');
    if (!dateInput) return;

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 90); // 90 days minimum

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2); // 2 years max

    flatpickr(dateInput, {
      minDate: minDate,
      maxDate: maxDate,
      dateFormat: 'F j, Y',
      disable: [
        // You can add blocked dates here from API
      ],
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          this.cart.venue.date = selectedDates[0];
          this.updateSeasonDisplay(selectedDates[0]);
          this.updateVenuePricing();
          this.updatePriceSummary();
        }
      }
    });
  }

  updateSeasonDisplay(date) {
    const seasonDisplay = document.getElementById('season-display');
    if (!seasonDisplay) return;

    const season = WeddingPricingHelpers.getSeasonForDate(date);
    seasonDisplay.textContent = `${season.name} Season - ${season.description}`;
    seasonDisplay.className = `season-badge ${season.key}`;
    seasonDisplay.style.display = 'block';

    // Update event date display in summary
    const eventDateDisplay = document.getElementById('event-date-display');
    if (eventDateDisplay) {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      eventDateDisplay.textContent = `${dayOfWeek}, ${formattedDate}`;
    }
  }

  // ===================================
  // GUEST COUNT SLIDER
  // ===================================
  setupGuestCountSlider() {
    const slider = document.getElementById('guest-count');
    const input = document.getElementById('guest-count-input');
    const display = document.getElementById('guest-count-value');
    const decreaseBtn = document.getElementById('guest-decrease');
    const increaseBtn = document.getElementById('guest-increase');

    if (!slider) return;

    const updateGuestCount = (value) => {
      const guestCount = parseInt(value);
      this.cart.guestCount = guestCount;
      
      slider.value = guestCount;
      input.value = guestCount;
      display.textContent = guestCount;
      
      // Update aria
      slider.setAttribute('aria-valuenow', guestCount);
      
      // Update slider fill
      const percent = ((guestCount - 20) / (500 - 20)) * 100;
      slider.style.setProperty('--slider-percent', `${percent}%`);
      
      // Update summary display
      const guestDisplay = document.getElementById('guest-display');
      if (guestDisplay) {
        guestDisplay.textContent = `${guestCount} Guests`;
      }

      this.updatePriceSummary();
    };

    slider.addEventListener('input', (e) => updateGuestCount(e.target.value));
    input.addEventListener('change', (e) => {
      const value = Math.max(20, Math.min(500, parseInt(e.target.value) || 100));
      updateGuestCount(value);
    });

    decreaseBtn.addEventListener('click', () => {
      const newValue = Math.max(20, this.cart.guestCount - 5);
      updateGuestCount(newValue);
    });

    increaseBtn.addEventListener('click', () => {
      const newValue = Math.min(500, this.cart.guestCount + 5);
      updateGuestCount(newValue);
    });

    // Initial update
    updateGuestCount(100);
  }

  // ===================================
  // VENUE SELECTION
  // ===================================
  setupVenueSelection() {
    const venueCards = document.querySelectorAll('.venue-card');

    venueCards.forEach(card => {
      const venueType = card.dataset.venue;
      const selectBtn = card.querySelector('.venue-select-btn');
      const durationSection = document.getElementById(`duration-${venueType}`);
      const durationSlider = durationSection?.querySelector('.duration-slider');
      const durationDisplay = durationSection?.querySelector('.duration-display');

      // Duration slider setup for hourly venues
      if (durationSlider) {
        durationSlider.addEventListener('input', (e) => {
          const hours = parseInt(e.target.value);
          durationDisplay.textContent = `${hours} hours`;
          
          if (this.cart.venue.type === venueType) {
            this.cart.venue.hours = hours;
            this.updatePriceSummary();
          }
        });
      }

      selectBtn.addEventListener('click', () => {
        // Deselect all venue cards
        venueCards.forEach(c => c.classList.remove('selected'));
        
        // Select this card
        card.classList.add('selected');
        this.cart.venue.type = venueType;
        
        // Show/hide duration sliders
        document.querySelectorAll('.venue-duration').forEach(d => d.style.display = 'none');
        
        const venueConfig = WEDDING_PRICING_CONFIG.venue.options[venueType];
        if (!venueConfig.isFlat && durationSection) {
          durationSection.style.display = 'block';
          this.cart.venue.hours = parseInt(durationSlider.value);
        } else {
          this.cart.venue.hours = null;
        }

        this.updatePriceSummary();
      });
    });
  }

  updateVenuePricing() {
    if (!this.cart.venue.date) return;

    const venueOptions = WEDDING_PRICING_CONFIG.venue.options;
    
    for (const [venueId, config] of Object.entries(venueOptions)) {
      const priceDisplay = document.querySelector(`[data-price-display="${venueId}"]`);
      if (!priceDisplay) continue;

      const rate = WeddingPricingHelpers.getVenueRate(this.cart.venue.date, venueId);
      
      if (config.isFlat) {
        priceDisplay.textContent = WeddingPricingHelpers.formatCurrency(rate);
      } else {
        priceDisplay.textContent = `${WeddingPricingHelpers.formatCurrency(rate)}/hr`;
      }
    }
  }

  // ===================================
  // PROTEIN SELECTION
  // ===================================
  setupProteinSelection() {
    const proteinCards = document.querySelectorAll('.protein-card');
    const proteinCounter = document.getElementById('protein-count');
    const avgDisplay = document.getElementById('average-meal-cost');
    const avgPriceDisplay = document.getElementById('avg-price-display');

    proteinCards.forEach(card => {
      card.addEventListener('click', () => {
        const proteinId = card.dataset.protein;
        const isSelected = card.classList.contains('selected');

        // Count current selections
        const selectedCount = document.querySelectorAll('.protein-card.selected').length;

        if (isSelected) {
          // Deselect
          card.classList.remove('selected');
          
          // Remove from cart
          if (this.cart.catering.protein1 === proteinId) {
            this.cart.catering.protein1 = null;
          } else if (this.cart.catering.protein2 === proteinId) {
            this.cart.catering.protein2 = null;
          }
        } else {
          // Select (if less than 2)
          if (selectedCount < 2) {
            card.classList.add('selected');
            
            // Add to cart
            if (!this.cart.catering.protein1) {
              this.cart.catering.protein1 = proteinId;
            } else if (!this.cart.catering.protein2) {
              this.cart.catering.protein2 = proteinId;
            }
          }
        }

        // Update counter
        const newCount = document.querySelectorAll('.protein-card.selected').length;
        proteinCounter.textContent = newCount;

        // Update average display
        if (newCount === 2) {
          const avgPrice = this.calculator.calculateAverageProteinPrice(
            this.cart.catering.protein1,
            this.cart.catering.protein2
          );
          avgPriceDisplay.textContent = WeddingPricingHelpers.formatCurrency(avgPrice);
          avgDisplay.style.display = 'flex';
        } else if (newCount === 1) {
          // Show single protein price
          const proteinId = this.cart.catering.protein1;
          const protein = WEDDING_PRICING_CONFIG.catering.proteins.find(p => p.id === proteinId);
          if (protein && protein.pricePerPerson) {
            avgPriceDisplay.textContent = WeddingPricingHelpers.formatCurrency(protein.pricePerPerson);
            avgDisplay.style.display = 'flex';
          } else {
            avgDisplay.style.display = 'none';
          }
        } else {
          avgDisplay.style.display = 'none';
        }

        // Enable/disable cards when 2 are selected
        if (newCount === 2) {
          proteinCards.forEach(c => {
            if (!c.classList.contains('selected')) {
              c.classList.add('disabled');
            }
          });
        } else {
          proteinCards.forEach(c => c.classList.remove('disabled'));
        }

        this.updatePriceSummary();
      });
    });
  }

  // ===================================
  // SIDES & APPETIZERS
  // ===================================
  setupSidesAndAppetizers() {
    // Sides toggle
    const sidesToggle = document.getElementById('sides-toggle');
    const sidesGrid = document.getElementById('sides-grid');
    const sidesSummary = document.getElementById('sides-summary');
    const sideButtons = document.querySelectorAll('[data-side]');

    if (sidesToggle) {
      sidesToggle.addEventListener('change', (e) => {
        sidesGrid.style.display = e.target.checked ? 'grid' : 'none';
        sidesSummary.style.display = e.target.checked ? 'block' : 'none';
        
        if (!e.target.checked) {
          // Clear all selections
          sideButtons.forEach(btn => btn.classList.remove('selected'));
          this.cart.catering.sides = [];
          this.updatePriceSummary();
        }
      });
    }

    sideButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sideId = btn.dataset.side;
        btn.classList.toggle('selected');

        if (btn.classList.contains('selected')) {
          this.cart.catering.sides.push(sideId);
        } else {
          this.cart.catering.sides = this.cart.catering.sides.filter(id => id !== sideId);
        }

        this.updateSidesSummary();
        this.updatePriceSummary();
      });
    });

    // Appetizers toggle
    const appetizersToggle = document.getElementById('appetizers-toggle');
    const appetizersGrid = document.getElementById('appetizers-grid');
    const appetizersSummary = document.getElementById('appetizers-summary');
    const appetizerButtons = document.querySelectorAll('[data-appetizer]');

    if (appetizersToggle) {
      appetizersToggle.addEventListener('change', (e) => {
        appetizersGrid.style.display = e.target.checked ? 'grid' : 'none';
        appetizersSummary.style.display = e.target.checked ? 'block' : 'none';
        
        if (!e.target.checked) {
          appetizerButtons.forEach(btn => btn.classList.remove('selected'));
          this.cart.catering.appetizers = [];
          this.updatePriceSummary();
        }
      });
    }

    appetizerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const appetizerId = btn.dataset.appetizer;
        btn.classList.toggle('selected');

        if (btn.classList.contains('selected')) {
          this.cart.catering.appetizers.push(appetizerId);
        } else {
          this.cart.catering.appetizers = this.cart.catering.appetizers.filter(id => id !== appetizerId);
        }

        this.updateAppetizersSummary();
        this.updatePriceSummary();
      });
    });
  }

  updateSidesSummary() {
    const summary = document.getElementById('sides-summary');
    if (!summary) return;

    const count = this.cart.catering.sides.length;
    if (count > 0) {
      const cost = count * 8 * this.cart.guestCount;
      summary.innerHTML = `<i class="fas fa-check-circle"></i> ${count} sides selected × $8/person × ${this.cart.guestCount} guests = ${WeddingPricingHelpers.formatCurrency(cost)}`;
    }
  }

  updateAppetizersSummary() {
    const summary = document.getElementById('appetizers-summary');
    if (!summary) return;

    const count = this.cart.catering.appetizers.length;
    if (count > 0) {
      const cost = count * 6 * this.cart.guestCount;
      summary.innerHTML = `<i class="fas fa-check-circle"></i> ${count} appetizers selected × $6/person × ${this.cart.guestCount} guests = ${WeddingPricingHelpers.formatCurrency(cost)}`;
    }
  }

  // ===================================
  // BEVERAGE SELECTION
  // ===================================
  setupBeverageSelection() {
    const beverageCards = document.querySelectorAll('.beverage-card');

    beverageCards.forEach(card => {
      const selectBtn = card.querySelector('.package-select-btn');
      
      selectBtn.addEventListener('click', () => {
        const packageId = card.dataset.package;

        // Deselect all
        beverageCards.forEach(c => c.classList.remove('selected'));

        // Select this one (or none if "none" clicked)
        if (packageId !== 'none') {
          card.classList.add('selected');
          this.cart.beverages.package = packageId;
        } else {
          this.cart.beverages.package = null;
        }

        this.updatePriceSummary();
      });
    });
  }

  // ===================================
  // ADD-ON SERVICES
  // ===================================
  setupAddOnServices() {
    // Floral packages
    const floralCards = document.querySelectorAll('.floral-card');
    
    floralCards.forEach(card => {
      const selectBtn = card.querySelector('.floral-select-btn');
      
      selectBtn.addEventListener('click', () => {
        const floralId = card.dataset.floral;

        // Deselect all
        floralCards.forEach(c => c.classList.remove('selected'));

        // Select this one (or none if "none" clicked)
        if (floralId !== 'none') {
          card.classList.add('selected');
          this.cart.addOns.floral = floralId;
        } else {
          this.cart.addOns.floral = null;
        }

        this.checkFullPackageEligibility();
        this.updatePriceSummary();
      });
    });

    // Service toggles
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
      const toggleBtn = card.querySelector('.service-toggle-btn');
      const serviceId = card.dataset.service;
      
      toggleBtn.addEventListener('click', () => {
        const isSelected = card.classList.contains('selected');
        
        if (isSelected) {
          card.classList.remove('selected');
          toggleBtn.textContent = 'Add to Package';
          toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Add to Package';
          this.cart.addOns[serviceId] = false;
        } else {
          card.classList.add('selected');
          toggleBtn.innerHTML = '<i class="fas fa-check"></i> Added';
          this.cart.addOns[serviceId] = true;
        }

        this.checkFullPackageEligibility();
        this.updatePriceSummary();
      });
    });
  }

  // ===================================
  // FULL PACKAGE CHECK
  // ===================================
  checkFullPackageEligibility() {
    const isEligible = this.calculator.checkFullPackageEligibility(this.cart);
    const banner = document.getElementById('full-package-banner');
    const plannerCard = document.getElementById('planner-card');
    const freeBadge = plannerCard?.querySelector('.free-badge');
    const plannerPrice = plannerCard?.querySelector('.service-price');
    const plannerBtn = plannerCard?.querySelector('.service-toggle-btn');

    if (isEligible) {
      // Show banner
      if (banner) banner.style.display = 'flex';

      // Update planner card
      if (plannerCard) {
        plannerCard.classList.add('free-service');
        if (freeBadge) freeBadge.style.display = 'block';
        if (plannerPrice) plannerPrice.style.display = 'none';
        if (plannerBtn) {
          plannerBtn.innerHTML = '<i class="fas fa-gift"></i> FREE - Included';
          plannerBtn.disabled = true;
        }
        plannerCard.classList.add('selected');
        this.cart.addOns.weddingPlanner = true;
      }
    } else {
      // Hide banner
      if (banner) banner.style.display = 'none';

      // Reset planner card
      if (plannerCard && plannerCard.classList.contains('free-service')) {
        plannerCard.classList.remove('free-service');
        if (freeBadge) freeBadge.style.display = 'none';
        if (plannerPrice) plannerPrice.style.display = 'block';
        if (plannerBtn) {
          plannerBtn.disabled = false;
          const isSelected = plannerCard.classList.contains('selected');
          plannerBtn.innerHTML = isSelected 
            ? '<i class="fas fa-check"></i> Added'
            : '<i class="fas fa-plus"></i> Add to Package';
        }
      }
    }

    return isEligible;
  }

  // ===================================
  // PRICE SUMMARY UPDATE
  // ===================================
  updatePriceSummary() {
    // Validate cart has minimum required data
    if (!this.cart.venue.date || !this.cart.guestCount) {
      return;
    }

    try {
      const quote = this.calculator.calculateCompleteQuote(this.cart);
      
      // Update venue line
      const venueLine = document.getElementById('venue-line');
      const venueAmount = document.getElementById('venue-amount');
      if (quote.venue.cost > 0) {
        venueLine.style.display = 'flex';
        venueAmount.textContent = quote.formatted.venue;
      } else {
        venueLine.style.display = 'none';
      }

      // Update catering line
      const cateringLine = document.getElementById('catering-line');
      const cateringAmount = document.getElementById('catering-amount');
      if (quote.catering.total > 0) {
        cateringLine.style.display = 'flex';
        cateringAmount.textContent = quote.formatted.catering;
      } else {
        cateringLine.style.display = 'none';
      }

      // Update beverages line
      const beveragesLine = document.getElementById('beverages-line');
      const beveragesAmount = document.getElementById('beverages-amount');
      if (quote.beverages.total > 0) {
        beveragesLine.style.display = 'flex';
        beveragesAmount.textContent = quote.formatted.beverages;
      } else {
        beveragesLine.style.display = 'none';
      }

      // Update service fee line
      const serviceFeeLine = document.getElementById('service-fee-line');
      const serviceFeeAmount = document.getElementById('service-fee-amount');
      if (quote.serviceFee.amount > 0) {
        serviceFeeLine.style.display = 'flex';
        serviceFeeAmount.textContent = quote.formatted.serviceFee;
      } else {
        serviceFeeLine.style.display = 'none';
      }

      // Update add-ons line
      const addOnsLine = document.getElementById('addons-line');
      const addOnsAmount = document.getElementById('addons-amount');
      if (quote.addOns.total > 0) {
        addOnsLine.style.display = 'flex';
        addOnsAmount.textContent = WeddingPricingHelpers.formatCurrency(quote.addOns.total);
      } else {
        addOnsLine.style.display = 'none';
      }

      // Update subtotal
      document.getElementById('subtotal-amount').textContent = 
        WeddingPricingHelpers.formatCurrency(quote.totals.taxableSubtotal + quote.totals.nonTaxableSubtotal);

      // Update tax
      const taxRow = document.querySelector('.tax-row .item-label');
      if (taxRow) {
        taxRow.innerHTML = `Sales Tax (${quote.tax.ratePercent}) 
          <button class="info-btn" id="tax-info-btn" title="Tax information">
            <i class="fas fa-info-circle"></i>
          </button>`;
        
        // Re-attach event listener
        const taxInfoBtn = document.getElementById('tax-info-btn');
        if (taxInfoBtn) {
          taxInfoBtn.addEventListener('click', () => this.showTaxModal());
        }
      }
      document.getElementById('tax-amount').textContent = quote.formatted.salesTax;

      // Update discount
      const discountLine = document.getElementById('discount-line');
      const discountAmount = document.getElementById('discount-amount');
      if (quote.fullPackage.eligible) {
        discountLine.style.display = 'flex';
        discountAmount.textContent = '-' + quote.formatted.discount;
        
        // Update savings display
        const savingsDisplay = document.getElementById('savings-display');
        if (savingsDisplay) {
          savingsDisplay.textContent = WeddingPricingHelpers.formatCurrency(quote.fullPackage.totalSavings);
        }
      } else {
        discountLine.style.display = 'none';
      }

      // Update grand total
      document.getElementById('grand-total').textContent = quote.formatted.grandTotal;
      document.getElementById('mobile-total').textContent = quote.formatted.grandTotal;

      // Store quote for later use
      this.currentQuote = quote;

    } catch (error) {
      console.error('Error calculating quote:', error);
    }
  }

  // ===================================
  // NAVIGATION
  // ===================================
  setupNavigation() {
    // Next buttons
    document.querySelectorAll('.next-step, .btn-primary[id^="next-step"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.validateCurrentStep()) {
          this.goToStep(this.currentStep + 1);
        }
      });
    });

    // Previous buttons
    document.querySelectorAll('.prev-step').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goToStep(this.currentStep - 1);
      });
    });

    // Submit quote button
    const submitBtn = document.getElementById('submit-quote');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitQuote());
    }
  }

  validateCurrentStep() {
    const errors = [];

    if (this.currentStep === 1) {
      if (!this.cart.venue.date) {
        errors.push('Please select a wedding date');
      }
      if (!this.cart.venue.type) {
        errors.push('Please select a venue option');
      }
    }

    if (this.currentStep === 2) {
      if (!this.cart.catering.protein1) {
        errors.push('Please select at least 1 protein option');
      }
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }

    return true;
  }

  goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.cart-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show target step
    const targetStep = document.querySelector(`.cart-step[data-step="${stepNumber}"]`);
    if (targetStep) {
      targetStep.classList.add('active');
      this.currentStep = stepNumber;

      // Update progress indicator
      document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum === stepNumber) {
          step.classList.add('active');
        } else if (stepNum < stepNumber) {
          step.classList.add('completed');
        }
      });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // If step 5 (review), generate breakdown
      if (stepNumber === 5) {
        this.generateReviewBreakdown();
      }
    }
  }

  // ===================================
  // REVIEW BREAKDOWN
  // ===================================
  generateReviewBreakdown() {
    const container = document.getElementById('itemized-breakdown');
    if (!container || !this.currentQuote) return;

    const items = this.calculator.generateItemizedBreakdown(this.currentQuote);
    const quote = this.currentQuote;

    let html = '<div class="itemized-list">';

    // Group by category
    html += '<div class="item-category"><h4>Venue</h4>';
    items.filter(item => item.category === 'Venue Rental').forEach(item => {
      html += `
        <div class="item-row">
          <div class="item-details">
            <span class="item-name">${item.category}</span>
            <span class="item-desc">${item.description}</span>
            ${item.taxable ? '<span class="tax-badge">+ tax</span>' : ''}
          </div>
          <span class="item-price">${item.formatted}</span>
        </div>
      `;
    });
    html += '</div>';

    // Catering
    html += '<div class="item-category"><h4>Catering (includes salad & dessert)</h4>';
    items.filter(item => ['Catering', 'Additional Sides', 'Passed Appetizers'].includes(item.category)).forEach(item => {
      html += `
        <div class="item-row">
          <div class="item-details">
            <span class="item-name">${item.category}</span>
            <span class="item-desc">${item.subdescription || item.description}</span>
            ${item.taxable ? '<span class="tax-badge">+ tax</span>' : ''}
          </div>
          <span class="item-price">${item.formatted}</span>
        </div>
      `;
    });
    html += '</div>';

    // Beverages
    if (quote.beverages.total > 0) {
      html += '<div class="item-category"><h4>Beverages</h4>';
      items.filter(item => item.category === 'Beverages').forEach(item => {
        html += `
          <div class="item-row">
            <div class="item-details">
              <span class="item-name">${item.category}</span>
              <span class="item-desc">${item.description}</span>
              <span class="tax-badge">+ tax</span>
            </div>
            <span class="item-price">${item.formatted}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // Service Fee
    if (quote.serviceFee.amount > 0) {
      html += '<div class="item-category"><h4>Service Fee</h4>';
      items.filter(item => item.category === 'Service Fee').forEach(item => {
        html += `
          <div class="item-row">
            <div class="item-details">
              <span class="item-name">${item.category}</span>
              <span class="item-desc">${item.description}</span>
              <span class="tax-badge">+ tax</span>
            </div>
            <span class="item-price">${item.formatted}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // Add-Ons
    const addOnItems = items.filter(item => 
      ['Floral Package', 'Photography', 'Wedding Planning', 'DJ Service'].includes(item.category)
    );
    
    if (addOnItems.length > 0) {
      html += '<div class="item-category"><h4>Add-On Services</h4>';
      addOnItems.forEach(item => {
        html += `
          <div class="item-row">
            <div class="item-details">
              <span class="item-name">${item.category}</span>
              <span class="item-desc">${item.description}</span>
              ${item.taxable ? '<span class="tax-badge">+ tax</span>' : '<span class="tax-exempt">tax-exempt</span>'}
              ${item.isFree ? '<span class="free-tag">FREE</span>' : ''}
            </div>
            <span class="item-price ${item.isFree ? 'free' : ''}">${item.formatted}</span>
          </div>
        `;
      });
      html += '</div>';
    }

    // Totals section
    html += `
      <div class="totals-section">
        <div class="total-row">
          <span>Taxable Items Subtotal</span>
          <span>${WeddingPricingHelpers.formatCurrency(quote.totals.taxableSubtotal)}</span>
        </div>
        <div class="total-row">
          <span>Non-Taxable Items Subtotal</span>
          <span>${WeddingPricingHelpers.formatCurrency(quote.totals.nonTaxableSubtotal)}</span>
        </div>
        <div class="total-row tax-row">
          <span>Sales Tax (${quote.tax.ratePercent})</span>
          <span>${WeddingPricingHelpers.formatCurrency(quote.totals.salesTax)}</span>
        </div>
        ${quote.fullPackage.eligible ? `
          <div class="total-row discount-row">
            <span><i class="fas fa-star"></i> Full Package Discount (10%)</span>
            <span class="discount">-${WeddingPricingHelpers.formatCurrency(quote.totals.discount)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>GRAND TOTAL</span>
          <span>${WeddingPricingHelpers.formatCurrency(quote.totals.grandTotal)}</span>
        </div>
      </div>
    `;

    html += '</div>';
    container.innerHTML = html;
  }

  // ===================================
  // SUBMIT QUOTE
  // ===================================
  async submitQuote() {
    // Validate contact info
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const preferredContact = document.getElementById('preferred-contact').value;

    if (!name || !email || !phone) {
      alert('Please fill in all required contact fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    const submitBtn = document.getElementById('submit-quote');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
      const quoteData = {
        cart: this.cart,
        quote: this.currentQuote,
        contact: {
          name,
          email,
          phone,
          message,
          preferredContact
        },
        timestamp: new Date().toISOString()
      };

      // Submit to API
      const response = await fetch('/api/wedding-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteData)
      });

      if (response.ok) {
        const result = await response.json();
        this.showSuccessMessage(result.quoteNumber || 'WQ-' + Date.now());
      } else {
        throw new Error('Failed to submit quote');
      }

    } catch (error) {
      console.error('Error submitting quote:', error);
      alert('There was an error submitting your quote. Please try again or contact us directly at (530) 265-5050.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  showSuccessMessage(quoteNumber) {
    // Hide all steps
    document.querySelectorAll('.cart-step').forEach(step => step.classList.remove('active'));
    
    // Show success message
    const successMsg = document.getElementById('success-message');
    const quoteRef = document.getElementById('quote-reference');
    
    if (successMsg && quoteRef) {
      quoteRef.textContent = quoteNumber;
      successMsg.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===================================
  // MODALS
  // ===================================
  setupModals() {
    const modal = document.getElementById('tax-info-modal');
    const closeBtn = modal?.querySelector('.modal-close');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  showTaxModal() {
    const modal = document.getElementById('tax-info-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // ===================================
  // MOBILE PRICE BAR
  // ===================================
  setupMobileBar() {
    const expandBtn = document.getElementById('mobile-expand');
    const sidebar = document.getElementById('price-summary');

    if (expandBtn && sidebar) {
      expandBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-expanded');
        const icon = expandBtn.querySelector('i');
        
        if (sidebar.classList.contains('mobile-expanded')) {
          icon.className = 'fas fa-chevron-down';
          expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Hide Details';
        } else {
          icon.className = 'fas fa-chevron-up';
          expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> View Details';
        }
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.weddingCart = new WeddingCart();
});
