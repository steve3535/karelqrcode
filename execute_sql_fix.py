#!/usr/bin/env python3
"""
Exécuter les commandes SQL pour corriger les vues via psycopg2
"""

import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv('.env.local')

from supabase import create_client, Client

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(url, key)

print("=== CORRECTION DES VUES AVEC SUPABASE SDK ===\n")

# Puisque nous ne pouvons pas exécuter DDL directement,
# vérifions d'abord si les vues existent et leur structure

print("1. Vérification de l'état actuel des vues...\n")

try:
    # Tester table_status
    result = supabase.table('table_status').select("*").limit(1).execute()
    print("✓ Vue 'table_status' existe et est accessible")
    
    # Vérifier la structure
    if result.data and len(result.data) > 0:
        columns = result.data[0].keys()
        print(f"  Colonnes: {', '.join(columns)}")
except Exception as e:
    print(f"✗ Erreur avec 'table_status': {e}")

try:
    # Tester all_guests_status
    result = supabase.table('all_guests_status').select("*").limit(1).execute()
    print("✓ Vue 'all_guests_status' existe et est accessible")
    
    # Vérifier la structure
    if result.data and len(result.data) > 0:
        columns = result.data[0].keys()
        print(f"  Colonnes: {', '.join(columns)}")
except Exception as e:
    print(f"✗ Erreur avec 'all_guests_status': {e}")

print("\n2. Génération du SQL pour corriger les vues...\n")

# Générer le fichier SQL complet
sql_content = """
-- ========================================
-- CORRECTION DES VUES POUR UTILISER LES BONNES JOINTURES
-- ========================================

-- 1. Supprimer les vues existantes
DROP VIEW IF EXISTS table_status CASCADE;
DROP VIEW IF EXISTS all_guests_status CASCADE;
DROP VIEW IF EXISTS guest_checkin_info CASCADE;

-- 2. Recréer table_status avec la bonne jointure
CREATE VIEW table_status AS
SELECT
    t.id,
    t.table_number,
    t.table_name,
    t.capacity,
    t.is_vip,
    t.color_code,
    t.color_name,
    COALESCE(COUNT(sa.guest_id), 0)::int as occupied_seats,
    (t.capacity - COALESCE(COUNT(sa.guest_id), 0))::int as available_seats,
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
LEFT JOIN seating_assignments sa ON t.table_number = sa.table_id  -- IMPORTANT: jointure sur table_number!
LEFT JOIN guests g ON sa.guest_id = g.id
GROUP BY t.id, t.table_number, t.table_name, t.capacity, t.is_vip, t.color_code, t.color_name;

-- 3. Recréer all_guests_status avec la bonne jointure
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
LEFT JOIN tables t ON sa.table_id = t.table_number;  -- IMPORTANT: jointure sur table_number!

-- 4. Recréer guest_checkin_info si elle existe
CREATE VIEW guest_checkin_info AS
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
    sa.seat_number,
    t.table_number,
    t.table_name,
    t.color_code
FROM guests g
LEFT JOIN seating_assignments sa ON g.id = sa.guest_id
LEFT JOIN tables t ON sa.table_id = t.table_number;  -- IMPORTANT: jointure sur table_number!

-- 5. Vérifier les résultats
SELECT
    'Total tables' as metric,
    COUNT(*) as value
FROM table_status
UNION ALL
SELECT
    'Total occupied seats',
    SUM(occupied_seats)
FROM table_status
UNION ALL
SELECT
    'Total available seats',
    SUM(available_seats)
FROM table_status
UNION ALL
SELECT
    'Total capacity',
    SUM(capacity)
FROM tables;
"""

# Sauvegarder le SQL
with open('supabase/fix-all-views.sql', 'w') as f:
    f.write(sql_content)

print("✓ Fichier SQL généré: supabase/fix-all-views.sql")
print("\n⚠️  IMPORTANT: Exécutez ce fichier dans l'éditeur SQL de Supabase")
print("   1. Allez sur https://gdksgmkwbprdjthzjbvs.supabase.co")
print("   2. Ouvrez l'éditeur SQL")
print("   3. Copiez-collez le contenu de supabase/fix-all-views.sql")
print("   4. Exécutez le script")

print("\n3. Vérification des données actuelles...\n")

# Vérifier les totaux actuels
try:
    # Total invités
    guests = supabase.table('guests').select("*", count='exact').execute()
    print(f"Total invités: {guests.count}")
    
    # Total assignations
    assignments = supabase.table('seating_assignments').select("*", count='exact').execute()
    print(f"Total assignations: {assignments.count}")
    
    # Capacité totale des tables
    tables = supabase.table('tables').select("capacity").execute()
    total_capacity = sum(t['capacity'] for t in tables.data)
    print(f"Capacité totale: {total_capacity}")
    print(f"Places libres: {total_capacity - assignments.count}")
    
except Exception as e:
    print(f"Erreur: {e}")

print("\n✅ Script terminé!")