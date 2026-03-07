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
  calculateCateringTotal(guestCount, protein1Id, protein2Id, sidesQty = 0, appetizersQty = 0, serviceStyle = 'buffet', includeDessert = false) {
    // Check if outside catering is selected
    if (protein1Id === 'outside' || protein2Id === 'outside') {
      return {
        avgProteinPrice: 0,
        baseCatering: WEDDING_PRICING_CONFIG.catering.outsideCateringFee,
        sidesCount: 0,
        sidesCost: 0,
        appetizersCount: 0,
        appetizersCost: 0,
        serviceStyleName: 'N/A',
        serviceStyleUpcharge: 0,
        dessertCost: 0,
        total: WEDDING_PRICING_CONFIG.catering.outsideCateringFee,
        isOutsideCatering: true
      };
    }

    const avgProteinPrice = this.calculateAverageProteinPrice(protein1Id, protein2Id);

    // Service style upcharge per person
    const styleConfig = WEDDING_PRICING_CONFIG.catering.serviceStyles?.find(s => s.id === serviceStyle);
    const styleUpcharge = styleConfig?.upcharge || 0;
    const effectivePrice = avgProteinPrice + styleUpcharge;

    const baseCatering = effectivePrice * guestCount;

    const sidesTotal = sidesQty * WEDDING_PRICING_CONFIG.catering.sides.pricePerPerson * guestCount;
    const appetizersTotal = appetizersQty * WEDDING_PRICING_CONFIG.catering.appetizers.pricePerPerson * guestCount;

    // Optional dessert
    const dessertPrice = WEDDING_PRICING_CONFIG.catering.dessert?.pricePerPerson || 12;
    const dessertCost = includeDessert ? dessertPrice * guestCount : 0;

    return {
      avgProteinPrice,
      styleUpcharge,
      effectivePrice,
      serviceStyleName: styleConfig?.name || 'Buffet',
      baseCatering,
      sidesCount: sidesQty,
      sidesCost: sidesTotal,
      appetizersCount: appetizersQty,
      appetizersCost: appetizersTotal,
      dessertCost,
      total: baseCatering + sidesTotal + appetizersTotal + dessertCost
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
      cart.catering.sidesQty || 0,
      cart.catering.appetizersQty || 0,
      cart.catering.serviceStyle || 'buffet',
      cart.catering.dessert || false
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

    const photographyCost = cart.addOns.photography ? 2000 : 0;
    const djCost = cart.addOns.dj ? 2500 : 0;

    const plannerCost = cart.addOns.weddingPlanner ? 2500 : 0;

    // === TAX CALCULATION ===
    // Only food & beverage (including service fee) are taxable; all add-ons are tax-free
    const taxableSubtotal =
      catering.total +
      beverageTotal +
      serviceFee;

    const nonTaxableSubtotal = venueCost + floralCost + djCost + photographyCost + plannerCost;

    const salesTaxAmount = WeddingPricingHelpers.roundMoney(taxableSubtotal * this.taxRate);

    // === GRAND TOTAL ===
    const subtotalWithTax = taxableSubtotal + nonTaxableSubtotal + salesTaxAmount;
    const grandTotal = WeddingPricingHelpers.roundMoney(subtotalWithTax);

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
          cost: catering.sidesCost
        },
        appetizers: {
          count: catering.appetizersCount,
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
          taxable: false
        },
        photography: {
          selected: cart.addOns.photography,
          cost: photographyCost,
          taxable: false
        },
        weddingPlanner: {
          selected: cart.addOns.weddingPlanner,
          cost: plannerCost,
          taxable: false
        },
        dj: {
          selected: cart.addOns.dj,
          cost: djCost,
          taxable: false
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

      totals: {
        venueTotal: venueCost,
        foodBeverageSubtotal: catering.total + beverageTotal,
        foodBeverageWithFee: catering.total + beverageTotal + serviceFee,
        addOnsSubtotal: floralCost + photographyCost + plannerCost + djCost,
        taxableSubtotal,
        nonTaxableSubtotal,
        salesTax: salesTaxAmount,
        subtotalWithTax,
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
        description: `${quote.catering.sides.count} side dish${quote.catering.sides.count !== 1 ? 'es' : ''} × $5/person × ${quote.catering.guestCount} guests`,
        amount: quote.catering.sides.cost,
        taxable: true,
        formatted: WeddingPricingHelpers.formatCurrency(quote.catering.sides.cost)
      });
    }

    // Appetizers
    if (quote.catering.appetizers.count > 0) {
      items.push({
        category: 'Passed Appetizers',
        description: `${quote.catering.appetizers.count} passed appetizer${quote.catering.appetizers.count !== 1 ? 's' : ''} × $5/person × ${quote.catering.guestCount} guests`,
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
        taxable: false,
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
        taxable: false,
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
      total: quote.totals.grandTotal,
      formatted: {
        venue: WeddingPricingHelpers.formatCurrency(quote.totals.venueTotal),
        catering: WeddingPricingHelpers.formatCurrency(quote.catering.total),
        beverages: WeddingPricingHelpers.formatCurrency(quote.beverages.total),
        serviceFee: WeddingPricingHelpers.formatCurrency(quote.serviceFee.amount),
        addOns: WeddingPricingHelpers.formatCurrency(quote.addOns.total),
        subtotal: WeddingPricingHelpers.formatCurrency(quote.totals.taxableSubtotal + quote.totals.nonTaxableSubtotal),
        salesTax: WeddingPricingHelpers.formatCurrency(quote.totals.salesTax),
        total: WeddingPricingHelpers.formatCurrency(quote.totals.grandTotal)
      }
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.WeddingCalculator = WeddingCalculator;
}
