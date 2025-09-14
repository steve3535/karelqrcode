#!/usr/bin/env python3
"""
Corriger les vues SQL pour qu'elles utilisent les bonnes jointures
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables d'environnement
load_dotenv('.env.local')

# Configuration Supabase
url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

# Créer le client Supabase
supabase: Client = create_client(url, key)

print("=== CORRECTION DES VUES SQL ===\n")

# Les requêtes SQL pour corriger les vues
sql_commands = [
    # 1. Supprimer et recréer table_status
    """
    DROP VIEW IF EXISTS table_status CASCADE
    """,
    
    """
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
    GROUP BY t.id, t.table_number, t.table_name, t.capacity, t.is_vip, t.color_code, t.color_name
    """,
    
    # 2. Supprimer et recréer all_guests_status
    """
    DROP VIEW IF EXISTS all_guests_status CASCADE
    """,
    
    """
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
        CASE WHEN sa.guest_id IS NOT NULL THEN true ELSE false END as is_assigned,
        CASE
            WHEN g.checked_in THEN 'checked_in'
            WHEN sa.guest_id IS NOT NULL THEN 'assigned'
            ELSE 'unassigned'
        END as status
    FROM guests g
    LEFT JOIN seating_assignments sa ON g.id = sa.guest_id
    LEFT JOIN tables t ON sa.table_id = t.table_number
    """
]

# Exécuter chaque commande
for i, sql in enumerate(sql_commands, 1):
    try:
        # Utiliser postgrest pour exécuter du SQL brut
        # Malheureusement, le SDK Supabase Python ne supporte pas les DDL directement
        # On doit passer par l'API REST
        from postgrest import APIError
        
        # Alternative: essayer avec rpc si disponible
        result = supabase.rpc('exec_sql', {'query': sql.strip()}).execute()
        print(f"✓ Commande {i} exécutée")
    except Exception as e:
        # Si rpc n'existe pas, afficher le SQL à exécuter manuellement
        print(f"⚠️  Impossible d'exécuter automatiquement la commande {i}")
        print(f"    Erreur: {e}")
        print(f"\n    SQL à exécuter manuellement dans Supabase:\n")
        print(sql.strip()[:200] + "..." if len(sql.strip()) > 200 else sql.strip())
        print()

# Vérifier le résultat
print("\n=== VÉRIFICATION DES TABLES ===\n")
try:
    # Utiliser une requête sur la vue table_status
    result = supabase.table('table_status').select("table_number, table_name, occupied_seats, available_seats").execute()
    
    total_occupied = 0
    total_available = 0
    
    for table in sorted(result.data, key=lambda x: x['table_number']):
        print(f"Table {table['table_number']:2d}: {table['occupied_seats']:2d}/{table['occupied_seats'] + table['available_seats']:2d} occupés, {table['available_seats']:2d} libres")
        total_occupied += table['occupied_seats']
        total_available += table['available_seats']
    
    print(f"\n=== TOTAUX ===")
    print(f"Total invités assignés: {total_occupied}")
    print(f"Total places libres: {total_available}")
    print(f"Capacité totale: {total_occupied + total_available}")
    
except Exception as e:
    print(f"Erreur lors de la vérification: {e}")
    print("\nVeuillez exécuter les commandes SQL manuellement dans Supabase.")

print("\n✅ Script terminé!")