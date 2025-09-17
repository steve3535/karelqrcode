-- ====================================================
-- SCRIPT DE VÉRIFICATION DES NOMS DE TABLES
-- ====================================================
-- Date: 2025-01-17
-- Description: Vérification après mise à jour des noms de tables

-- ====================================================
-- 1. AFFICHER TOUTES LES TABLES AVEC LEURS NOUVEAUX NOMS
-- ====================================================
SELECT
    table_number as "N° Table",
    table_name as "Nom de la Table (Fleur)",
    capacity as "Capacité",
    CASE WHEN is_vip THEN 'OUI' ELSE 'NON' END as "VIP",
    color_name as "Couleur",
    color_code as "Code Couleur"
FROM tables
ORDER BY table_number;

-- ====================================================
-- 2. VÉRIFIER LES TABLES AVEC DES INVITÉS ASSIGNÉS
-- ====================================================
SELECT
    t.table_number as "N° Table",
    t.table_name as "Nom de la Table",
    COUNT(sa.guest_id) as "Places Occupées",
    t.capacity as "Capacité Totale",
    t.capacity - COUNT(sa.guest_id) as "Places Disponibles"
FROM tables t
LEFT JOIN seating_assignments sa ON t.table_number = sa.table_id
GROUP BY t.table_number, t.table_name, t.capacity
ORDER BY t.table_number;

-- ====================================================
-- 3. VÉRIFIER QUE LA VUE table_status FONCTIONNE
-- ====================================================
SELECT
    table_number,
    table_name,
    occupied_seats,
    available_seats
FROM table_status
WHERE occupied_seats > 0
ORDER BY table_number
LIMIT 10;

-- ====================================================
-- 4. VÉRIFIER UN INVITÉ ASSIGNÉ ET SON NOM DE TABLE
-- ====================================================
SELECT
    g.first_name || ' ' || g.last_name as "Invité",
    sa.table_id as "N° Table",
    t.table_name as "Nom de la Table",
    sa.seat_number as "N° Place"
FROM guests g
JOIN seating_assignments sa ON g.id = sa.guest_id
JOIN tables t ON sa.table_id = t.table_number
LIMIT 10;

-- ====================================================
-- RÉSULTATS ATTENDUS:
-- ====================================================
-- Vous devriez voir:
-- 1. 27 tables avec les noms de fleurs
-- 2. Table 1 = ORCHIDÉE (8 places, VIP)
-- 3. Table 27 = MYOSOTIS (15 places, table des enfants)
-- 4. Les invités assignés avec le nom de fleur de leur table
-- ====================================================