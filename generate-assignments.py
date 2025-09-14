#!/usr/bin/env python3
"""
Script pour générer les assignations SQL depuis le fichier CSV
"""

import csv
import re

def parse_csv_and_generate_sql():
    assignments = []

    with open('plandetable.csv', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        # Nettoyer la ligne
        line = line.strip()
        if not line:
            continue

        # Parser la ligne manuellement
        parts = line.split(',')
        if len(parts) < 2:
            continue

        # Extraire nom et prénom
        last_name = parts[0].strip()
        first_name = parts[1].strip() if len(parts) > 1 else ""

        # Chercher le numéro de table dans la ligne
        table_num = None

        # Chercher "TABLE ENFANT" d'abord
        if "TABLE ENFANT" in line:
            table_num = 27
        else:
            # Chercher un nombre seul qui pourrait être le numéro de table
            # Généralement c'est le dernier élément ou proche de la fin
            for part in reversed(parts):
                part = part.strip()
                if part.isdigit():
                    table_num = int(part)
                    break

        # Nettoyer les noms
        if not last_name or not first_name or last_name == "" or first_name == "":
            continue

        # Gérer les cas spéciaux d'époux/épouse
        if first_name.lower() in ['epouse', 'épouse', 'enfant 1', 'enfant 2', 'accompagnant']:
            # Garder tel quel pour ces cas spéciaux
            pass

        if table_num:
            assignments.append({
                'last_name': last_name.replace("'", "''"),
                'first_name': first_name.replace("'", "''"),
                'table': table_num
            })
            print(f"Trouvé: {first_name} {last_name} -> Table {table_num}")

    # Générer le SQL
    sql_lines = ["""-- Script SQL généré automatiquement depuis plandetable.csv
-- Exécuter dans Supabase SQL Editor

-- Créer la table 27 pour les enfants
INSERT INTO tables (table_number, table_name, capacity, is_vip)
VALUES (27, 'Table des enfants', 20, false)
ON CONFLICT (table_number) DO NOTHING;

-- Fonction d'assignation
CREATE OR REPLACE FUNCTION assign_guest_to_table_number(
    guest_first_name TEXT,
    guest_last_name TEXT,
    table_num INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_guest_id UUID;
    v_table_id UUID;
    v_next_seat INTEGER;
BEGIN
    -- Trouver l'ID du guest
    SELECT id INTO v_guest_id
    FROM guests
    WHERE UPPER(TRIM(first_name)) = UPPER(TRIM(guest_first_name))
      AND UPPER(TRIM(last_name)) = UPPER(TRIM(guest_last_name))
    LIMIT 1;

    -- Trouver l'ID de la table
    SELECT id INTO v_table_id
    FROM tables
    WHERE table_number = table_num;

    IF v_guest_id IS NOT NULL AND v_table_id IS NOT NULL THEN
        -- Supprimer les anciennes assignations
        DELETE FROM seat_assignments WHERE guest_id = v_guest_id;

        -- Trouver le prochain siège
        SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_next_seat
        FROM seat_assignments
        WHERE table_id = v_table_id AND is_active = true;

        -- Créer l'assignation
        INSERT INTO seat_assignments (guest_id, table_id, seat_number, is_active)
        VALUES (v_guest_id, v_table_id, v_next_seat, true)
        ON CONFLICT (guest_id) DO UPDATE
        SET table_id = EXCLUDED.table_id,
            seat_number = EXCLUDED.seat_number,
            is_active = true,
            assigned_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Assignations des invités
"""]

    # Grouper par table
    tables = {}
    for assignment in assignments:
        table = assignment['table']
        if table not in tables:
            tables[table] = []
        tables[table].append(assignment)

    # Générer les assignations par table
    for table_num in sorted(tables.keys()):
        sql_lines.append(f"\n-- Table {table_num}")
        for guest in tables[table_num]:
            sql_lines.append(f"SELECT assign_guest_to_table_number('{guest['first_name']}', '{guest['last_name']}', {table_num});")

    # Ajouter la vérification
    sql_lines.append("""
-- Vérification des résultats
SELECT
    t.table_number,
    t.table_name,
    COUNT(sa.guest_id) as guests_assigned,
    t.capacity,
    t.capacity - COUNT(sa.guest_id) as seats_available
FROM tables t
LEFT JOIN seat_assignments sa ON t.id = sa.table_id AND sa.is_active = true
GROUP BY t.id, t.table_number, t.table_name, t.capacity
ORDER BY t.table_number;
""")

    # Écrire le fichier SQL complet
    with open('supabase/complete-assignments.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))

    print(f"Script SQL généré avec {len(assignments)} assignations")
    print(f"Tables utilisées: {sorted(tables.keys())}")
    for table_num in sorted(tables.keys()):
        print(f"  Table {table_num}: {len(tables[table_num])} invités")

if __name__ == "__main__":
    parse_csv_and_generate_sql()