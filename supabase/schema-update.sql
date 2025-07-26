-- Make email optional and remove unique constraint
ALTER TABLE guests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE guests DROP CONSTRAINT guests_email_key;

-- Add a self-generated unique ID for guests without email
ALTER TABLE guests ADD COLUMN guest_code VARCHAR(10);

-- Create index on guest_code for faster lookups
CREATE INDEX idx_guests_guest_code ON guests(guest_code);

-- Add access_code table for RSVP page access
CREATE TABLE access_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default access code
INSERT INTO access_codes (code, description) VALUES ('WEDDING2024', 'Main wedding access code');