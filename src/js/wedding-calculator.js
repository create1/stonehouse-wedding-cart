/**
 * Wedding Quote Calculator
 * Handles all pricing calculations including tax for wedding packages
 * Nevada County, California
 */

import { WEDDING_PRICING_CONFIG, WeddingPricingHelpers } from './wedding-pricing-config.js';

export class WeddingCalculator {
  
  constructor(venueCity = 'unincorporated') {
    this.venueCity = venueCity;
    this.taxRate = this.getTaxRate(venueCity);
  }

  /**
   * Get tax rate based on venue city
   */
  getTaxRate(city) {
    const taxConfig = WEDDING_PRICING_CONFIG.salesTax;
    const cityKey = city?.toLowerCase().replace(/\s+/g, '-') || 'unincorporated';
    const cityTax = taxConfig.ratesByCity[cityKey];
    
    return cityTax ? cityTax.rate : taxConfig.defaultRate;
  }

  /**
   * Calculate venue rental cost
   */
  calculateVenueCost(date, venueTypeId, hours = null) {
    const venueOption = WEDDING_PRICING_CONFIG.venue.options[venueTypeId];
    if (!venueOption) return 0;

    const rate = WeddingPricingHelpers.getVenueRate(date, venueTypeId);
    if (!rate) return 0;

    // Premium Event Cap is flat rate
    if (venueOption.isFlat) {
      return rate;
    }

    // Hourly rentals
    const duration = Math.max(hours || venueOption.minimumHours, venueOption.minimumHours);
    return rate * duration;
  }

  /**
   * Calculate average protein price from 2 selections
   */
  calculateAverageProteinPrice(protein1Id, protein2Id) {
    const proteins = WEDDING_PRICING_CONFIG.catering.proteins;
    const protein1 = proteins.find(p => p.id === protein1Id);
    const protein2 = proteins.find(p => p.id === protein2Id);

    if (!protein1 && !protein2) return 0;

    // If outside catering is selected, return 0 (flat fee handled separately)
    if (protein1Id === 'outside' || protein2Id === 'outside') return 0;

    // If only one protein selected
    if (!protein2) return protein1?.pricePerPerson || 0;
    if (!protein1) return protein2?.pricePerPerson || 0;

    // If two proteins selected, return average
    return (protein1.pricePerPerson + protein2.pricePerPerson) / 2;
  }

  /**
   * Calculate catering total
   */
  calculateCateringTotal(guestCount, protein1Id, protein2Id, selectedSides = [], selectedAppetizers = []) {
    // Check if outside catering is selected
    if (protein1Id === 'outside' || protein2Id === 'outside') {
      return {
        avgProteinPrice: 0,
        baseCatering: WEDDING_PRICING_CONFIG.catering.outsideCateringFee,
        sidesCount: 0,
        sidesCost: 0,
        appetizersCount: 0,
        appetizersCost: 0,
        total: WEDDING_PRICING_CONFIG.catering.outsideCateringFee,
        isOutsideCatering: true
      };
    }

    const avgProteinPrice = this.calculateAverageProteinPrice(protein1Id, protein2Id);
    const baseCatering = avgProteinPrice * guestCount;
    
    const sidesConfig = WEDDING_PRICING_CONFIG.catering.sides;
    const sidesTotal = selectedSides.length * sidesConfig.pricePerPerson * guestCount;
    
    const appetizersConfig = WEDDING_PRICING_CONFIG.catering.appetizers;
    const appetizersTotal = selectedAppetizers.length * appetizersConfig.pricePerPerson * guestCount;

    return {
      avgProteinPrice,
      baseCatering,
      sidesCount: selectedSides.length,
      sidesCost: sidesTotal,
      appetizersCount: selectedAppetizers.length,
      appetizersCost: appetizersTotal,
      total: baseCatering + sidesTotal + appetizersTotal
    };
  }

  /**
   * Calculate beverage total
   */
  calculateBeverageTotal(guestCount, packageId) {
    if (!packageId) return 0;

    const bevPackage = WEDDING_PRICING_CONFIG.beverages.packages.find(p => p.id === packageId);
    if (!bevPackage) return 0;

    return bevPackage.pricePerPerson * guestCount;
  }

  /**
   * Calculate service fee (20% on food and beverage)
   */
  calculateServiceFee(cateringTotal, beverageTotal) {
    const feeConfig = WEDDING_PRICING_CONFIG.fees.serviceFee;
    return (cateringTotal + beverageTotal) * feeConfig.rate;
  }

