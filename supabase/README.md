# Supabase SQL Scripts

## Structure organisée des scripts SQL

### Scripts principaux (à exécuter dans l'ordre)

1. **01-main-schema.sql** - Schéma de base complet
   - Tables principales (guests, tables, seating_assignments, access_codes)
   - Indexes pour performance
   - Données initiales (26 tables avec couleurs)
   - Triggers pour mise à jour automatique

2. **02-views.sql** - Vues pour l'application
   - `table_status` - Statut de chaque table avec places occupées/disponibles
   - `all_guests_status` - Vue complète de tous les invités avec leur statut
   - `event_statistics` - Statistiques globales de l'événement
   - `unassigned_guests` - Liste des invités confirmés sans place assignée

3. **03-functions.sql** - Fonctions utilitaires
   - `assign_guest_to_seat()` - Assigner manuellement un invité
   - `auto_assign_guest()` - Assignation automatique à la prochaine place disponible
   - `check_in_guest_by_qr()` - Check-in par QR code
   - `get_available_seats()` - Places libres d'une table
   - `move_guest_to_seat()` - Déplacer un invité

### Scripts archivés

Les anciens scripts ont été déplacés dans `/supabase/archive/` pour référence historique.

### Scripts de mise à jour spécifiques (si nécessaire)

- **add-colors-schema.sql** - Ajouter/mettre à jour les couleurs des tables
- **simplify-qr-system.sql** - Simplification du système QR
- **all-guests-view.sql** - Vue spécifique pour tous les invités

## Utilisation

Pour initialiser ou réinitialiser la base de données:

1. Exécuter `01-main-schema.sql` dans Supabase SQL Editor
2. Exécuter `02-views.sql`
3. Exécuter `03-functions.sql`

Les scripts sont idempotents (peuvent être exécutés plusieurs fois sans problème).