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
        sidesQty: 0,
        appetizersQty: 0,
        serviceStyle: 'buffet',
        dessert: false
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
    this.setupSeasonTabs();
    this.setupDatePicker();
    this.setupGuestCountSlider();
    this.setupVenueSelection();
    this.setupProteinSelection();
    this.setupSidesAndAppetizers();
    this.setupServiceStyle();
    this.setupDessert();
    this.setupBeverageSelection();
    this.setupAddOnServices();
    this.setupNavigation();
    this.setupModals();
    this.setupMobileBar();
    this.updatePriceSummary();
  }

  // ===================================
  // SEASON TAB SWITCHER
  // ===================================
  setupSeasonTabs() {
    document.querySelectorAll('.season-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const season = tab.dataset.season;
        document.querySelectorAll('.price-cell[data-offpeak]').forEach(cell => {
          cell.textContent = cell.dataset[season];
        });
      });
    });
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
      disableMobile: true, // always use our touch-friendly calendar
      allowInput: false,
      disable: [],
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          this.cart.venue.date = selectedDates[0];
          this.updateSeasonDisplay(selectedDates[0]);
          this.updateVenueAvailability(selectedDates[0]);
          this.updateVenuePricing();
          this.updatePriceSummary();
          this.updatePricingTableSeason(selectedDates[0]);
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
      const percent = ((guestCount - 20) / (150 - 20)) * 100;
      slider.style.setProperty('--slider-percent', `${percent}%`);
      
      // Update summary display
      const guestDisplay = document.getElementById('guest-display');
      if (guestDisplay) {
        guestDisplay.textContent = `${guestCount} Guests`;
      }

      this.updateSidesCostDisplay();
      this.updateAppsCostDisplay();
      this.updateDessertCostDisplay();
      this.updatePriceSummary();
    };

    slider.addEventListener('input', (e) => updateGuestCount(e.target.value));
    input.addEventListener('change', (e) => {
      const value = Math.max(20, Math.min(150, parseInt(e.target.value) || 100));
      updateGuestCount(value);
    });

    decreaseBtn.addEventListener('click', () => {
      const newValue = Math.max(20, this.cart.guestCount - 5);
      updateGuestCount(newValue);
    });

    increaseBtn.addEventListener('click', () => {
      const newValue = Math.min(150, this.cart.guestCount + 5);
      updateGuestCount(newValue);
    });

    // Initial update
    updateGuestCount(100);
  }

  updatePricingTableSeason(date) {
    const season = WeddingPricingHelpers.getSeasonForDate(date);

    // Map config season keys to tab data-season values
    const seasonMap = { offPeak: 'offpeak', shoulder: 'shoulder', peak: 'peak' };
    const tabSeason = seasonMap[season.key] || 'offpeak';

    // Activate the matching tab
    const tabs = document.querySelectorAll('.season-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.season === tabSeason);
    });

    // Update all price cells
    document.querySelectorAll('.price-cell[data-offpeak]').forEach(cell => {
      cell.textContent = cell.dataset[tabSeason];
    });

    // Scroll pricing table into view briefly to signal the update
    const pricingCard = document.querySelector('.pricing-card');
    if (pricingCard) {
      pricingCard.style.transition = 'box-shadow 0.3s';
      pricingCard.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.4)';
      setTimeout(() => {
        pricingCard.style.boxShadow = '';
      }, 800);
    }
  }

  // ===================================
  // VENUE AVAILABILITY BY DAY
  // ===================================
  updateVenueAvailability(date) {
    const isSaturday = date.getDay() === 6;

    // Hourly options (hidden on Saturdays — block rental only)
    const hourlyCards = ['singleRoom', 'partialBuilding'];
    // Flat/block options (always available)
    const flatCards   = ['partialBuildingFlat', 'premiumEventCap'];

    const notice = document.getElementById('saturday-notice');

    if (isSaturday) {
      // Saturday: flat/block rentals only — hide hourly options
      hourlyCards.forEach(id => {
        const card = document.querySelector(`.venue-card[data-venue="${id}"]`);
        if (!card) return;
        card.style.display = 'none';
        if (this.cart.venue.type === id) {
          card.classList.remove('selected');
          this.cart.venue.type = null;
        }
      });
      flatCards.forEach(id => {
        const card = document.querySelector(`.venue-card[data-venue="${id}"]`);
        if (card) card.style.display = '';
      });
      if (notice) notice.style.display = 'flex';
    } else {
      // All other days: all four options visible
      [...hourlyCards, ...flatCards].forEach(id => {
        const card = document.querySelector(`.venue-card[data-venue="${id}"]`);
        if (card) card.style.display = '';
      });
      if (notice) notice.style.display = 'none';
    }
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
  // SIDES & APPETIZERS (quantity-based)
  // ===================================
  setupSidesAndAppetizers() {
    // ── SIDES ──
    const sidesToggle = document.getElementById('sides-toggle');
    const sidesPanel  = document.getElementById('sides-qty-panel');

    if (sidesToggle) {
      sidesToggle.addEventListener('change', (e) => {
        sidesPanel.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
          this.cart.catering.sidesQty = 0;
          this.updatePriceSummary();
        } else {
          this.cart.catering.sidesQty = 1;
          this.updateSidesCostDisplay();
          this.updatePriceSummary();
        }
      });
    }

    const sidesQtyEl   = document.getElementById('sides-qty');
    const sidesPlural  = document.getElementById('sides-plural');
    const sidesDecrBtn = document.getElementById('sides-decrease');
    const sidesIncrBtn = document.getElementById('sides-increase');

    const updateSidesQty = (val) => {
      const qty = Math.max(1, Math.min(6, val));
      this.cart.catering.sidesQty = qty;
      sidesQtyEl.textContent = qty;
      sidesPlural.textContent = qty === 1 ? '' : 'es';
      sidesDecrBtn.disabled = qty <= 1;
      sidesIncrBtn.disabled = qty >= 6;
      this.updateSidesCostDisplay();
      this.updatePriceSummary();
    };

    sidesDecrBtn?.addEventListener('click', () => updateSidesQty(this.cart.catering.sidesQty - 1));
    sidesIncrBtn?.addEventListener('click', () => updateSidesQty(this.cart.catering.sidesQty + 1));

    // ── APPETIZERS ──
    const appsToggle = document.getElementById('appetizers-toggle');
    const appsPanel  = document.getElementById('appetizers-qty-panel');

    if (appsToggle) {
      appsToggle.addEventListener('change', (e) => {
        appsPanel.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
          this.cart.catering.appetizersQty = 0;
          this.updatePriceSummary();
        } else {
          this.cart.catering.appetizersQty = 1;
          this.updateAppsCostDisplay();
          this.updatePriceSummary();
        }
      });
    }

    const appsQtyEl   = document.getElementById('apps-qty');
    const appsPlural  = document.getElementById('apps-plural');
    const appsDecrBtn = document.getElementById('apps-decrease');
    const appsIncrBtn = document.getElementById('apps-increase');

    const updateAppsQty = (val) => {
      const qty = Math.max(1, Math.min(6, val));
      this.cart.catering.appetizersQty = qty;
      appsQtyEl.textContent = qty;
      appsPlural.textContent = qty === 1 ? '' : 's';
      appsDecrBtn.disabled = qty <= 1;
      appsIncrBtn.disabled = qty >= 6;
      this.updateAppsCostDisplay();
      this.updatePriceSummary();
    };

    appsDecrBtn?.addEventListener('click', () => updateAppsQty(this.cart.catering.appetizersQty - 1));
    appsIncrBtn?.addEventListener('click', () => updateAppsQty(this.cart.catering.appetizersQty + 1));
  }

  updateSidesCostDisplay() {
    const el = document.getElementById('sides-cost-display');
    if (!el) return;
    const qty = this.cart.catering.sidesQty || 0;
    if (qty > 0) {
      const cost = qty * 5 * this.cart.guestCount;
      el.innerHTML = `<i class="fas fa-check-circle"></i> ${qty} side dish${qty !== 1 ? 'es' : ''} × $5/person × ${this.cart.guestCount} guests = <strong>${WeddingPricingHelpers.formatCurrency(cost)}</strong>`;
    }
  }

  updateAppsCostDisplay() {
    const el = document.getElementById('apps-cost-display');
    if (!el) return;
    const qty = this.cart.catering.appetizersQty || 0;
    if (qty > 0) {
      const cost = qty * 5 * this.cart.guestCount;
      el.innerHTML = `<i class="fas fa-check-circle"></i> ${qty} passed appetizer${qty !== 1 ? 's' : ''} × $5/person × ${this.cart.guestCount} guests = <strong>${WeddingPricingHelpers.formatCurrency(cost)}</strong>`;
    }
  }

  // ===================================
  // BEVERAGE SELECTION
  // ===================================
  setupServiceStyle() {
    const cards = document.querySelectorAll('.service-style-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.cart.catering.serviceStyle = card.dataset.style;
        this.updatePriceSummary();
      });
    });
  }

  setupDessert() {
    const toggle = document.getElementById('dessert-toggle');
    const panel  = document.getElementById('dessert-info');
    if (!toggle) return;
    toggle.addEventListener('change', () => {
      this.cart.catering.dessert = toggle.checked;
      if (panel) panel.style.display = toggle.checked ? 'block' : 'none';
      this.updateDessertCostDisplay();
      this.updatePriceSummary();
    });
  }

  updateDessertCostDisplay() {
    const el = document.getElementById('dessert-cost-display');
    if (!el) return;
    const qty = this.cart.guestCount || 0;
    const cost = 12 * qty;
    el.textContent = qty > 0
      ? `+$${cost.toLocaleString()} (${qty} guests × $12/person)`
      : '';
  }


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
          toggleBtn.innerHTML = '<i class="fas fa-plus"></i> Add to Package';
          this.cart.addOns[serviceId] = false;
        } else {
          card.classList.add('selected');
          toggleBtn.innerHTML = '<i class="fas fa-check"></i> Added';
          this.cart.addOns[serviceId] = true;
        }

        this.updatePriceSummary();
      });
    });
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
        errors.push('Please select an event date');
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

      // Scroll to top of cart form, not page top
      const cartMain = document.querySelector('.cart-main');
      if (cartMain) {
        const offset = cartMain.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }

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
      const response = await fetch('/api/wedding/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteData)
      });

      const result = await response.json();

      if (response.ok) {
        this.lastContact = { name, email, phone, preferredContact };
        this.showSuccessMessage(result.quoteNumber || 'WQ-' + Date.now());
      } else {
        throw new Error(result.error || 'Failed to submit quote');
      }

    } catch (error) {
      console.error('Error submitting quote:', error);
      alert(`There was an error submitting your quote:\n\n${error.message}\n\nPlease try again or call us at (530) 265-5050.`);
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

    // Wire up download button now that we have the quote number
    const downloadBtn = document.getElementById('download-quote');
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadQuotePDF(quoteNumber);
    }

    // Scroll to top of cart form
    const cartMain = document.querySelector('.cart-main');
    if (cartMain) {
      const offset = cartMain.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }

  // ===================================
  // PDF DOWNLOAD
  // ===================================
  downloadQuotePDF(quoteNumber) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { alert('PDF library not loaded. Please try again.'); return; }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const quote = this.currentQuote;
    const cart  = this.cart;
    const contact = this.lastContact || {};
    const config = WEDDING_PRICING_CONFIG;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 40, marginR = 40;
    const contentW = pageW - marginL - marginR;
    const gold  = [212, 175, 55];
    const dark  = [44, 62, 80];
    const mid   = [127, 140, 141];
    const light = [236, 240, 241];
    const green = [39, 174, 96];
    const fmt   = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

    let y = 0;

    // ─────────────────────────────────
    // HELPERS
    // ─────────────────────────────────
    const checkPageBreak = (needed = 60) => {
      if (y + needed > pageH - 70) {
        addFooter();
        doc.addPage();
        y = 40;
      }
    };

    const sectionHeader = (title, icon = '') => {
      checkPageBreak(50);
      doc.setFillColor(...dark);
      doc.roundedRect(marginL, y, contentW, 28, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...gold);
      doc.text((icon + '  ' + title).trim(), marginL + 12, y + 18);
      y += 36;
    };

    const labelValue = (label, value, indent = 0, valueColor = dark) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...mid);
      doc.text(label, marginL + indent, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...valueColor);
      doc.text(String(value), marginL + indent + 130, y);
      y += 15;
    };

    const bulletLine = (text, indent = 12) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text('•  ' + text, marginL + indent, y);
      y += 13;
    };

    const divider = (color = light) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.5);
      doc.line(marginL, y, marginL + contentW, y);
      y += 10;
    };

    const amountRow = (label, amount, bold = false, color = dark, subtext = '') => {
      checkPageBreak(20);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(...color);
      doc.text(label, marginL + 10, y);
      doc.text(amount, marginL + contentW - 10, y, { align: 'right' });
      if (subtext) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...mid);
        doc.text(subtext, marginL + 10, y + 11);
        y += 10;
      }
      y += 16;
    };

    const addFooter = () => {
      doc.setFillColor(...dark);
      doc.rect(0, pageH - 48, pageW, 48, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text('Stone House  ·  107 Sacramento Street, Nevada City, CA 95959  ·  bookings@stonehouse.io  ·  (530) 265-5050', pageW / 2, pageH - 28, { align: 'center' });
      doc.text('This is a preliminary estimate and is subject to availability and final confirmation.', pageW / 2, pageH - 15, { align: 'center' });
    };

    // ─────────────────────────────────
    // PAGE 1 — HEADER
    // ─────────────────────────────────
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, 90, 'F');
    doc.setFillColor(...gold);
    doc.rect(0, 90, pageW, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...gold);
    doc.text('STONE HOUSE', pageW / 2, 36, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(210, 210, 210);
    doc.text('Wedding Package Proposal  ·  Nevada City, California', pageW / 2, 56, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(...gold);
    doc.text(`Quote #${quoteNumber}  ·  Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, 74, { align: 'center' });

    y = 108;

    // ─────────────────────────────────
    // CLIENT & EVENT OVERVIEW
    // ─────────────────────────────────
    const eventDate = quote.venue.date
      ? new Date(quote.venue.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Not selected';
    const dayOfWeek = quote.venue.date ? new Date(quote.venue.date).toLocaleDateString('en-US', { weekday: 'long' }) : '';

    // Two-column overview box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(marginL, y, contentW, contact.name ? 100 : 72, 6, 6, 'F');
    doc.setDrawColor(...light);
    doc.setLineWidth(1);
    doc.roundedRect(marginL, y, contentW, contact.name ? 100 : 72, 6, 6, 'S');

    const leftX = marginL + 14, rightX = marginL + contentW / 2 + 10;
    let boxY = y + 16;

    const twoColRow = (l1, v1, l2, v2) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...mid);
      doc.text(l1.toUpperCase(), leftX, boxY);
      if (l2) doc.text(l2.toUpperCase(), rightX, boxY);
      boxY += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text(v1, leftX, boxY);
      if (v2) doc.text(v2, rightX, boxY);
      boxY += 18;
    };

    twoColRow('Event Date', eventDate, 'Guest Count', `${quote.catering.guestCount} Guests`);
    twoColRow('Venue Package', quote.venue.typeName || '—', 'Season', `${quote.venue.season?.name || '—'} Season`);
    if (contact.name) {
      doc.setDrawColor(...light); doc.line(leftX, boxY - 6, leftX + contentW - 28, boxY - 6);
      boxY += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...mid);
      doc.text('PREPARED FOR', leftX, boxY); boxY += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text(contact.name, leftX, boxY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...mid);
      doc.text(`${contact.email}   ·   ${contact.phone}`, leftX + 100, boxY);
    }

    y += contact.name ? 108 : 80;
    y += 10;

    // ─────────────────────────────────
    // SECTION 1 — VENUE
    // ─────────────────────────────────
    sectionHeader('VENUE RENTAL');

    const venueConfig = config.venue.options[cart.venue.type];
    const season = quote.venue.season;
    const dayTier = WeddingPricingHelpers.getDayTier(new Date(quote.venue.date));
    const dayTierName = { monThu: 'Monday–Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }[dayTier] || dayTier;

    if (venueConfig?.isFlat) {
      labelValue('Package', quote.venue.typeName);
      labelValue('Includes', 'Lounge, Great Hall, Show Room, Patio, Cavern & Parlour');
      labelValue('Duration', '12-Hour Block (all-day access)');
      labelValue('Day', dayOfWeek + ` (${dayTierName} rate)`);
      labelValue('Season', `${season?.name} Season (${season?.description})`);
      y += 4;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(marginL, y, contentW, 26, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text('Flat Rate — 12 Hour Block', marginL + 12, y + 17);
      doc.setTextColor(...gold);
      doc.text(fmt(quote.venue.cost), marginL + contentW - 12, y + 17, { align: 'right' });
      y += 34;
    } else {
      const hourlyRate = venueConfig?.pricing?.[season?.key]?.[dayTier] || 0;
      const hours = cart.venue.hours || 5;
      labelValue('Package', quote.venue.typeName);
      labelValue('Includes', 'Lounge, Great Hall, Show Room, Patio, Cavern & Parlour');
      labelValue('Day', dayOfWeek + ` (${dayTierName} rate)`);
      labelValue('Season', `${season?.name} Season (${season?.description})`);
      labelValue('Hourly Rate', `${fmt(hourlyRate)}/hour`);
      labelValue('Duration', `${hours} hours (3-hour minimum)`);
      y += 4;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(marginL, y, contentW, 26, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text(`${fmt(hourlyRate)}/hr  ×  ${hours} hours`, marginL + 12, y + 17);
      doc.setTextColor(...gold);
      doc.text(fmt(quote.venue.cost), marginL + contentW - 12, y + 17, { align: 'right' });
      y += 34;
    }

    // ─────────────────────────────────
    // SECTION 2 — CATERING
    // ─────────────────────────────────
    checkPageBreak(80);
    sectionHeader('CATERING  —  Includes Salad & Dessert');

    if (quote.catering.isOutsideCatering) {
      labelValue('Type', 'Outside Catering (approved vendors only)');
      labelValue('Fee', fmt(config.catering.outsideCateringFee) + ' flat fee');
    } else {
      // Entrees
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
      doc.text('ENTRÉE SELECTIONS', marginL, y); y += 14;

      const proteins = config.catering.proteins;
      const p1 = proteins.find(p => p.id === cart.catering.protein1);
      const p2 = proteins.find(p => p.id === cart.catering.protein2);

      // Entree table rows
      const entreeRows = [];
      if (p1) entreeRows.push([p1.name, p1.description, `$${p1.pricePerPerson}/person`, fmt(p1.pricePerPerson * quote.catering.guestCount)]);
      if (p2) entreeRows.push([p2.name, p2.description, `$${p2.pricePerPerson}/person`, fmt(p2.pricePerPerson * quote.catering.guestCount)]);
      if (p1 && p2) {
        entreeRows.push(['', `Average of both entrées × ${quote.catering.guestCount} guests`, `$${quote.catering.avgProteinPrice}/person avg`, fmt(quote.catering.baseCost)]);
      }

      doc.autoTable({
        startY: y,
        head: [['Entrée', 'Description', 'Per Person', `Total (${quote.catering.guestCount} guests)`]],
        body: entreeRows,
        theme: 'grid',
        headStyles: { fillColor: [60, 78, 96], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 9, textColor: dark },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 90 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 80 },
          3: { halign: 'right', cellWidth: 90, fontStyle: 'bold' }
        },
        margin: { left: marginL, right: marginR },
        didParseCell: (data) => {
          if (data.row.index === entreeRows.length - 1 && p1 && p2) {
            data.cell.styles.fillColor = [255, 252, 235];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // Additional Sides
    if (quote.catering.sides?.count > 0) {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
      doc.text('ADDITIONAL SIDES  —  $6/person each', marginL, y); y += 13;
      labelValue('Quantity', `${quote.catering.sides.count} side dish${quote.catering.sides.count !== 1 ? 'es' : ''}`);
      labelValue('Rate', `$8/person × ${quote.catering.guestCount} guests`);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...mid);
      doc.text('Final side dish selections to be confirmed during event planning.', marginL, y); y += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
      doc.text(fmt(quote.catering.sides.cost), marginL + contentW, y, { align: 'right' });
      y += 10;
    }

    // Passed Appetizers
    if (quote.catering.appetizers?.count > 0) {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
      doc.text('PASSED APPETIZERS  —  $5/person each', marginL, y); y += 13;
      labelValue('Quantity', `${quote.catering.appetizers.count} passed appetizer${quote.catering.appetizers.count !== 1 ? 's' : ''}`);
      labelValue('Rate', `$6/person × ${quote.catering.guestCount} guests`);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...mid);
      doc.text('Final appetizer selections to be confirmed during event planning.', marginL, y); y += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
      doc.text(fmt(quote.catering.appetizers.cost), marginL + contentW, y, { align: 'right' });
      y += 10;
    }

    // ─────────────────────────────────
    // SECTION 3 — BAR SERVICE
    // ─────────────────────────────────
    if (quote.beverages.total > 0) {
      checkPageBreak(80);
      sectionHeader('BAR SERVICE');

      const bevPkg = config.beverages.packages.find(p => p.id === cart.beverages.package);
      labelValue('Package', quote.beverages.packageName);
      labelValue('Duration', bevPkg?.duration || '4 hours');
      labelValue('Rate', `$${quote.beverages.pricePerPerson}/person × ${quote.catering.guestCount} guests`);

      if (bevPkg?.includes?.length) {
        y += 4;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
        doc.text('Package Includes:', marginL, y); y += 13;
        bevPkg.includes.forEach(item => { checkPageBreak(16); bulletLine(item); });
      }

      y += 4;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(marginL, y, contentW, 26, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text(`$${quote.beverages.pricePerPerson}/person  ×  ${quote.catering.guestCount} guests`, marginL + 12, y + 17);
      doc.setTextColor(...gold);
      doc.text(fmt(quote.beverages.total), marginL + contentW - 12, y + 17, { align: 'right' });
      y += 34;
    }

    // ─────────────────────────────────
    // SECTION 4 — SERVICE FEE
    // ─────────────────────────────────
    if (quote.serviceFee.amount > 0) {
      checkPageBreak(60);
      sectionHeader('SERVICE FEE');

      const foodBevTotal = quote.catering.total + quote.beverages.total;
      labelValue('Rate', '20% of all food & beverage services');
      labelValue('Applied to', `Catering + Bar Service = ${fmt(foodBevTotal)}`);
      labelValue('Calculation', `${fmt(foodBevTotal)} × 20%`);

      doc.setFillColor(248, 249, 250);
      doc.roundedRect(marginL, y + 4, contentW, 26, 4, 4, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark);
      doc.text('Service Fee Total', marginL + 12, y + 21);
      doc.setTextColor(...gold);
      doc.text(fmt(quote.serviceFee.amount), marginL + contentW - 12, y + 21, { align: 'right' });
      y += 40;
    }

    // ─────────────────────────────────
    // SECTION 5 — ADD-ON SERVICES
    // ─────────────────────────────────
    const hasAddOns = quote.addOns.floral.cost > 0 || quote.addOns.photography.selected ||
                      quote.addOns.weddingPlanner.selected || quote.addOns.dj.selected;

    if (hasAddOns) {
      checkPageBreak(60);
      sectionHeader('ADD-ON SERVICES');

      // Floral
      if (quote.addOns.floral.cost > 0) {
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
        doc.text('FLORAL PACKAGE', marginL, y); y += 13;
        const floralPkg = config.addOns.floral.packages.find(p => p.id === cart.addOns.floral);
        labelValue('Package', floralPkg?.name || '');
        if (floralPkg?.includes?.length) {
          floralPkg.includes.forEach(item => { checkPageBreak(14); bulletLine(item); });
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
        doc.text(fmt(quote.addOns.floral.cost), marginL + contentW, y - 2, { align: 'right' });
        y += 8; divider();
      }

      // Photography
      if (quote.addOns.photography.selected) {
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
        doc.text('PROFESSIONAL PHOTOGRAPHY', marginL, y); y += 13;
        const photoConfig = config.addOns.services.photography;
        photoConfig.includes.forEach(item => { checkPageBreak(14); bulletLine(item); });
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...mid);
        doc.text('Tax-exempt professional service', marginL + 12, y); y += 12;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
        doc.text(fmt(quote.addOns.photography.cost), marginL + contentW, y - 2, { align: 'right' });
        y += 6; divider();
      }

      // Wedding Planner
      if (quote.addOns.weddingPlanner.selected) {
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
        doc.text('WEDDING PLANNING & COORDINATION', marginL, y); y += 13;
        const plannerConfig = config.addOns.services.weddingPlanner;
        plannerConfig.includes.forEach(item => { checkPageBreak(14); bulletLine(item); });
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...mid);
        doc.text('Tax-exempt professional service', marginL + 12, y); y += 12;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
        doc.text(fmt(quote.addOns.weddingPlanner.cost), marginL + contentW, y - 2, { align: 'right' });
        y += 6; divider();
      }

      // DJ
      if (quote.addOns.dj.selected) {
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...dark);
        doc.text('DJ ENTERTAINMENT', marginL, y); y += 13;
        const djConfig = config.addOns.services.dj;
        djConfig.includes.forEach(item => { checkPageBreak(14); bulletLine(item); });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...gold);
        doc.text(fmt(quote.addOns.dj.cost), marginL + contentW, y - 2, { align: 'right' });
        y += 6; divider();
      }
    }

    // ─────────────────────────────────
    // SECTION 6 — FINANCIAL SUMMARY
    // ─────────────────────────────────
    checkPageBreak(180);
    sectionHeader('FINANCIAL SUMMARY');

    const subtotal = quote.totals.taxableSubtotal + quote.totals.nonTaxableSubtotal;

    // Summary table
    const summaryRows = [
      ['Venue Rental', fmt(quote.venue.cost), 'Non-taxable'],
    ];
    if (quote.catering.total > 0) summaryRows.push(['Catering (entrées, salad & dessert)', fmt(quote.catering.total), 'Taxable']);
    if (quote.catering.sides?.cost > 0) summaryRows.push([`Additional Sides (${quote.catering.sides.count} dish${quote.catering.sides.count !== 1 ? 'es' : ''})`, fmt(quote.catering.sides.cost), 'Taxable']);
    if (quote.catering.appetizers?.cost > 0) summaryRows.push([`Passed Appetizers (${quote.catering.appetizers.count})`, fmt(quote.catering.appetizers.cost), 'Taxable']);
    if (quote.beverages.total > 0) summaryRows.push([`Bar Service — ${quote.beverages.packageName}`, fmt(quote.beverages.total), 'Taxable']);
    if (quote.serviceFee.amount > 0) summaryRows.push(['Service Fee (20% on food & beverage)', fmt(quote.serviceFee.amount), 'Taxable']);
    if (quote.addOns.floral.cost > 0) summaryRows.push([`Floral — ${quote.addOns.floral.packageName}`, fmt(quote.addOns.floral.cost), 'Tax-exempt']);
    if (quote.addOns.photography.selected) summaryRows.push(['Professional Photography', fmt(quote.addOns.photography.cost), 'Tax-exempt']);
    if (quote.addOns.weddingPlanner.selected) {
      summaryRows.push(['Wedding Planning', fmt(quote.addOns.weddingPlanner.cost), 'Tax-exempt']);
    }
    if (quote.addOns.dj.selected) summaryRows.push(['DJ Entertainment', fmt(quote.addOns.dj.cost), 'Tax-exempt']);

    doc.autoTable({
      startY: y,
      head: [['Service', 'Amount', 'Tax Status']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: dark, textColor: gold, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: dark },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 90, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 80, fontSize: 8, textColor: mid }
      },
      margin: { left: marginL, right: marginR },
    });

    y = doc.lastAutoTable.finalY + 14;
    checkPageBreak(120);

    // Totals box
    const totBoxH = 18 * 3 + 30;
    doc.setFillColor(44, 62, 80);
    doc.roundedRect(marginL, y, contentW, totBoxH, 6, 6, 'F');

    let ty = y + 18;
    const totRow = (label, value, color = [220, 220, 220], size = 9) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
      doc.text(label, marginL + 14, ty);
      doc.text(value, marginL + contentW - 14, ty, { align: 'right' });
      ty += 18;
    };

    totRow('Taxable Subtotal', fmt(quote.totals.taxableSubtotal));
    totRow('Non-Taxable Subtotal', fmt(quote.totals.nonTaxableSubtotal));
    totRow(`Sales Tax  (${quote.tax.ratePercent} — ${quote.tax.jurisdiction || 'Nevada County, CA'})`, fmt(quote.totals.salesTax));

    // Gold divider inside dark box
    doc.setDrawColor(...gold); doc.setLineWidth(1);
    doc.line(marginL + 10, ty - 4, marginL + contentW - 10, ty - 4);
    ty += 8;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...gold);
    doc.text('ESTIMATED TOTAL', marginL + 14, ty);
    doc.text(fmt(quote.totals.grandTotal), marginL + contentW - 14, ty, { align: 'right' });

    y = ty + 20;
    y += 10;

    // ─────────────────────────────────
    // DISCLAIMER NOTE
    // ─────────────────────────────────
    checkPageBreak(50);
    doc.setFillColor(255, 252, 235);
    doc.roundedRect(marginL, y, contentW, 36, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...dark);
    doc.text('IMPORTANT NOTE', marginL + 10, y + 13);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...mid);
    doc.text('This is a preliminary estimate. Final pricing is subject to date availability, guest count confirmation, and signed contract.', marginL + 10, y + 25, { maxWidth: contentW - 20 });
    y += 46;

    // Footer on last page
    addFooter();

    doc.save(`StoneHouse-Wedding-Proposal-${quoteNumber}.pdf`);
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

    if (!expandBtn || !sidebar) return;

    const open = () => {
      sidebar.classList.add('mobile-expanded');
      expandBtn.innerHTML = '<i class="fas fa-times"></i> Close';
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      sidebar.classList.remove('mobile-expanded');
      expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> View Quote';
      document.body.style.overflow = '';
    };

    expandBtn.addEventListener('click', () => {
      sidebar.classList.contains('mobile-expanded') ? close() : open();
    });

    // X button inside the panel
    const closeBtn = document.getElementById('summary-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Tap backdrop (the sidebar itself outside content) to close
    sidebar.addEventListener('click', (e) => {
      if (e.target === sidebar) close();
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.weddingCart = new WeddingCart();
});