  /**
   * Check if cart qualifies for full package discount
   */
  checkFullPackageEligibility(cart) {
    const requirements = WEDDING_PRICING_CONFIG.fullPackage.requirements;

    // Must have Premium Event Cap
    if (cart.venue.type !== requirements.venueType) return false;

    // Must have catering (2 proteins)
    if (!cart.catering.protein1 || !cart.catering.protein2) return false;

    // Must have beverage package
    if (!cart.beverages.package) return false;

    // Must have at least 3 valid add-ons
    const addOnCount = requirements.validAddOns.filter(addOnKey => {
      if (addOnKey === 'floral') return cart.addOns.floral !== null;
      if (addOnKey === 'photography') return cart.addOns.photography === true;
      if (addOnKey === 'dj') return cart.addOns.dj === true;
      return false;
    }).length;

    return addOnCount >= requirements.minimumAddOns;
  }

  /**
   * Calculate complete wedding quote with all fees and taxes
   */
  calculateCompleteQuote(cart) {
    // === VENUE ===
    const venueCost = this.calculateVenueCost(
      cart.venue.date,
      cart.venue.type,
      cart.venue.hours
    );

    // === CATERING ===
    const catering = this.calculateCateringTotal(
      cart.guestCount,
      cart.catering.protein1,
      cart.catering.protein2,
      cart.catering.sides || [],
      cart.catering.appetizers || []
    );

    // === BEVERAGES ===
    const beverageTotal = this.calculateBeverageTotal(
      cart.guestCount,
      cart.beverages.package
    );

    // === SERVICE FEE ===
    const serviceFee = this.calculateServiceFee(catering.total, beverageTotal);

    // === ADD-ONS ===
    const floralCost = cart.addOns.floral 
      ? WEDDING_PRICING_CONFIG.addOns.floral.packages.find(p => p.id === cart.addOns.floral)?.price || 0
      : 0;

    const photographyCost = cart.addOns.photography ? 3500 : 0;
    const djCost = cart.addOns.dj ? 2500 : 0;

    // Check if full package eligible
    const isFullPackage = this.checkFullPackageEligibility(cart);
    
    // Wedding planner is free with full package
    const plannerCost = (cart.addOns.weddingPlanner && !isFullPackage) ? 2500 : 0;

    // === TAX CALCULATION ===
    const taxableSubtotal = 
      catering.total +
      beverageTotal +
      serviceFee +
      floralCost +
      djCost;

    const nonTaxableSubtotal = venueCost + photographyCost + plannerCost;

    const salesTaxAmount = WeddingPricingHelpers.roundMoney(taxableSubtotal * this.taxRate);

    // === SUBTOTAL WITH TAX ===
    const subtotalWithTax = taxableSubtotal + nonTaxableSubtotal + salesTaxAmount;

    // === FULL PACKAGE DISCOUNT ===
    const discountAmount = isFullPackage 
      ? WeddingPricingHelpers.roundMoney(subtotalWithTax * WEDDING_PRICING_CONFIG.fullPackage.discountRate)
      : 0;

    // === GRAND TOTAL ===
    const grandTotal = WeddingPricingHelpers.roundMoney(subtotalWithTax - discountAmount);

    // === RETURN COMPLETE BREAKDOWN ===
    return {
      venue: {
        type: cart.venue.type,
        typeName: WEDDING_PRICING_CONFIG.venue.options[cart.venue.type]?.name,
        date: cart.venue.date,
        hours: cart.venue.hours,
        season: WeddingPricingHelpers.getSeasonForDate(cart.venue.date),
        cost: venueCost,
        taxable: true
      },

      catering: {
        guestCount: cart.guestCount,
        protein1: cart.catering.protein1,
        protein2: cart.catering.protein2,
        protein1Name: WEDDING_PRICING_CONFIG.catering.proteins.find(p => p.id === cart.catering.protein1)?.name,
        protein2Name: WEDDING_PRICING_CONFIG.catering.proteins.find(p => p.id === cart.catering.protein2)?.name,
        protein1Price: WEDDING_PRICING_CONFIG.catering.proteins.find(p => p.id === cart.catering.protein1)?.pricePerPerson,
        protein2Price: WEDDING_PRICING_CONFIG.catering.proteins.find(p => p.id === cart.catering.protein2)?.pricePerPerson,
        avgProteinPrice: catering.avgProteinPrice,
        baseCost: catering.baseCatering,
        sides: {
          count: catering.sidesCount,
          selections: cart.catering.sides || [],
          cost: catering.sidesCost
        },
        appetizers: {
          count: catering.appetizersCount,
          selections: cart.catering.appetizers || [],
          cost: catering.appetizersCost
        },
        total: catering.total,
        includesSaladAndDessert: true,
        taxable: true
      },

      beverages: {
        package: cart.beverages.package,
        packageName: WEDDING_PRICING_CONFIG.beverages.packages.find(p => p.id === cart.beverages.package)?.name,
        pricePerPerson: cart.beverages.package 
          ? WEDDING_PRICING_CONFIG.beverages.packages.find(p => p.id === cart.beverages.package)?.pricePerPerson
          : 0,
        total: beverageTotal,
        taxable: true
      },

      serviceFee: {
        rate: '20%',
        appliedTo: catering.total + beverageTotal,
        amount: serviceFee,
        taxable: true
      },

      addOns: {
        floral: {
          package: cart.addOns.floral,
          packageName: cart.addOns.floral 
            ? WEDDING_PRICING_CONFIG.addOns.floral.packages.find(p => p.id === cart.addOns.floral)?.name
            : null,
          cost: floralCost,
          taxable: true
        },
        photography: {
          selected: cart.addOns.photography,
          cost: photographyCost,
          taxable: false
        },
        weddingPlanner: {
          selected: cart.addOns.weddingPlanner,
          cost: plannerCost,
          isFree: isFullPackage,
          taxable: false
        },
        dj: {
          selected: cart.addOns.dj,
          cost: djCost,
          taxable: true
        },
        total: floralCost + photographyCost + plannerCost + djCost
      },

      tax: {
        taxableSubtotal,
        nonTaxableSubtotal,
        rate: this.taxRate,
        ratePercent: (this.taxRate * 100).toFixed(3) + '%',
        jurisdiction: this.venueCity,
        amount: salesTaxAmount
      },

      fullPackage: {
        eligible: isFullPackage,
        discountRate: '10%',
        discountAmount: discountAmount,
        freePlannerValue: isFullPackage ? 2500 : 0,
        totalSavings: isFullPackage ? discountAmount + 2500 : 0
      },

      totals: {
        venueTotal: venueCost,
        foodBeverageSubtotal: catering.total + beverageTotal,
        foodBeverageWithFee: catering.total + beverageTotal + serviceFee,
        addOnsSubtotal: floralCost + photographyCost + plannerCost + djCost,
        taxableSubtotal,
        nonTaxableSubtotal,
        salesTax: salesTaxAmount,
        subtotalWithTax,
        discount: discountAmount,
        grandTotal
      },

      // Formatted for display
      formatted: {
        venue: WeddingPricingHelpers.formatCurrency(venueCost),
        catering: WeddingPricingHelpers.formatCurrency(catering.total),
        beverages: WeddingPricingHelpers.formatCurrency(beverageTotal),
        serviceFee: WeddingPricingHelpers.formatCurrency(serviceFee),
        addOns: WeddingPricingHelpers.formatCurrency(floralCost + photographyCost + plannerCost + djCost),
        salesTax: WeddingPricingHelpers.formatCurrency(salesTaxAmount),
        discount: WeddingPricingHelpers.formatCurrency(discountAmount),
        grandTotal: WeddingPricingHelpers.formatCurrency(grandTotal)
      }
    };
  }

