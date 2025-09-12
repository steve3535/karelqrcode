-- ====================================================
-- VUE POUR AFFICHER TOUS LES INVITÉS AVEC LEUR STATUT
-- ====================================================

-- Vue qui montre tous les invités avec leur statut d'assignation et de check-in
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