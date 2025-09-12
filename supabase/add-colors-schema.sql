-- ====================================================
-- AJOUT DES CODES COULEUR AUX TABLES
-- ====================================================

-- Ajouter la colonne couleur à la table des tables
ALTER TABLE tables ADD COLUMN color_code VARCHAR(7);
ALTER TABLE tables ADD COLUMN color_name VARCHAR(50);

-- Mettre à jour les tables avec des codes couleur distincts et élégants
UPDATE tables SET 
  color_code = CASE 
    WHEN table_number = 1 THEN '#FFD700'  -- Or (Table d'honneur)
    WHEN table_number = 2 THEN '#8B008B'  -- Violet foncé (Famille proche)
    WHEN table_number = 3 THEN '#9370DB'  -- Violet medium (Famille proche)
    WHEN table_number = 4 THEN '#4169E1'  -- Bleu royal
    WHEN table_number = 5 THEN '#1E90FF'  -- Bleu dodger
    WHEN table_number = 6 THEN '#00CED1'  -- Turquoise foncé
    WHEN table_number = 7 THEN '#228B22'  -- Vert forêt
    WHEN table_number = 8 THEN '#32CD32'  -- Vert lime
    WHEN table_number = 9 THEN '#FF69B4'  -- Rose vif
    WHEN table_number = 10 THEN '#FF1493' -- Rose profond
    WHEN table_number = 11 THEN '#FF8C00' -- Orange foncé
    WHEN table_number = 12 THEN '#FFA500' -- Orange
    WHEN table_number = 13 THEN '#DC143C' -- Cramoisi
    WHEN table_number = 14 THEN '#B22222' -- Rouge brique
    WHEN table_number = 15 THEN '#8B4513' -- Marron
    WHEN table_number = 16 THEN '#D2691E' -- Chocolat
    WHEN table_number = 17 THEN '#CD853F' -- Brun Pérou
    WHEN table_number = 18 THEN '#DDA0DD' -- Prune
    WHEN table_number = 19 THEN '#EE82EE' -- Violet
    WHEN table_number = 20 THEN '#DA70D6' -- Orchidée
    WHEN table_number = 21 THEN '#BA55D3' -- Orchidée medium
    WHEN table_number = 22 THEN '#9932CC' -- Orchidée foncé
    WHEN table_number = 23 THEN '#4682B4' -- Bleu acier
    WHEN table_number = 24 THEN '#5F9EA0' -- Bleu cadet
    WHEN table_number = 25 THEN '#008B8B' -- Cyan foncé
    WHEN table_number = 26 THEN '#FFB6C1' -- Rose clair (Table enfants)
    WHEN table_number = 27 THEN '#708090' -- Gris ardoise
    WHEN table_number = 28 THEN '#778899' -- Gris ardoise clair
    WHEN table_number = 29 THEN '#696969' -- Gris dim
    WHEN table_number = 30 THEN '#A9A9A9' -- Gris foncé
    ELSE '#808080' -- Gris par défaut
  END,
  color_name = CASE 
    WHEN table_number = 1 THEN 'Or'
    WHEN table_number = 2 THEN 'Violet Royal'
    WHEN table_number = 3 THEN 'Violet Doux'
    WHEN table_number = 4 THEN 'Bleu Royal'
    WHEN table_number = 5 THEN 'Bleu Ciel'
    WHEN table_number = 6 THEN 'Turquoise'
    WHEN table_number = 7 THEN 'Vert Forêt'
    WHEN table_number = 8 THEN 'Vert Lime'
    WHEN table_number = 9 THEN 'Rose Vif'
    WHEN table_number = 10 THEN 'Rose Profond'
    WHEN table_number = 11 THEN 'Orange Foncé'
    WHEN table_number = 12 THEN 'Orange'
    WHEN table_number = 13 THEN 'Cramoisi'
    WHEN table_number = 14 THEN 'Rouge Brique'
    WHEN table_number = 15 THEN 'Marron'
    WHEN table_number = 16 THEN 'Chocolat'
    WHEN table_number = 17 THEN 'Caramel'
    WHEN table_number = 18 THEN 'Prune'
    WHEN table_number = 19 THEN 'Violet Clair'
    WHEN table_number = 20 THEN 'Orchidée'
    WHEN table_number = 21 THEN 'Orchidée Medium'
    WHEN table_number = 22 THEN 'Orchidée Foncé'
    WHEN table_number = 23 THEN 'Bleu Acier'
    WHEN table_number = 24 THEN 'Bleu Cadet'
    WHEN table_number = 25 THEN 'Cyan Foncé'
    WHEN table_number = 26 THEN 'Rose Bonbon'
    WHEN table_number = 27 THEN 'Gris Ardoise'
    WHEN table_number = 28 THEN 'Gris Clair'
    WHEN table_number = 29 THEN 'Gris Moyen'
    WHEN table_number = 30 THEN 'Gris Perle'
    ELSE 'Gris'
  END;

-- Mettre à jour la vue table_status pour inclure les couleurs
DROP VIEW IF EXISTS table_status CASCADE;

CREATE OR REPLACE VIEW table_status AS
SELECT 
  t.id,
  t.table_number,
  t.table_name,
  t.capacity,
  t.is_vip,
  t.color_code,
  t.color_name,
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

-- Vue pour le scan QR avec info couleur immédiate
CREATE OR REPLACE VIEW guest_checkin_info AS
SELECT 
  g.id,
  g.first_name,
  g.last_name,
  g.qr_code,
  g.checked_in,
  g.checked_in_at,
  g.dietary_restrictions,
  g.special_needs,
  t.table_number,
  t.table_name,
  t.color_code,
  t.color_name,
  t.is_vip,
  sa.seat_number,
  CONCAT('Table ', t.table_number, ' - Siège ', sa.seat_number) as seat_location,
  t.position_x,
  t.position_y
FROM guests g
LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
LEFT JOIN tables t ON sa.table_id = t.id;

-- Fonction pour obtenir rapidement les infos de check-in avec couleur
CREATE OR REPLACE FUNCTION get_guest_checkin_by_qr(p_qr_code VARCHAR)
RETURNS TABLE (
  guest_id UUID,
  full_name VARCHAR,
  table_number INT,
  table_name VARCHAR,
  seat_number INT,
  color_code VARCHAR,
  color_name VARCHAR,
  is_vip BOOLEAN,
  checked_in BOOLEAN,
  dietary_restrictions TEXT,
  special_needs TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as guest_id,
    CONCAT(g.first_name, ' ', g.last_name)::VARCHAR as full_name,
    t.table_number,
    t.table_name,
    sa.seat_number,
    t.color_code,
    t.color_name,
    t.is_vip,
    g.checked_in,
    g.dietary_restrictions,
    g.special_needs
  FROM guests g
  LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
  LEFT JOIN tables t ON sa.table_id = t.id
  WHERE g.qr_code = p_qr_code;
END;
$$ LANGUAGE plpgsql;