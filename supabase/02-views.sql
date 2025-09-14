-- ====================================================
-- VUES POUR L'APPLICATION
-- ====================================================
-- Vues consolidées pour faciliter les requêtes dans l'application
-- Date: 2025-01-14

-- ====================================================
-- 1. VUE: STATUT DES TABLES
-- ====================================================
DROP VIEW IF EXISTS table_status CASCADE;

CREATE VIEW table_status AS
SELECT
    t.id,
    t.table_number,
    t.table_name,
    t.capacity,
    t.is_vip,
    t.color_code,
    t.color_name,
    COALESCE(COUNT(sa.guest_id), 0) as occupied_seats,
    t.capacity - COALESCE(COUNT(sa.guest_id), 0) as available_seats,
    CASE
        WHEN COUNT(sa.guest_id) > 0 THEN
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'guest_id', sa.guest_id,
                    'seat_number', sa.seat_number,
                    'guest_name', g.first_name || ' ' || g.last_name,
                    'checked_in', sa.checked_in
                )
                ORDER BY sa.seat_number
            )
        ELSE NULL
    END as seated_guests
FROM tables t
LEFT JOIN seating_assignments sa ON t.table_number = sa.table_id
LEFT JOIN guests g ON sa.guest_id = g.id
GROUP BY t.id, t.table_number, t.table_name, t.capacity, t.is_vip, t.color_code, t.color_name;

-- ====================================================
-- 2. VUE: STATUT DE TOUS LES INVITÉS
-- ====================================================
DROP VIEW IF EXISTS all_guests_status CASCADE;

CREATE VIEW all_guests_status AS
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
    sa.seat_number,
    CASE WHEN sa.guest_id IS NOT NULL THEN true ELSE false END as is_assigned,
    CASE
        WHEN g.checked_in THEN 'checked_in'
        WHEN sa.guest_id IS NOT NULL THEN 'assigned'
        ELSE 'unassigned'
    END as status
FROM guests g
LEFT JOIN seating_assignments sa ON g.id = sa.guest_id
LEFT JOIN tables t ON sa.table_id = t.table_number
ORDER BY g.last_name, g.first_name;

-- ====================================================
-- 3. VUE: STATISTIQUES GLOBALES
-- ====================================================
DROP VIEW IF EXISTS event_statistics CASCADE;

CREATE VIEW event_statistics AS
SELECT
    (SELECT COUNT(*) FROM guests) as total_guests,
    (SELECT COUNT(*) FROM guests WHERE rsvp_status = 'confirmed') as confirmed_guests,
    (SELECT COUNT(*) FROM guests WHERE rsvp_status = 'declined') as declined_guests,
    (SELECT COUNT(*) FROM guests WHERE rsvp_status = 'pending') as pending_guests,
    (SELECT COUNT(*) FROM guests WHERE checked_in = true) as checked_in_guests,
    (SELECT COUNT(*) FROM seating_assignments) as assigned_seats,
    (SELECT SUM(capacity) FROM tables) as total_capacity,
    (SELECT SUM(capacity) FROM tables) - (SELECT COUNT(*) FROM seating_assignments) as available_seats,
    (SELECT COUNT(*) FROM tables) as total_tables,
    (SELECT COUNT(*) FROM tables WHERE id IN (SELECT DISTINCT table_id FROM seating_assignments)) as occupied_tables;

-- ====================================================
-- 4. VUE: INVITÉS NON ASSIGNÉS
-- ====================================================
DROP VIEW IF EXISTS unassigned_guests CASCADE;

CREATE VIEW unassigned_guests AS
SELECT
    g.id,
    g.first_name,
    g.last_name,
    g.email,
    g.phone,
    g.rsvp_status,
    g.dietary_restrictions,
    g.has_plus_one
FROM guests g
LEFT JOIN seating_assignments sa ON g.id = sa.guest_id
WHERE sa.guest_id IS NULL
  AND g.rsvp_status = 'confirmed'
ORDER BY g.created_at;