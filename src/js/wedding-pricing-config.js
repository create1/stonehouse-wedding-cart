/**
 * Wedding Pricing Configuration
 * Stone House Venue - Nevada County, California
 * All prices and options for the wedding shopping cart
 */

export const WEDDING_PRICING_CONFIG = {
  
  // ===================================
  // VENUE PRICING
  // ===================================
  venue: {
    // Seasonal month classifications
    seasons: {
      offPeak: {
        name: 'Off-Peak',
        months: [1, 2], // January, February
        color: '#5DADE2',
        description: 'January - February'
      },
      shoulder: {
        name: 'Shoulder',
        months: [3, 4, 11], // March, April, November
        color: '#E67E22',
        description: 'March - April, November'
      },
      peak: {
        name: 'Peak',
        months: [5, 6, 7, 8, 9, 10, 12], // May-Oct, December
        color: '#F39C12',
        description: 'May - October, December'
      }
    },

    // Venue rental options with pricing by season and day
    options: {
      fullBuilding: {
        id: 'fullBuilding',
        name: 'Full Building',
        description: 'Hourly rental, 3-hour minimum',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 300,
        pricing: {
          offPeak: { monThu: 900, friday: 950, saturday: 1000, sunday: 950 },
          shoulder: { monThu: 950, friday: 1000, saturday: 1100, sunday: 1000 },
          peak: { monThu: 1000, friday: 1100, saturday: 1200, sunday: 1100 }
        }
      },
      premiumEventCap: {
        id: 'premiumEventCap',
        name: 'Premium Event Cap',
        description: 'All-day access, full building',
        isFlat: true,
        capacity: 300,
        pricing: {
          offPeak: { monThu: 5000, friday: 6000, saturday: 7000, sunday: 6500 },
          shoulder: { monThu: 6500, friday: 8000, saturday: 9000, sunday: 8500 },
          peak: { monThu: 7500, friday: 9000, saturday: 10000, sunday: 9500 }
        }
      }
    }
  },

  // ===================================
  // CATERING PRICING
  // ===================================
  catering: {
    includesSaladAndDessert: true,
    mustSelectTwo: false,
    minProteins: 1,
    maxProteins: 2,
    allowOutsideCatering: true,
    outsideCateringFee: 1000,
    
    proteins: [
      {
        id: 'vegetarian',
        name: 'Vegetarian',
        pricePerPerson: 70,
        description: 'Seasonal vegetable entrée',
        examples: ['Eggplant Parmesan', 'Vegetable Lasagna', 'Stuffed Portobello'],
        image: '../src/images/food/vegan-entree.avif'
      },
      {
        id: 'chicken',
        name: 'Chicken',
        pricePerPerson: 80,
        description: 'Expertly prepared chicken',
        examples: ['Herb Roasted Chicken', 'Chicken Marsala', 'Chicken Piccata'],
        image: '../src/images/food/Food1.avif'
      },
      {
        id: 'fish',
        name: 'Fish',
        pricePerPerson: 90,
        description: 'Fresh fish selection',
        examples: ['Pan-Seared Salmon', 'Grilled Sea Bass', 'Herb-Crusted Tilapia'],
        image: '../src/images/food/fish-plate.avif'
      },
      {
        id: 'steak',
        name: 'Steak',
        pricePerPerson: 100,
        description: 'Premium steak',
        examples: ['Filet Mignon', 'Ribeye', 'NY Strip'],
        image: '../src/images/food/steak-dish.avif'
      },
      {
        id: 'outside',
        name: 'Outside Catering',
        price: 1000,
        isFlat: true,
        description: 'Approved vendors only',
        note: 'Bring your own approved caterer. $1,000 fee includes kitchen access and coordination.',
        image: null
      }
    ],

    sides: {
      pricePerPerson: 8,
      description: 'Additional side dishes',
      options: [
        { id: 'roasted-veg', name: 'Roasted Seasonal Vegetables', image: null },
        { id: 'garlic-mashed', name: 'Garlic Mashed Potatoes', image: null },
        { id: 'rice-pilaf', name: 'Rice Pilaf', image: null },
        { id: 'mac-cheese', name: 'Truffle Mac & Cheese', image: null },
        { id: 'asparagus', name: 'Grilled Asparagus', image: null },
        { id: 'sweet-potato', name: 'Roasted Sweet Potatoes', image: null }
      ]
    },

    appetizers: {
      pricePerPerson: 6,
      description: 'Passed appetizers during cocktail hour',
      options: [
        { id: 'bruschetta', name: 'Bruschetta', image: null },
        { id: 'spring-rolls', name: 'Vegetable Spring Rolls', image: null },
        { id: 'meatballs', name: 'Italian Meatballs', image: null },
        { id: 'shrimp', name: 'Shrimp Cocktail', image: null },
        { id: 'sliders', name: 'Mini Sliders', image: null },
        { id: 'caprese', name: 'Caprese Skewers', image: null },
        { id: 'stuffed-mushrooms', name: 'Stuffed Mushrooms', image: null },
        { id: 'crostini', name: 'Crostini Assortment', image: null }
      ]
    }
  },

  // ===================================
  // BEVERAGE PACKAGES
  // ===================================
  beverages: {
    packages: [
      {
        id: 'beer-wine',
        name: 'Beer & Wine Package',
        pricePerPerson: 45,
        duration: '4 hours',
        includes: [
          'Domestic and imported beer selection',
          'Red and white wine selection',
          '4-hour bar service',
          'Professional bartender'
        ],
        image: '../src/images/beverage/Beverage.avif'
      },
      {
        id: 'premium',
        name: 'Premium Beer, Wine & Liquor',
        pricePerPerson: 55,
        duration: '4 hours',
        includes: [
          'Premium beer selection',
          'Premium wine selection',
          'Full liquor bar (well brands)',
          '4-hour bar service',
          'Professional bartender'
        ],
        image: '../src/images/beverage/BeverageCatering.avif'
      },
      {
        id: 'premium-liquor',
        name: 'Premium Liquor Package',
        pricePerPerson: 65,
        duration: '5 hours',
        includes: [
          'Premium craft beer selection',
          'Premium wine selection',
          'Top-shelf liquor brands',
          '5-hour bar service',
          'Professional bartenders (2)'
        ],
        image: '../src/images/beverage/BeverageCatering2.avif'
      }
    ]
  },

  // ===================================
  // ADD-ON SERVICES
  // ===================================
  addOns: {
    floral: {
      packages: [
        {
          id: 'intimate',
          name: 'Intimate Package',
          price: 1500,
          includes: [
            'Bridal bouquet',
            '4 bridesmaid bouquets',
            '5 boutonnieres',
            'Centerpieces for up to 10 tables'
          ]
        },
        {
          id: 'classic',
          name: 'Classic Package',
          price: 2500,
          image: '../src/images/floral/classic-wedding-floral.png',
          includes: [
            'Everything in Intimate package',
            'Ceremony arch/backdrop flowers',
            'Cocktail area arrangements',
            'Centerpieces for up to 15 tables'
          ]
        },
        {
          id: 'elegant',
          name: 'Elegant Package',
          price: 5000,
          includes: [
            'Everything in Classic package',
            'Premium flower varieties',
            'Large ceremony installations',
            'Head table arrangements',
            'Centerpieces for up to 25 tables',
            'Escort card display arrangement'
          ]
        },
        {
          id: 'luxury',
          name: 'Luxury Package',
          price: 10000,
          includes: [
            'Everything in Elegant package',
            'Premium imported flowers',
            'Multiple ceremony installations',
            'Elaborate room transformations',
            'Ceiling installations/chandeliers',
            'Custom floral design consultation'
          ]
        }
      ]
    },

    services: {
      photography: {
        id: 'photography',
        name: 'Professional Photography',
        price: 3500,
        taxable: false, // Professional service
        includes: [
          '8 hours of coverage',
          '2 professional photographers',
          '500+ edited images',
          'Online gallery for sharing',
          'Print release'
        ]
      },
      weddingPlanner: {
        id: 'weddingPlanner',
        name: 'Wedding Planning Service',
        price: 2500,
        taxable: false, // Professional service
        freeWithFullPackage: true,
        includes: [
          'Day-of coordination',
          'Timeline creation',
          'Vendor management',
          'Setup supervision',
          'Guest assistance'
        ]
      },
      dj: {
        id: 'dj',
        name: 'DJ Entertainment',
        price: 2500,
        taxable: true, // Equipment rental
        includes: [
          '5 hours of service',
          'Professional sound system',
          'Wireless microphones (2)',
          'Dance floor lighting',
          'Music consultation'
        ]
      }
    }
  },

  // ===================================
  // FEES & DISCOUNTS
  // ===================================
  fees: {
    serviceFee: {
      rate: 0.20, // 20%
      description: 'Service fee on food and beverage',
      appliesTo: ['catering', 'beverages'],
      taxable: true
    }
  },

  // ===================================
  // SALES TAX - NEVADA COUNTY, CA
  // ===================================
  salesTax: {
    defaultRate: 0.0775, // 7.75% unincorporated Nevada County
    jurisdiction: 'Nevada County, California',
    
    ratesByCity: {
      'grass-valley': {
        rate: 0.08875,
        name: 'Grass Valley',
        breakdown: { state: 0.06, county: 0.0025, local: 0.02625 }
      },
      'nevada-city': {
        rate: 0.08875,
        name: 'Nevada City',
        breakdown: { state: 0.06, county: 0.0025, local: 0.02625 }
      },
      'truckee': {
        rate: 0.09000,
        name: 'Truckee',
        breakdown: { state: 0.06, county: 0.0025, local: 0.0275 }
      },
      'unincorporated': {
        rate: 0.0775,
        name: 'Unincorporated Nevada County',
        breakdown: { state: 0.06, county: 0.0025, local: 0.015 }
      }
    },

    // What is taxable vs non-taxable per California law
    taxableCategories: [
      'catering',
      'beverages',
      'serviceFee',
      'floral',
      'dj'
    ],

    nonTaxableCategories: [
      'venue',
      'photography',
      'weddingPlanner'
    ]
  },

  // ===================================
  // FULL PACKAGE DISCOUNT
  // ===================================
  fullPackage: {
    discountRate: 0.10, // 10% off
    description: 'Save 10% on your complete wedding package',
    
    requirements: {
      venueType: 'premiumEventCap',
      mustHaveCatering: true,
      mustHaveBeverage: true,
      minimumAddOns: 3,
      validAddOns: ['floral', 'photography', 'dj']
    },
    
    benefits: {
      freeWeddingPlanner: true,
      discountLabel: '10% Full Package Discount',
      savingsMessage: "You're saving with our Full Package!"
    }
  },

  // ===================================
  // BOOKING CONSTRAINTS
  // ===================================
  constraints: {
    guestCount: {
      minimum: 20,
      maximum: 150,
      default: 100,
      step: 5,
      largeEventMessage: 'For weddings with more than 150 guests, please contact us for a custom quote.',
      largeEventContact: 'bookings@stonehouse.io',
      recommendations: {
        fullBuilding: { min: 50, max: 150, ideal: 100 },
        premiumEventCap: { min: 100, max: 150, ideal: 125 }
      }
    },
    
    advanceBooking: {
      minimumDays: 90,
      maximumDays: 730,
      message: 'Weddings must be booked at least 90 days in advance'
    },
    
    duration: {
      minimum: 3,
      maximum: 12,
      default: 5,
      step: 1,
      note: 'Only applies to hourly venue rentals'
    }
  }
};

