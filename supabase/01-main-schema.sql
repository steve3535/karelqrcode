-- ====================================================
-- SCHÉMA PRINCIPAL - WEDDING MANAGEMENT SYSTEM
-- ====================================================
-- Fichier consolidé pour la structure complète de la base de données
-- Date: 2025-01-14

-- ====================================================
-- 1. TABLES PRINCIPALES
-- ====================================================

-- Table des codes d'accès
CREATE TABLE IF NOT EXISTS access_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des invités
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  has_plus_one BOOLEAN DEFAULT false,
  dietary_restrictions TEXT,
  rsvp_status VARCHAR(50) DEFAULT 'pending',
  invitation_code VARCHAR(255) UNIQUE,
  guest_code VARCHAR(20) UNIQUE,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP,
  qr_code VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tables
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_number INTEGER UNIQUE NOT NULL,
  table_name VARCHAR(255),
  capacity INTEGER DEFAULT 10,
  is_vip BOOLEAN DEFAULT false,
  color_code VARCHAR(7),
  color_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des assignations de places
CREATE TABLE IF NOT EXISTS seating_assignments (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(table_id, seat_number),
  UNIQUE(guest_id)
);

-- ====================================================
-- 2. INDEXES POUR PERFORMANCE
-- ====================================================

CREATE INDEX IF NOT EXISTS idx_guests_invitation_code ON guests(invitation_code);
CREATE INDEX IF NOT EXISTS idx_guests_guest_code ON guests(guest_code);
CREATE INDEX IF NOT EXISTS idx_guests_qr_code ON guests(qr_code);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON guests(checked_in);
CREATE INDEX IF NOT EXISTS idx_seating_guest_id ON seating_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_seating_table_id ON seating_assignments(table_id);

-- ====================================================
-- 3. DONNÉES INITIALES
-- ====================================================

-- Code d'accès par défaut
INSERT INTO access_codes (code)
VALUES ('KRL2025')
ON CONFLICT (code) DO NOTHING;

-- Tables avec couleurs (26 tables)
INSERT INTO tables (table_number, table_name, capacity, is_vip, color_code, color_name) VALUES
(1, 'Table 1', 8, true, '#FFD700', 'Or'),
(2, 'Table 2', 10, false, '#FF6B6B', 'Rouge'),
(3, 'Table 3', 10, false, '#4ECDC4', 'Turquoise'),
(4, 'Table 4', 10, false, '#45B7D1', 'Bleu'),
(5, 'Table 5', 10, false, '#96CEB4', 'Vert menthe'),
(6, 'Table 6', 10, false, '#FFEAA7', 'Jaune'),
(7, 'Table 7', 10, false, '#DDA0DD', 'Prune'),
(8, 'Table 8', 10, false, '#98D8C8', 'Menthe'),
(9, 'Table 9', 10, false, '#FFB6C1', 'Rose'),
(10, 'Table 10', 10, false, '#FFD93D', 'Jaune vif'),
(11, 'Table 11', 10, false, '#6BCB77', 'Vert'),
(12, 'Table 12', 10, false, '#4D96FF', 'Bleu vif'),
(13, 'Table 13', 10, false, '#FF6B9D', 'Rose fuchsia'),
(14, 'Table 14', 10, false, '#C44569', 'Bordeaux'),
(15, 'Table 15', 10, false, '#F8961E', 'Orange'),
(16, 'Table 16', 10, false, '#90BE6D', 'Vert olive'),
(17, 'Table 17', 10, false, '#577590', 'Bleu gris'),
(18, 'Table 18', 10, false, '#E09F7D', 'Saumon'),
(19, 'Table 19', 10, false, '#EF9995', 'Corail'),
(20, 'Table 20', 10, false, '#E4C1F9', 'Lavande'),
(21, 'Table 21', 10, false, '#A9DEF9', 'Bleu ciel'),
(22, 'Table 22', 10, false, '#FCF6BD', 'Crème'),
(23, 'Table 23', 10, false, '#D0F4DE', 'Vert pâle'),
(24, 'Table 24', 10, false, '#FF99C8', 'Rose bonbon'),
(25, 'Table 25', 10, false, '#A8DADC', 'Cyan'),
(26, 'Table Enfants', 15, false, '#B19CD9', 'Violet')
ON CONFLICT (table_number) DO UPDATE
SET
  table_name = EXCLUDED.table_name,
  capacity = EXCLUDED.capacity,
  is_vip = EXCLUDED.is_vip,
  color_code = EXCLUDED.color_code,
  color_name = EXCLUDED.color_name;

-- ====================================================
-- 4. TRIGGER POUR MISE À JOUR AUTOMATIQUE
-- ====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();