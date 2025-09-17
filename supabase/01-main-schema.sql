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

-- Tables avec couleurs et noms de fleurs (27 tables)
INSERT INTO tables (table_number, table_name, capacity, is_vip, color_code, color_name) VALUES
(1, 'ORCHIDÉE', 8, true, '#FFD700', 'Or'),
(2, 'LYS BLANC', 10, false, '#FF6B6B', 'Rouge'),
(3, 'IRIS', 10, false, '#4ECDC4', 'Turquoise'),
(4, 'LYS DORÉ', 10, false, '#45B7D1', 'Bleu'),
(5, 'JASMIN', 10, false, '#96CEB4', 'Vert menthe'),
(6, 'GERBERA', 10, false, '#FFEAA7', 'Jaune'),
(7, 'CHRYSANTHÈME', 10, false, '#DDA0DD', 'Prune'),
(8, 'MAGNOLIA', 10, false, '#98D8C8', 'Menthe'),
(9, 'GARDÉNIA', 10, false, '#FFB6C1', 'Rose'),
(10, 'MUGUET', 10, false, '#FFD93D', 'Jaune vif'),
(11, 'PIVOINE', 10, false, '#6BCB77', 'Vert'),
(12, 'CAMÉLIA', 10, false, '#4D96FF', 'Bleu vif'),
(13, 'TULIPE', 10, false, '#FF6B9D', 'Rose fuchsia'),
(14, 'ROSE ROSE', 10, false, '#C44569', 'Bordeaux'),
(15, 'HORTENSIA', 10, false, '#F8961E', 'Orange'),
(16, 'DAHLIA', 10, false, '#90BE6D', 'Vert olive'),
(17, 'MARGUERITE', 10, false, '#577590', 'Bleu gris'),
(18, 'TOURNESOL', 10, false, '#E09F7D', 'Saumon'),
(19, 'FREESIA', 10, false, '#EF9995', 'Corail'),
(20, 'JONQUILLE', 10, false, '#E4C1F9', 'Lavande'),
(21, 'VIOLETTE', 10, false, '#A9DEF9', 'Bleu ciel'),
(22, 'AZALÉE', 10, false, '#FCF6BD', 'Crème'),
(23, 'COSMOS', 10, false, '#D0F4DE', 'Vert pâle'),
(24, 'ALLÉLUIA (Oxalis)', 10, false, '#FF99C8', 'Rose bonbon'),
(25, 'ANTHURIUM', 10, false, '#A8DADC', 'Cyan'),
(26, 'PENSÉE', 15, false, '#B19CD9', 'Violet'),
(27, 'MYOSOTIS', 15, false, '#87CEEB', 'Bleu ciel')
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