-- Wedding Quotes Table
-- Stores all wedding quote submissions with complete pricing breakdown
-- Stone House Venue - Nevada County, CA

CREATE TABLE IF NOT EXISTS wedding_quotes (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Event details
  event_date DATE NOT NULL,
  guest_count INTEGER NOT NULL,
  
  -- Venue information
  venue_type VARCHAR(50) NOT NULL, -- singleRoom, partialBuilding, fullBuilding, premiumEventCap
  venue_hours INTEGER, -- NULL for Premium Event Cap
  venue_cost DECIMAL(10,2) NOT NULL,
  
  -- Catering details
  catering_protein1 VARCHAR(50), -- vegetarian, chicken, fish, steak
  catering_protein2 VARCHAR(50),
  catering_sides TEXT[], -- array of side IDs
  catering_appetizers TEXT[], -- array of appetizer IDs
  average_meal_cost DECIMAL(10,2),
  catering_total DECIMAL(10,2),
  
  -- Beverage package
  beverage_package VARCHAR(50), -- beer-wine, premium, premium-liquor
  beverage_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Service fee
  service_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Add-on services
  floral_package VARCHAR(50), -- intimate, classic, elegant, luxury
  floral_cost DECIMAL(10,2) DEFAULT 0,
  photography BOOLEAN DEFAULT FALSE,
  photography_cost DECIMAL(10,2) DEFAULT 0,
  wedding_planner BOOLEAN DEFAULT FALSE,
  wedding_planner_cost DECIMAL(10,2) DEFAULT 0,
  wedding_planner_free BOOLEAN DEFAULT FALSE,
  dj_service BOOLEAN DEFAULT FALSE,
  dj_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Tax calculation
  taxable_subtotal DECIMAL(10,2) NOT NULL,
  non_taxable_subtotal DECIMAL(10,2) DEFAULT 0,
  sales_tax_rate DECIMAL(6,5) NOT NULL, -- e.g., 0.07750
  sales_tax_amount DECIMAL(10,2) NOT NULL,
  
  -- Discount
  full_package_eligible BOOLEAN DEFAULT FALSE,
  full_package_discount DECIMAL(10,2) DEFAULT 0,
  
  -- Total
  grand_total DECIMAL(10,2) NOT NULL,
  
  -- Customer information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_message TEXT,
  preferred_contact VARCHAR(20) DEFAULT 'email',
  
  -- Full state storage (JSONB for flexibility)
  cart_state JSONB,
  quote_details JSONB,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, quoted, booked, cancelled, expired
  
  -- Admin notes
  admin_notes TEXT,
  followed_up_at TIMESTAMP WITH TIME ZONE,
  booked_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for common queries
  CONSTRAINT valid_status CHECK (status IN ('pending', 'contacted', 'quoted', 'booked', 'cancelled', 'expired')),
  CONSTRAINT valid_venue_type CHECK (venue_type IN ('singleRoom', 'partialBuilding', 'fullBuilding', 'premiumEventCap')),
  CONSTRAINT positive_guest_count CHECK (guest_count > 0),
  CONSTRAINT positive_grand_total CHECK (grand_total >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_wedding_quotes_event_date ON wedding_quotes(event_date);
CREATE INDEX idx_wedding_quotes_customer_email ON wedding_quotes(customer_email);
CREATE INDEX idx_wedding_quotes_status ON wedding_quotes(status);
CREATE INDEX idx_wedding_quotes_created_at ON wedding_quotes(created_at DESC);
CREATE INDEX idx_wedding_quotes_grand_total ON wedding_quotes(grand_total);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_wedding_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wedding_quotes_updated_at
  BEFORE UPDATE ON wedding_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_wedding_quotes_updated_at();

-- Add comment to table
COMMENT ON TABLE wedding_quotes IS 'Stores wedding quote submissions with complete pricing breakdown including Nevada County CA sales tax';

-- Sample query to get recent quotes
-- SELECT quote_number, customer_name, event_date, guest_count, grand_total, status, created_at
-- FROM wedding_quotes
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Sample query to get quotes by status
-- SELECT * FROM wedding_quotes WHERE status = 'pending' ORDER BY event_date ASC;

-- Sample query to calculate total potential revenue
-- SELECT 
--   COUNT(*) as total_quotes,
--   SUM(grand_total) as total_value,
--   AVG(grand_total) as average_value,
--   COUNT(CASE WHEN full_package_eligible THEN 1 END) as full_package_count
-- FROM wedding_quotes
-- WHERE status = 'pending';
