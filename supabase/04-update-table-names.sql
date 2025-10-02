-- ====================================================
-- MISE À JOUR DES NOMS DE TABLES - THÈME FLORAL
-- ====================================================
-- Date: 2025-01-17
-- Description: Mise à jour des noms de tables avec des noms de fleurs
-- IMPORTANT: À exécuter dans Supabase SQL Editor

-- ====================================================
-- 1. MISE À JOUR DES NOMS DE TABLES EXISTANTES
-- ====================================================

-- Table 1: ORCHIDÉE (Table VIP)
UPDATE tables
SET table_name = 'ORCHIDÉE'
WHERE table_number = 1;

-- Table 2: LYS BLANC
UPDATE tables
SET table_name = 'LYS BLANC'
WHERE table_number = 2;

-- Table 3: IRIS
UPDATE tables
SET table_name = 'IRIS'
WHERE table_number = 3;

-- Table 4: LYS DORÉ
UPDATE tables
SET table_name = 'LYS DORÉ'
WHERE table_number = 4;

-- Table 5: JASMIN
UPDATE tables
SET table_name = 'JASMIN'
WHERE table_number = 5;

-- Table 6: GERBERA
UPDATE tables
SET table_name = 'GERBERA'
WHERE table_number = 6;

-- Table 7: CHRYSANTHÈME
UPDATE tables
SET table_name = 'CHRYSANTHÈME'
WHERE table_number = 7;

-- Table 8: MAGNOLIA
UPDATE tables
SET table_name = 'MAGNOLIA'
WHERE table_number = 8;

-- Table 9: GARDÉNIA
UPDATE tables
SET table_name = 'GARDÉNIA'
WHERE table_number = 9;

-- Table 10: MUGUET
UPDATE tables
SET table_name = 'MUGUET'
WHERE table_number = 10;

-- Table 11: PIVOINE
UPDATE tables
SET table_name = 'PIVOINE'
WHERE table_number = 11;

-- Table 12: CAMÉLIA
UPDATE tables
SET table_name = 'CAMÉLIA'
WHERE table_number = 12;

-- Table 13: TULIPE
UPDATE tables
SET table_name = 'TULIPE'
WHERE table_number = 13;

-- Table 14: ROSE ROSE
UPDATE tables
SET table_name = 'ROSE ROSE'
WHERE table_number = 14;

-- Table 15: HORTENSIA
UPDATE tables
SET table_name = 'HORTENSIA'
WHERE table_number = 15;

-- Table 16: DAHLIA
UPDATE tables
SET table_name = 'DAHLIA'
WHERE table_number = 16;

-- Table 17: MARGUERITE
UPDATE tables
SET table_name = 'MARGUERITE'
WHERE table_number = 17;

-- Table 18: TOURNESOL
UPDATE tables
SET table_name = 'TOURNESOL'
WHERE table_number = 18;

-- Table 19: FREESIA
UPDATE tables
SET table_name = 'FREESIA'
WHERE table_number = 19;

-- Table 20: JONQUILLE
UPDATE tables
SET table_name = 'JONQUILLE'
WHERE table_number = 20;

-- Table 21: VIOLETTE
UPDATE tables
SET table_name = 'VIOLETTE'
WHERE table_number = 21;

-- Table 22: AZALÉE
UPDATE tables
SET table_name = 'AZALÉE'
WHERE table_number = 22;

-- Table 23: COSMOS
UPDATE tables
SET table_name = 'COSMOS'
WHERE table_number = 23;

-- Table 24: ALLÉLUIA (Oxalis)
UPDATE tables
SET table_name = 'ALLÉLUIA (Oxalis)'
WHERE table_number = 24;

-- Table 25: ANTHURIUM
UPDATE tables
SET table_name = 'ANTHURIUM'
WHERE table_number = 25;

-- Table 26: PENSÉE
UPDATE tables
SET table_name = 'PENSÉE'
WHERE table_number = 26;

-- ====================================================
-- 2. AJOUT DES TABLES 27 ET 28 (SI ELLES N'EXISTENT PAS)
-- ====================================================

-- Ajouter la table 27: MYOSOTIS (table des enfants)
INSERT INTO tables (table_number, table_name, capacity, is_vip, color_code, color_name)
VALUES (27, 'MYOSOTIS', 30, false, '#87CEEB', 'Bleu ciel')
ON CONFLICT (table_number)
DO UPDATE SET
  table_name = 'MYOSOTIS',
  capacity = 30,
  is_vip = false;

-- Ajouter la table 28: IRIS BLANCHE (table adulte)
INSERT INTO tables (table_number, table_name, capacity, is_vip, color_code, color_name)
VALUES (28, 'IRIS BLANCHE', 10, false, '#E6E6FA', 'Lavande pâle')
ON CONFLICT (table_number)
DO UPDATE SET
  table_name = 'IRIS BLANCHE',
  capacity = 10,
  is_vip = false;

-- ====================================================
-- 3. VÉRIFICATION DES MISES À JOUR
-- ====================================================

-- Requête de vérification pour afficher toutes les tables avec leurs nouveaux noms
SELECT
  table_number,
  table_name,
  capacity,
  is_vip,
  color_name
FROM tables
ORDER BY table_number;

-- ====================================================
-- NOTES IMPORTANTES:
-- ====================================================
-- 1. Ce script met à jour UNIQUEMENT les noms de tables dans la base de données
-- 2. Les références table_id dans seating_assignments restent inchangées
-- 3. Les vues et fonctions continueront de fonctionner normalement
-- 4. L'interface utilisateur récupérera automatiquement les nouveaux noms
-- ====================================================