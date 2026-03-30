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
      singleRoom: {
        id: 'singleRoom',
        name: 'Single Room',
        description: 'Hourly rental, 3-hour minimum — one room',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 75,
        pricing: {
          offPeak:  { monThu: 250, friday: 300, saturday: 350, sunday: 275 },
          shoulder: { monThu: 300, friday: 350, saturday: 400, sunday: 325 },
          peak:     { monThu: 350, friday: 400, saturday: 450, sunday: 375 }
        }
      },
      partialBuilding: {
        id: 'partialBuilding',
        name: 'Partial Building',
        description: 'Hourly rental, 3-hour minimum',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 150,
        pricing: {
          offPeak: { monThu: 550, friday: 600, saturday: 650, sunday: 600 },
          shoulder: { monThu: 600, friday: 650, saturday: 750, sunday: 700 },
          peak: { monThu: 650, friday: 750, saturday: 850, sunday: 800 }
        }
      },
      partialBuildingFlat: {
        id: 'partialBuildingFlat',
        name: 'Partial Building — 12 Hour Block',
        description: 'All-day flat rate, 40% off hourly — dining room, lounge, courtyard & cavern',
        isFlat: true,
        capacity: 150,
        pricing: {
          offPeak:  { monThu: 3950, friday: 4300, saturday: 4700, sunday: 4300 },
          shoulder: { monThu: 4300, friday: 4700, saturday: 5400, sunday: 5050 },
          peak:     { monThu: 4700, friday: 5400, saturday: 6100, sunday: 5750 }
        }
      },
      premiumEventCap: {
        id: 'premiumEventCap',
        name: 'Full Building 12 Hour Block',
        description: 'All-day access, full building',
        isFlat: true,
        capacity: 300,
        pricing: {
          offPeak:  { monThu: 5600, friday: 6300, saturday: 7350, sunday: 6850 },
          shoulder: { monThu: 6850, friday: 8050, saturday: 9100, sunday: 8750 },
          peak:     { monThu: 7700, friday: 9100, saturday: 9800, sunday: 9450 }
        }
      }
    }
  },

  // ===================================
  // CATERING PRICING
  // ===================================
  catering: {
    includesSalad: true,
    mustSelectTwo: false,
    minProteins: 1,
    maxProteins: 2,
    allowOutsideCatering: true,
    outsideCateringFee: 1000,

    serviceStyles: [
      { id: 'buffet',       name: 'Buffet',        upcharge: 0,  description: 'Self-serve stations' },
      { id: 'familyStyle',  name: 'Family Style',  upcharge: 10, description: 'Shared platters at each table' },
      { id: 'plated',       name: 'Plated',        upcharge: 10, description: 'Full table service', usesMaxProteinPrice: true },
    ],

    dessert: {
      pricePerPerson: 10,
      description: 'Optional dessert course',
      examples: ['Wedding Cake Cutting', 'Plated Dessert', 'Dessert Bar'],
    },
    
    proteins: [
      {
        id: 'vegetarian',
        name: 'Vegetarian',
        pricePerPerson: 45,
        description: 'Seasonal vegetable entrée',
        examples: ['Eggplant Parmesan', 'Vegetable Lasagna', 'Stuffed Portobello'],
        image: '../src/images/food/vegan-entree.avif'
      },
      {
        id: 'chicken',
        name: 'Chicken',
        pricePerPerson: 55,
        description: 'Expertly prepared chicken',
        examples: ['Herb Roasted Chicken', 'Chicken Marsala', 'Chicken Piccata'],
        image: '../src/images/food/Food1.avif'
      },
      {
        id: 'fish',
        name: 'Fish',
        pricePerPerson: 65,
        description: 'Fresh fish selection',
        examples: ['Pan-Seared Salmon', 'Grilled Sea Bass', 'Herb-Crusted Tilapia'],
        image: '../src/images/food/fish-plate.avif'
      },
      {
        id: 'steak',
        name: 'Steak',
        pricePerPerson: 75,
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
      pricePerPerson: 6,
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
      pricePerPerson: 5,
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
        pricePerPerson: 40,
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
        name: 'Premium',
        pricePerPerson: 50,
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
        name: 'Top Shelf',
        pricePerPerson: 60,
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
        price: 2500,
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
        taxable: false,
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
        taxable: false,
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
  // RECEPTION PACKAGES
  // All-inclusive catering packages (base price per person; 20% service fee applies)
  // ===================================
  receptionPackages: {
    prospector: {
      id: 'prospector',
      name: 'Prospector',
      tagline: 'Classic elegance, expertly prepared',
      buffetPrice: 69,
      platedPrice: 79,
      horsCount: 2,
      badge: null,
      color: '#8B7355',
      includes: [
        'Choice of 2 Hors d'Oeuvres during cocktail hour',
        'Rolls & Butter',
        'Choice Salad',
        'Selection of 2 Entrées',
        'Chef's Choice Vegetarian/Vegan Entrée',
        'Beverage Station (Coffee, Tea, Lemonade)',
        'House Champagne & Sparkling Cider Toast',
        'Floor-Length Tablecloths & Linen Napkins',
        'China, Stemware & Silverware',
        'Cake Cutting Service',
        'Screen & Microphone',
      ],
      entrees: [
        'Lemon Chicken Piccata',
        'Center Cut Sirloin with Demi Glaze',
        'Herb Roasted Chicken',
        'Herb Crusted Tilapia',
        'Braised Beef Short Rib',
        'Roasted Salmon with Dill Cream Sauce',
      ],
    },
    brewmaster: {
      id: 'brewmaster',
      name: 'Brewmaster',
      tagline: 'Craft-inspired flavors, premium selections',
      buffetPrice: 79,
      platedPrice: 89,
      horsCount: 3,
      badge: 'Most Popular',
      color: '#6B4C3B',
      includes: [
        'Choice of 3 Hors d'Oeuvres (incl. premium selections)',
        'Rolls & Butter',
        'Choice Salad',
        'Selection of 2 Entrées',
        'Chef's Choice Vegetarian/Vegan Entrée',
        'Beverage Station (Coffee, Tea, Lemonade)',
        'House Champagne & Sparkling Cider Toast',
        'Floor-Length Tablecloths & Linen Napkins',
        'China, Stemware & Silverware',
        'Cake Cutting Service',
        'Screen & Microphone',
      ],
      entrees: [
        'Brown Ale Steak Medallions',
        'Whiskey Steak with Fried Onions',
        'Champagne Chicken',
        'Riesling Chicken',
        'Tri Tip with Zinfandel Sauce',
        'Chicken Madeira',
        'Mahi Mahi with Rum Mango-Pineapple Salsa',
        'Sea Bass with Lemon Chive Beurre Blanc',
      ],
    },
    motherLode: {
      id: 'motherLode',
      name: 'Mother Lode',
      tagline: 'Our finest — prime cuts & white-glove service',
      buffetPrice: 89,
      platedPrice: 99,
      horsCount: 4,
      badge: 'Luxury',
      color: '#4A3728',
      includes: [
        'Choice of 4 Hors d'Oeuvres (all premium selections available)',
        'Rolls & Butter',
        'Choice Salad',
        'Selection of 2 Entrées',
        'Chef's Choice Vegetarian/Vegan Entrée',
        'Beverage Station (Coffee, Tea, Lemonade)',
        'House Champagne & Sparkling Cider Toast',
        'Floor-Length Tablecloths & Linen Napkins',
        'China, Stemware & Silverware',
        'Cake Cutting Service',
        'Screen & Microphone',
      ],
      entrees: [
        'New York Steak (Roasted or Carved)',
        'Prime Rib (Roasted or Carved)',
        'Stuffed Chicken Cordon Bleu',
        '+ Any entrée from Prospector or Brewmaster menus',
      ],
    },
  },

  // ===================================
  // SALES TAX - NEVADA COUNTY, CA
  // ===================================
  salesTax: {
    defaultRate: 0.08875, // 8.875% Nevada City (venue location: 107 Sacramento St, Nevada City)
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
        rate: 0.075,
        name: 'Unincorporated Nevada County',
        breakdown: { state: 0.06, county: 0.0025, local: 0.0125 }
      }
    },

    // What is taxable vs non-taxable
    taxableCategories: [
      'catering',
      'beverages',
      'serviceFee'
    ],

    nonTaxableCategories: [
      'venue',
      'floral',
      'dj',
      'photography',
      'weddingPlanner'
    ]
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
        singleRoom: {
        id: 'singleRoom',
        name: 'Single Room',
        description: 'Hourly rental, 3-hour minimum — one room',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 75,
        pricing: {
          offPeak:  { monThu: 250, friday: 300, saturday: 350, sunday: 275 },
          shoulder: { monThu: 300, friday: 350, saturday: 400, sunday: 325 },
          peak:     { monThu: 350, friday: 400, saturday: 450, sunday: 375 }
        }
      },
      partialBuilding: { min: 20, max: 150, ideal: 80 },
        partialBuildingFlat: { min: 20, max: 150, ideal: 80 },
        singleRoom: {
        id: 'singleRoom',
        name: 'Single Room',
        description: 'Hourly rental, 3-hour minimum — one room',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 75,
        pricing: {
          offPeak:  { monThu: 250, friday: 300, saturday: 350, sunday: 275 },
          shoulder: { monThu: 300, friday: 350, saturday: 400, sunday: 325 },
          peak:     { monThu: 350, friday: 400, saturday: 450, sunday: 375 }
        }
      },
      partialBuilding: {
        id: 'partialBuilding',
        name: 'Partial Building',
        description: 'Hourly rental, 3-hour minimum',
        minimumHours: 3,
        maximumHours: 12,
        capacity: 150,
        pricing: {
          offPeak: { monThu: 550, friday: 600, saturday: 650, sunday: 600 },
          shoulder: { monThu: 600, friday: 650, saturday: 750, sunday: 700 },
          peak: { monThu: 650, friday: 750, saturday: 850, sunday: 800 }
        }
      },
      partialBuildingFlat: {
        id: 'partialBuildingFlat',
        name: 'Partial Building — 12 Hour Block',
        description: 'All-day flat rate, 40% off hourly — dining room, lounge, courtyard & cavern',
        isFlat: true,
        capacity: 150,
        pricing: {
          offPeak:  { monThu: 3950, friday: 4300, saturday: 4700, sunday: 4300 },
          shoulder: { monThu: 4300, friday: 4700, saturday: 5400, sunday: 5050 },
          peak:     { monThu: 4700, friday: 5400, saturday: 6100, sunday: 5750 }
        }
      },
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
