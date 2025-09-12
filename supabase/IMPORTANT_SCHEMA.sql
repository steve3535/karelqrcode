-- ====================================================
-- SCHÉMA PRINCIPAL - WEDDING MANAGEMENT SYSTEM
-- ====================================================
-- Ce fichier contient le schéma complet de la base de données
-- À exécuter dans Supabase SQL Editor si besoin de recréer

-- 1. D'abord exécuter new-schema.sql pour créer les tables principales
-- 2. Puis add-colors-schema.sql pour ajouter les couleurs aux tables
-- 3. Enfin cette vue pour la gestion des invités

-- Vue pour afficher tous les invités avec leur statut
CREATE OR REPLACE VIEW all_guests_status AS
SELECT 
  g.id,
  g.first_name,
  g.last_name,
  g.email,
  g.phone,
  g.checked_in,
  g.checked_in_at,
  g.qr_code,
  sa.table_id,
  t.table_number,
  t.table_name,
  t.color_code,
  t.color_name,
  CASE 
    WHEN sa.table_id IS NOT NULL THEN true 
    ELSE false 
  END as is_assigned,
  CASE
    WHEN g.checked_in = true THEN 'checked_in'
    WHEN sa.table_id IS NOT NULL THEN 'assigned'
    ELSE 'unassigned'
  END as status
FROM guests g
LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = true
LEFT JOIN tables t ON sa.table_id = t.id
ORDER BY g.last_name, g.first_name;

-- Vue pour le check-in avec QR code
CREATE OR REPLACE VIEW guest_checkin_info AS
SELECT 
  g.id as guest_id,
  g.first_name,
  g.last_name,
  g.qr_code,
  g.checked_in,
  g.checked_in_at,
  sa.table_id,
  t.table_number,
  t.table_name,
  t.color_code,
  t.color_name,
  t.capacity as table_capacity,
  COALESCE((
    SELECT COUNT(*) 
    FROM seat_assignments sa2 
    WHERE sa2.table_id = t.id AND sa2.is_active = TRUE
  ), 0) as table_occupied_seats
FROM guests g
LEFT JOIN seat_assignments sa ON g.id = sa.guest_id AND sa.is_active = TRUE
LEFT JOIN tables t ON sa.table_id = t.id;