  /**
   * Generate itemized breakdown for display
   */
  generateItemizedBreakdown(quote) {
    const items = [];

    // Venue
    items.push({
      category: 'Venue Rental',
      description: `${quote.venue.typeName} - ${quote.venue.season.name} ${WeddingPricingHelpers.getDayTier(quote.venue.date)}`,
      amount: quote.venue.cost,
      taxable: true,
      formatted: WeddingPricingHelpers.formatCurrency(quote.venue.cost)
    });

    // Catering base
    items.push({
      category: 'Catering',
      description: `${quote.catering.protein1Name} ($${quote.catering.protein1Price}) + ${quote.catering.protein2Name} ($${quote.catering.protein2Price})`,
      subdescription: `Average $${quote.catering.avgProteinPrice}/person × ${quote.catering.guestCount} guests (includes salad & dessert)`,
      amount: quote.catering.baseCost,
      taxable: true,
      formatted: WeddingPricingHelpers.formatCurrency(quote.catering.baseCost)
    });

    // Sides
    if (quote.catering.sides.count > 0) {
      items.push({
        category: 'Additional Sides',
        description: `${quote.catering.sides.count} selections × $8/person × ${quote.catering.guestCount} guests`,
        amount: quote.catering.sides.cost,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.catering.sides.cost)
      });
    }

