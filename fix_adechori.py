#!/usr/bin/env python3
"""
Corriger le doublon Karimou/Iradatou ADECHORI
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

print("=== CORRECTION DOUBLON ADECHORI ===\n")

# 1. Voir les deux entrées
print("1. Recherche des entrées ADECHORI...")
guests = supabase.table('guests').select("*").ilike('last_name', '%ADECHORI%').execute()
for guest in guests.data:
    print(f"   - {guest['first_name']} {guest['last_name']} (ID: {guest['id']})")

# 2. Voir leurs assignations
print("\n2. Vérification des assignations...")
for guest in guests.data:
    assignments = supabase.table('seating_assignments').select("*").eq('guest_id', guest['id']).execute()
    if assignments.data:
        print(f"   - {guest['first_name']} assigné à la table {assignments.data[0]['table_id']}, siège {assignments.data[0]['seat_number']}")

# 3. Identifier Karimou pour suppression
karimou_id = None
for guest in guests.data:
    if guest['first_name'] == 'Karimou':
        karimou_id = guest['id']
        break

if karimou_id:
    print(f"\n3. Suppression de Karimou ADECHORI (ID: {karimou_id})...")

    # Supprimer l'assignation
    result = supabase.table('seating_assignments').delete().eq('guest_id', karimou_id).execute()
    print("   - Assignation supprimée")

    # Supprimer l'invité
    result = supabase.table('guests').delete().eq('id', karimou_id).execute()
    print("   - Invité supprimé de la base")

# 4. Supprimer aussi les autres doublons ADECHORI
print("\n4. Suppression des autres doublons ADECHORI...")

# Garder seulement "Iradatou Karimou  ADECHORI" (ID: 3c6b5093...)
to_delete = []
for guest in guests.data:
    if guest['id'] != '3c6b5093-c73e-4ee3-9a35-5fd343727263':  # Garder seulement celui-ci
        to_delete.append(guest['id'])

for guest_id in to_delete:
    # Supprimer les assignations
    supabase.table('seating_assignments').delete().eq('guest_id', guest_id).execute()
    # Supprimer l'invité
    supabase.table('guests').delete().eq('id', guest_id).execute()
    print(f"   - Supprimé ID: {guest_id}")

# 5. Vérifier le résultat pour la table 1
print("\n5. Vérification de la table 1 après correction...")
table1_assignments = supabase.table('seating_assignments').select("*").eq('table_id', 1).execute()
print(f"   Nombre d'invités à la table 1: {len(table1_assignments.data)}")

# Récupérer les infos des invités
print("\n   Liste des invités:")
for assignment in sorted(table1_assignments.data, key=lambda x: x['seat_number']):
    guest = supabase.table('guests').select("*").eq('id', assignment['guest_id']).execute()
    if guest.data:
        print(f"   Siège {assignment['seat_number']}: {guest.data[0]['first_name']} {guest.data[0]['last_name']}")

print("\n✅ Correction terminée!")