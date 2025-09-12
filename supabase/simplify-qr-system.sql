-- ====================================================
-- SIMPLIFICATION DU SYSTÈME DE QR CODES
-- QR Code = Nom complet de l'invité uniquement
-- ====================================================

-- 1. Mettre à jour tous les QR codes existants pour utiliser juste le nom
UPDATE guests
SET qr_code = CONCAT('WEDDING-', first_name, ' ', last_name)
WHERE qr_code IS NULL OR qr_code != CONCAT('WEDDING-', first_name, ' ', last_name);

-- 2. Créer une fonction pour générer le QR code basé sur le nom
CREATE OR REPLACE FUNCTION generate_guest_qr_code(guest_first_name TEXT, guest_last_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT('WEDDING-', guest_first_name, ' ', guest_last_name);
END;
$$ LANGUAGE plpgsql;

-- 3. Créer une fonction pour rechercher un invité par son QR code (nom)
CREATE OR REPLACE FUNCTION find_guest_by_qr(qr_content TEXT)
RETURNS TABLE (
  guest_id INT,
  first_name TEXT,
  last_name TEXT,
  table_number INT,
  table_name TEXT,
  color_code TEXT,
  color_name TEXT,
  checked_in BOOLEAN,
  checked_in_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Extraire le nom du QR code (enlever le préfixe WEDDING-)
  DECLARE
    full_name TEXT;
  BEGIN
    full_name := REPLACE(qr_content, 'WEDDING-', '');
    
    RETURN QUERY
    SELECT 
      g.id as guest_id,
      g.first_name,
      g.last_name,
      t.table_number,
      t.table_name,
      t.color_code,
      t.color_name,
      g.checked_in,
      g.checked_in_at
    FROM guests g
    LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
    LEFT JOIN tables t ON sa.table_id = t.id
    WHERE CONCAT(g.first_name, ' ', g.last_name) = full_name;
  END;
END;
$$ LANGUAGE plpgsql;

-- 4. Mettre à jour la vue guest_checkin_info pour simplifier
CREATE OR REPLACE VIEW guest_checkin_info AS
SELECT 
  g.id as guest_id,
  g.first_name,
  g.last_name,
  g.qr_code,
  g.checked_in,
  g.checked_in_at,
  t.id as table_id,
  t.table_number,
  t.table_name,
  t.color_code,
  t.color_name,
  t.capacity as table_capacity,
  (
    SELECT COUNT(*) 
    FROM seat_assignments sa2 
    WHERE sa2.table_id = t.id AND sa2.is_active = TRUE
  ) as table_occupied_seats
FROM guests g
LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
LEFT JOIN tables t ON sa.table_id = t.id;

-- 5. Créer un index sur le nom complet pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests((first_name || ' ' || last_name));

-- 6. Vérifier que tous les invités ont maintenant un QR code basé sur leur nom
SELECT 
  id,
  first_name,
  last_name,
  qr_code,
  CASE 
    WHEN qr_code = CONCAT('WEDDING-', first_name, ' ', last_name) THEN '✅ OK'
    ELSE '❌ À corriger'
  END as status
FROM guests
ORDER BY last_name, first_name;