// Helper functions for accessing configuration
export const WeddingPricingHelpers = {
  
  /**
   * Get season for a given date
   */
  getSeasonForDate(date) {
    const month = date.getMonth() + 1; // 1-12
    const seasons = WEDDING_PRICING_CONFIG.venue.seasons;
    
    for (const [key, season] of Object.entries(seasons)) {
      if (season.months.includes(month)) {
        return { key, ...season };
      }
    }
    
    return { key: 'shoulder', ...seasons.shoulder };
  },

  /**
   * Get day tier (monThu, friday, saturday, sunday)
   */
  getDayTier(date) {
    const day = date.getDay(); // 0=Sunday, 6=Saturday
    
    if (day === 6) return 'saturday';
    if (day === 5) return 'friday';
    if (day === 0) return 'sunday';
    return 'monThu'; // Monday-Thursday
  },

  /**
   * Get venue rate for specific date and venue type
   */
  getVenueRate(date, venueTypeId) {
    const season = this.getSeasonForDate(date);
    const dayTier = this.getDayTier(date);
    const venueOption = WEDDING_PRICING_CONFIG.venue.options[venueTypeId];
    
    if (!venueOption) return null;
    
    return venueOption.pricing[season.key][dayTier];
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Round to 2 decimal places
   */
  roundMoney(amount) {
    return Math.round(amount * 100) / 100;
  }
};

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.WEDDING_PRICING_CONFIG = WEDDING_PRICING_CONFIG;
  window.WeddingPricingHelpers = WeddingPricingHelpers;
}
