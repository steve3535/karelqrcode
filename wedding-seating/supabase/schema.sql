-- Create tables for wedding seating system

-- Tables table
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  table_number INT NOT NULL UNIQUE,
  table_name VARCHAR(255),
  capacity INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  invitation_code VARCHAR(50) UNIQUE NOT NULL,
  rsvp_status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, declined
  plus_ones INT DEFAULT 0,
  dietary_restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seating assignments table
CREATE TABLE seating_assignments (
  id SERIAL PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  table_id INT REFERENCES tables(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  qr_code VARCHAR(255) UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(table_id, seat_number)
);

-- Create indexes
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_invitation_code ON guests(invitation_code);
CREATE INDEX idx_seating_qr_code ON seating_assignments(qr_code);

-- Sample data for tables
INSERT INTO tables (table_number, table_name, capacity) VALUES
  (1, 'Head Table', 8),
  (2, 'Family Table 1', 10),
  (3, 'Family Table 2', 10),
  (4, 'Friends Table 1', 10),
  (5, 'Friends Table 2', 10),
  (6, 'Colleagues Table 1', 10),
  (7, 'Colleagues Table 2', 10),
  (8, 'Mixed Table 1', 10),
  (9, 'Mixed Table 2', 10),
  (10, 'Mixed Table 3', 10),
  (11, 'Mixed Table 4', 10),
  (12, 'Mixed Table 5', 10),
  (13, 'Mixed Table 6', 10),
  (14, 'Mixed Table 7', 10),
  (15, 'Mixed Table 8', 10),
  (16, 'Mixed Table 9', 10),
  (17, 'Mixed Table 10', 10),
  (18, 'Mixed Table 11', 10),
  (19, 'Mixed Table 12', 10),
  (20, 'Mixed Table 13', 10),
  (21, 'Mixed Table 14', 10),
  (22, 'Mixed Table 15', 10),
  (23, 'Mixed Table 16', 10),
  (24, 'Mixed Table 17', 10),
  (25, 'Mixed Table 18', 10);