    // Appetizers
    if (quote.catering.appetizers.count > 0) {
      items.push({
        category: 'Passed Appetizers',
        description: `${quote.catering.appetizers.count} selections × $6/person × ${quote.catering.guestCount} guests`,
        amount: quote.catering.appetizers.cost,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.catering.appetizers.cost)
      });
    }

    // Beverages
    if (quote.beverages.total > 0) {
      items.push({
        category: 'Beverages',
        description: `${quote.beverages.packageName} - $${quote.beverages.pricePerPerson}/person × ${quote.catering.guestCount} guests`,
        amount: quote.beverages.total,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.beverages.total)
      });
    }

    // Service Fee
    if (quote.serviceFee.amount > 0) {
      items.push({
        category: 'Service Fee',
        description: `20% on food & beverage ($${WeddingPricingHelpers.formatCurrency(quote.serviceFee.appliedTo)})`,
        amount: quote.serviceFee.amount,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.serviceFee.amount)
      });
    }

    // Floral
    if (quote.addOns.floral.cost > 0) {
      items.push({
        category: 'Floral Package',
        description: quote.addOns.floral.packageName,
        amount: quote.addOns.floral.cost,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.addOns.floral.cost)
      });
    }

    // Photography
    if (quote.addOns.photography.selected) {
      items.push({
        category: 'Photography',
        description: 'Professional photography service (tax-exempt)',
        amount: quote.addOns.photography.cost,
        taxable: false,
        formatted: WeddingPricingHelpers.formatCurrency(quote.addOns.photography.cost)
      });
    }

    // Wedding Planner
    if (quote.addOns.weddingPlanner.selected) {
      items.push({
        category: 'Wedding Planning',
        description: quote.addOns.weddingPlanner.isFree 
          ? 'Day-of coordination (FREE with Full Package)' 
          : 'Day-of coordination (tax-exempt)',
        amount: quote.addOns.weddingPlanner.cost,
        taxable: false,
        isFree: quote.addOns.weddingPlanner.isFree,
        formatted: quote.addOns.weddingPlanner.isFree 
          ? 'FREE' 
          : WeddingPricingHelpers.formatCurrency(quote.addOns.weddingPlanner.cost)
      });
    }

    // DJ
    if (quote.addOns.dj.selected) {
      items.push({
        category: 'DJ Service',
        description: 'Professional DJ and sound system',
        amount: quote.addOns.dj.cost,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.addOns.dj.cost)
      });
    }

    return items;
  }

  /**
   * Validate cart before calculation
   */
  validateCart(cart) {
    const errors = [];

    // Validate date
    if (!cart.venue.date || !(cart.venue.date instanceof Date)) {
      errors.push('Please select a wedding date');
    } else {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + WEDDING_PRICING_CONFIG.constraints.advanceBooking.minimumDays);
      
      if (cart.venue.date < minDate) {
        errors.push(WEDDING_PRICING_CONFIG.constraints.advanceBooking.message);
      }
    }

    // Validate guest count
    const guestConstraints = WEDDING_PRICING_CONFIG.constraints.guestCount;
    if (!cart.guestCount || cart.guestCount < guestConstraints.minimum) {
      errors.push(`Guest count must be at least ${guestConstraints.minimum}`);
    }
    if (cart.guestCount > guestConstraints.maximum) {
      errors.push(`Guest count cannot exceed ${guestConstraints.maximum}`);
    }

    // Validate venue selection
    if (!cart.venue.type) {
      errors.push('Please select a venue option');
    }

    // Validate protein selection (must select exactly 2)
    if (!cart.catering.protein1 || !cart.catering.protein2) {
      errors.push('Please select exactly 2 protein options for catering');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get pricing summary for display
   */
  getPricingSummary(quote) {
    return {
      venue: quote.totals.venueTotal,
      catering: quote.catering.total,
      beverages: quote.beverages.total,
      serviceFee: quote.serviceFee.amount,
      addOns: quote.addOns.total,
      subtotal: quote.totals.taxableSubtotal + quote.totals.nonTaxableSubtotal,
      salesTax: quote.totals.salesTax,
      discount: quote.totals.discount,
      total: quote.totals.grandTotal,
      
      // Formatted
      formatted: {
        venue: WeddingPricingHelpers.formatCurrency(quote.totals.venueTotal),
        catering: WeddingPricingHelpers.formatCurrency(quote.catering.total),
        beverages: WeddingPricingHelpers.formatCurrency(quote.beverages.total),
        serviceFee: WeddingPricingHelpers.formatCurrency(quote.serviceFee.amount),
        addOns: WeddingPricingHelpers.formatCurrency(quote.addOns.total),
        subtotal: WeddingPricingHelpers.formatCurrency(quote.totals.taxableSubtotal + quote.totals.nonTaxableSubtotal),
        salesTax: WeddingPricingHelpers.formatCurrency(quote.totals.salesTax),
        discount: WeddingPricingHelpers.formatCurrency(quote.totals.discount),
        total: WeddingPricingHelpers.formatCurrency(quote.totals.grandTotal)
      }
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WeddingCalculator = WeddingCalculator;
}
