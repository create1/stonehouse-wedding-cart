/**
 * Wedding Calculator - Node.js Version
 * For server-side price validation
 */

const WEDDING_PRICING_CONFIG = {
  venue: {
    seasons: {
      offPeak: { months: [1, 2] },
      shoulder: { months: [3, 4, 11] },
      peak: { months: [5, 6, 7, 8, 9, 10, 12] }
    },
    options: {
      fullBuilding: {
        pricing: {
          offPeak: { monThu: 900, friday: 950, saturday: 1000, sunday: 950 },
          shoulder: { monThu: 950, friday: 1000, saturday: 1100, sunday: 1000 },
          peak: { monThu: 1000, friday: 1100, saturday: 1200, sunday: 1100 }
        },
        minimumHours: 3,
        isFlat: false
      },
      premiumEventCap: {
        pricing: {
          offPeak: { monThu: 5000, friday: 6000, saturday: 7000, sunday: 6500 },
          shoulder: { monThu: 6500, friday: 8000, saturday: 9000, sunday: 8500 },
          peak: { monThu: 7500, friday: 9000, saturday: 10000, sunday: 9500 }
        },
        isFlat: true
      }
    }
  },
  catering: {
    proteins: [
      { id: 'vegetarian', pricePerPerson: 70 },
      { id: 'chicken', pricePerPerson: 80 },
      { id: 'fish', pricePerPerson: 90 },
      { id: 'steak', pricePerPerson: 100 }
    ]
  },
  beverages: {
    packages: [
      { id: 'beer-wine', pricePerPerson: 45 },
      { id: 'premium', pricePerPerson: 55 },
      { id: 'premium-liquor', pricePerPerson: 65 }
    ]
  },
  salesTax: {
    defaultRate: 0.0775,
    ratesByCity: {
      'grass-valley': { rate: 0.08875 },
      'nevada-city': { rate: 0.08875 },
      'truckee': { rate: 0.09000 },
      'unincorporated': { rate: 0.0775 }
    }
  }
};

class WeddingCalculator {
  constructor(venueCity = 'unincorporated') {
    this.venueCity = venueCity;
    this.taxRate = this.getTaxRate(venueCity);
  }

  getTaxRate(city) {
    const taxConfig = WEDDING_PRICING_CONFIG.salesTax;
    const cityKey = city?.toLowerCase().replace(/\s+/g, '-') || 'unincorporated';
    const cityTax = taxConfig.ratesByCity[cityKey];
    return cityTax ? cityTax.rate : taxConfig.defaultRate;
  }

  getSeasonForDate(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const seasons = WEDDING_PRICING_CONFIG.venue.seasons;
    
    for (const [key, season] of Object.entries(seasons)) {
      if (season.months.includes(month)) {
        return key;
      }
    }
    return 'shoulder';
  }

  getDayTier(date) {
    const d = new Date(date);
    const day = d.getDay();
    
    if (day === 6) return 'saturday';
    if (day === 5) return 'friday';
    if (day === 0) return 'sunday';
    return 'monThu';
  }

  calculateVenueCost(date, venueTypeId, hours = null) {
    const venueOption = WEDDING_PRICING_CONFIG.venue.options[venueTypeId];
    if (!venueOption) return 0;

    const season = this.getSeasonForDate(date);
    const dayTier = this.getDayTier(date);
    const rate = venueOption.pricing[season][dayTier];

    if (venueOption.isFlat) {
      return rate;
    }

    const duration = Math.max(hours || venueOption.minimumHours, venueOption.minimumHours);
    return rate * duration;
  }

  calculateAverageProteinPrice(protein1Id, protein2Id) {
    const proteins = WEDDING_PRICING_CONFIG.catering.proteins;
    const protein1 = proteins.find(p => p.id === protein1Id);
    const protein2 = proteins.find(p => p.id === protein2Id);

    if (!protein1 || !protein2) return 0;
    return (protein1.pricePerPerson + protein2.pricePerPerson) / 2;
  }

  calculateCompleteQuote(cart) {
    const venueCost = this.calculateVenueCost(cart.venue.date, cart.venue.type, cart.venue.hours);
    
    const avgProteinPrice = this.calculateAverageProteinPrice(cart.catering.protein1, cart.catering.protein2);
    const baseCatering = avgProteinPrice * cart.guestCount;
    const sidesCost = (cart.catering.sides?.length || 0) * 8 * cart.guestCount;
    const appetizersCost = (cart.catering.appetizers?.length || 0) * 6 * cart.guestCount;
    const cateringTotal = baseCatering + sidesCost + appetizersCost;

    let beverageTotal = 0;
    if (cart.beverages.package) {
      const bevPackage = WEDDING_PRICING_CONFIG.beverages.packages.find(p => p.id === cart.beverages.package);
      beverageTotal = bevPackage ? bevPackage.pricePerPerson * cart.guestCount : 0;
    }

    const serviceFee = (cateringTotal + beverageTotal) * 0.20;

    const floralCost = cart.addOns.floral ? [1500, 2500, 5000, 10000][['intimate', 'classic', 'elegant', 'luxury'].indexOf(cart.addOns.floral)] || 0 : 0;
    const photographyCost = cart.addOns.photography ? 3500 : 0;
    const djCost = cart.addOns.dj ? 2500 : 0;

    const isFullPackage = this.checkFullPackageEligibility(cart);
    const plannerCost = (cart.addOns.weddingPlanner && !isFullPackage) ? 2500 : 0;

    const taxableSubtotal = cateringTotal + beverageTotal + serviceFee + floralCost + djCost;
    const nonTaxableSubtotal = venueCost + photographyCost + plannerCost;
    const salesTaxAmount = Math.round(taxableSubtotal * this.taxRate * 100) / 100;
    const subtotalWithTax = taxableSubtotal + nonTaxableSubtotal + salesTaxAmount;
    const discountAmount = isFullPackage ? Math.round(subtotalWithTax * 0.10 * 100) / 100 : 0;
    const grandTotal = Math.round((subtotalWithTax - discountAmount) * 100) / 100;

    return {
      venue: { cost: venueCost, date: cart.venue.date, typeName: cart.venue.type },
      catering: { 
        total: cateringTotal, 
        avgProteinPrice,
        protein1Name: cart.catering.protein1,
        protein2Name: cart.catering.protein2,
        guestCount: cart.guestCount
      },
      beverages: { total: beverageTotal, packageName: cart.beverages.package },
      serviceFee: { amount: serviceFee },
      addOns: {
        floral: { cost: floralCost },
        photography: { cost: photographyCost },
        weddingPlanner: { cost: plannerCost, isFree: isFullPackage },
        dj: { cost: djCost },
        total: floralCost + photographyCost + plannerCost + djCost
      },
      tax: { rate: this.taxRate, ratePercent: (this.taxRate * 100).toFixed(3) + '%' },
      totals: {
        taxableSubtotal,
        nonTaxableSubtotal,
        salesTax: salesTaxAmount,
        discount: discountAmount,
        grandTotal
      },
      fullPackage: { 
        eligible: isFullPackage, 
        totalSavings: isFullPackage ? discountAmount + 2500 : 0 
      }
    };
  }

  checkFullPackageEligibility(cart) {
    if (cart.venue.type !== 'premiumEventCap') return false;
    if (!cart.catering.protein1 || !cart.catering.protein2) return false;
    if (!cart.beverages.package) return false;

    const addOnCount = [
      cart.addOns.floral,
      cart.addOns.photography,
      cart.addOns.dj
    ].filter(Boolean).length;

    return addOnCount >= 3;
  }
}

module.exports = WeddingCalculator;
