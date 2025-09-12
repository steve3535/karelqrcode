-- ====================================================
-- SCHEMA OPTIMISÉ POUR LA GESTION DES PLACES
-- ====================================================

-- Nettoyer les anciennes tables si nécessaire
DROP TABLE IF EXISTS assignment_history CASCADE;
DROP TABLE IF EXISTS seat_assignments CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- ====================================================
-- TABLE: tables - Configuration des tables
-- ====================================================
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  table_number INT NOT NULL UNIQUE,
  table_name VARCHAR(100),
  capacity INT NOT NULL DEFAULT 10,
  position_x INT DEFAULT 0, -- Pour le plan de salle visuel
  position_y INT DEFAULT 0, -- Pour le plan de salle visuel
  is_vip BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================
-- TABLE: guests - Informations des invités
-- ====================================================
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  qr_code VARCHAR(255) UNIQUE,
  invitation_sent BOOLEAN DEFAULT FALSE,
  dietary_restrictions TEXT,
  special_needs TEXT,
  notes TEXT,
  -- Statut de présence
  rsvp_status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, declined
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP,
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================
-- TABLE: seat_assignments - Attribution des places
-- ====================================================
CREATE TABLE seat_assignments (
  id SERIAL PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  table_id INT REFERENCES tables(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  -- Statut de l'attribution
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by VARCHAR(100), -- Qui a fait l'attribution
  assigned_at TIMESTAMP DEFAULT NOW(),
  -- Contrainte unique pour éviter les doublons
  UNIQUE(table_id, seat_number, is_active),
  -- Vérifier que le siège est dans la capacité de la table
  CHECK (seat_number > 0)
);

-- ====================================================
-- TABLE: assignment_history - Historique des changements
-- ====================================================
CREATE TABLE assignment_history (
  id SERIAL PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  table_id INT REFERENCES tables(id) ON DELETE SET NULL,
  seat_number INT,
  action VARCHAR(50) NOT NULL, -- assigned, changed, cancelled
  reason TEXT,
  performed_by VARCHAR(100),
  performed_at TIMESTAMP DEFAULT NOW(),
  previous_table_id INT,
  previous_seat_number INT
);

-- ====================================================
-- INDEXES pour les performances
-- ====================================================
CREATE INDEX idx_guests_name ON guests(last_name, first_name);
CREATE INDEX idx_guests_qr ON guests(qr_code);
CREATE INDEX idx_guests_checked_in ON guests(checked_in);
CREATE INDEX idx_assignments_active ON seat_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_assignments_guest ON seat_assignments(guest_id);
CREATE INDEX idx_assignments_table ON seat_assignments(table_id);
CREATE INDEX idx_history_guest ON assignment_history(guest_id);
CREATE INDEX idx_history_date ON assignment_history(performed_at DESC);

-- ====================================================
-- VUES pour simplifier les requêtes
-- ====================================================

-- Vue: Statut complet des tables
CREATE OR REPLACE VIEW table_status AS
SELECT 
  t.id,
  t.table_number,
  t.table_name,
  t.capacity,
  t.is_vip,
  COUNT(DISTINCT sa.seat_number) as occupied_seats,
  t.capacity - COUNT(DISTINCT sa.seat_number) as available_seats,
  ARRAY_AGG(
    jsonb_build_object(
      'seat_number', sa.seat_number,
      'guest_id', g.id,
      'guest_name', CONCAT(g.first_name, ' ', g.last_name),
      'checked_in', g.checked_in
    ) ORDER BY sa.seat_number
  ) FILTER (WHERE sa.guest_id IS NOT NULL) as seated_guests
FROM tables t
LEFT JOIN seat_assignments sa ON t.id = sa.table_id AND sa.is_active = TRUE
LEFT JOIN guests g ON sa.guest_id = g.id
GROUP BY t.id;

-- Vue: Invités sans place
CREATE OR REPLACE VIEW unassigned_guests AS
SELECT 
  g.id,
  g.first_name,
  g.last_name,
  g.email,
  g.rsvp_status
FROM guests g
LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
WHERE sa.id IS NULL
  AND g.rsvp_status = 'confirmed';

-- ====================================================
-- FONCTIONS utilitaires
-- ====================================================

-- Fonction: Générer un QR code unique
CREATE OR REPLACE FUNCTION generate_qr_code(guest_id UUID)
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'WEDDING-' || SUBSTRING(guest_id::TEXT, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::INT;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Assigner une place avec historique
CREATE OR REPLACE FUNCTION assign_seat(
  p_guest_id UUID,
  p_table_id INT,
  p_seat_number INT,
  p_assigned_by VARCHAR DEFAULT 'System'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_table_id INT;
  v_old_seat_number INT;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Récupérer l'ancienne attribution si elle existe
  SELECT table_id, seat_number INTO v_old_table_id, v_old_seat_number
  FROM seat_assignments
  WHERE guest_id = p_guest_id AND is_active = TRUE;
  
  -- Désactiver l'ancienne attribution
  UPDATE seat_assignments
  SET is_active = FALSE
  WHERE guest_id = p_guest_id AND is_active = TRUE;
  
  -- Créer la nouvelle attribution
  INSERT INTO seat_assignments (guest_id, table_id, seat_number, assigned_by)
  VALUES (p_guest_id, p_table_id, p_seat_number, p_assigned_by);
  
  -- Enregistrer dans l'historique
  INSERT INTO assignment_history (
    guest_id, table_id, seat_number, action, 
    performed_by, previous_table_id, previous_seat_number
  )
  VALUES (
    p_guest_id, p_table_id, p_seat_number,
    CASE WHEN v_old_table_id IS NULL THEN 'assigned' ELSE 'changed' END,
    p_assigned_by, v_old_table_id, v_old_seat_number
  );
  
  v_success := TRUE;
  RETURN v_success;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE; -- Place déjà occupée
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- TRIGGERS pour l'audit
-- ====================================================

-- Trigger: Mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON tables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ====================================================
-- DONNÉES INITIALES - Tables par défaut
-- ====================================================
INSERT INTO tables (table_number, table_name, capacity, is_vip) VALUES
  (1, 'Table d''honneur', 12, TRUE),
  (2, 'Famille proche 1', 10, TRUE),
  (3, 'Famille proche 2', 10, TRUE),
  (4, 'Famille - Oncles/Tantes', 10, FALSE),
  (5, 'Famille - Cousins 1', 10, FALSE),
  (6, 'Famille - Cousins 2', 10, FALSE),
  (7, 'Amis du marié 1', 10, FALSE),
  (8, 'Amis du marié 2', 10, FALSE),
  (9, 'Amis de la mariée 1', 10, FALSE),
  (10, 'Amis de la mariée 2', 10, FALSE),
  (11, 'Collègues marié', 10, FALSE),
  (12, 'Collègues mariée', 10, FALSE),
  (13, 'Voisins et connaissances', 10, FALSE),
  (14, 'Table 14', 10, FALSE),
  (15, 'Table 15', 10, FALSE),
  (16, 'Table 16', 10, FALSE),
  (17, 'Table 17', 10, FALSE),
  (18, 'Table 18', 10, FALSE),
  (19, 'Table 19', 10, FALSE),
  (20, 'Table 20', 10, FALSE),
  (21, 'Table 21', 10, FALSE),
  (22, 'Table 22', 10, FALSE),
  (23, 'Table 23', 10, FALSE),
  (24, 'Table 24', 10, FALSE),
  (25, 'Table 25', 10, FALSE),
  (26, 'Table 26 - Enfants', 10, FALSE),
  (27, 'Table supplémentaire 1', 10, FALSE),
  (28, 'Table supplémentaire 2', 10, FALSE),
  (29, 'Table supplémentaire 3', 10, FALSE),
  (30, 'Table de secours', 10, FALSE);

-- ====================================================
-- PERMISSIONS (pour Supabase)
-- ====================================================
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour tous
CREATE POLICY "Allow read access" ON guests FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON tables FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON seat_assignments FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON assignment_history FOR SELECT USING (true);

-- Politique d'écriture (à ajuster selon vos besoins)
CREATE POLICY "Allow all access" ON guests FOR ALL USING (true);
CREATE POLICY "Allow all access" ON tables FOR ALL USING (true);
CREATE POLICY "Allow all access" ON seat_assignments FOR ALL USING (true);
CREATE POLICY "Allow all access" ON assignment_history FOR ALL USING (true);