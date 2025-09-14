#!/usr/bin/env python3
"""
Script pour gérer directement la base de données Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Charger les variables d'environnement
load_dotenv('.env.local')

# Configuration Supabase
url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

# Créer le client Supabase
supabase: Client = create_client(url, key)

def check_assignments():
    """Vérifier l'état des assignations"""
    print("\n=== ÉTAT DES ASSIGNATIONS ===")

    # Compter les invités
    guests = supabase.table('guests').select("*").execute()
    print(f"Total invités: {len(guests.data)}")

    # Compter les assignations
    assignments = supabase.table('seating_assignments').select("*").execute()
    print(f"Total assignations: {len(assignments.data)}")

    # Tables avec invités
    tables_with_guests = {}
    for assignment in assignments.data:
        table_id = assignment['table_id']
        if table_id not in tables_with_guests:
            tables_with_guests[table_id] = 0
        tables_with_guests[table_id] += 1

    print(f"\n=== RÉPARTITION PAR TABLE ===")
    for table_num in sorted(tables_with_guests.keys()):
        print(f"Table {table_num}: {tables_with_guests[table_num]} invités")

    # Invités non assignés
    assigned_guest_ids = {a['guest_id'] for a in assignments.data}
    unassigned_guests = [g for g in guests.data if g['id'] not in assigned_guest_ids]

    print(f"\n=== INVITÉS NON ASSIGNÉS ({len(unassigned_guests)}) ===")
    for guest in unassigned_guests[:10]:  # Afficher les 10 premiers
        print(f"- {guest['first_name']} {guest['last_name']}")

    return {
        'total_guests': len(guests.data),
        'total_assignments': len(assignments.data),
        'unassigned_count': len(unassigned_guests),
        'tables_with_guests': tables_with_guests
    }

def execute_sql(query):
    """Exécuter une requête SQL directement"""
    try:
        result = supabase.rpc('sql', {'query': query}).execute()
        return result.data
    except Exception as e:
        print(f"Erreur SQL: {e}")
        # Alternative: utiliser les méthodes du SDK
        return None

def fix_missing_assignments():
    """Assigner les invités manquants"""
    print("\n=== CORRECTION DES INVITÉS MANQUANTS ===")

    # Les invités qui doivent être assignés selon les screenshots
    missing_assignments = [
        ('Anne', 'DAHO', 4),  # Anne DAHO existe comme "Anne DAHO Daho"
        ('Iradatou', 'ADECHORI', 1),
        ('Werner', 'Kiefer', 8),
        ('Gwladys', 'Mazamba', 20),
        ('Gisèle Valérie', 'SAIH', 20),
        ('Marie Adéla', 'FONANT', 18),
    ]

    for first_name, last_name, table_num in missing_assignments:
        try:
            # Chercher l'invité
            guest_result = supabase.table('guests').select("*").eq('first_name', first_name).execute()

            if not guest_result.data:
                # Essayer avec une recherche plus flexible
                guest_result = supabase.table('guests').select("*").ilike('first_name', f'%{first_name}%').execute()

            if guest_result.data:
                guest = guest_result.data[0]
                guest_id = guest['id']

                # Vérifier si déjà assigné
                existing = supabase.table('seating_assignments').select("*").eq('guest_id', guest_id).execute()

                if not existing.data:
                    # Trouver le prochain siège
                    seats = supabase.table('seating_assignments').select("seat_number").eq('table_id', table_num).execute()
                    next_seat = max([s['seat_number'] for s in seats.data], default=0) + 1

                    # Créer l'assignation
                    assignment = {
                        'guest_id': guest_id,
                        'table_id': table_num,
                        'seat_number': next_seat,
                        'qr_code': f'WEDDING-{guest_id}-TABLE{table_num}',
                        'checked_in': False
                    }

                    result = supabase.table('seating_assignments').insert(assignment).execute()
                    print(f"✓ Assigné {first_name} {last_name} à la table {table_num}")
                else:
                    print(f"- {first_name} {last_name} déjà assigné")
            else:
                print(f"✗ Invité non trouvé: {first_name} {last_name}")

        except Exception as e:
            print(f"✗ Erreur pour {first_name} {last_name}: {e}")

def main():
    """Fonction principale"""
    print("=== GESTIONNAIRE DE BASE DE DONNÉES WEDDING ===")

    # Vérifier l'état actuel
    stats = check_assignments()

    # Si des invités ne sont pas assignés, les corriger automatiquement
    if stats['unassigned_count'] > 0:
        print(f"\n⚠️  {stats['unassigned_count']} invités non assignés détectés")
        print("Correction automatique en cours...")
        fix_missing_assignments()
        # Revérifier
        print("\n=== VÉRIFICATION APRÈS CORRECTION ===")
        check_assignments()

if __name__ == "__main__":
    main()