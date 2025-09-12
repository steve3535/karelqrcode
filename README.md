# Wedding Guest Management System

Système de gestion des invités pour le mariage Karel & Lambert.

## Configuration

### Variables d'environnement

Configurer les variables suivantes dans Vercel :

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Base de données

1. Créer un projet Supabase
2. Exécuter les scripts SQL dans l'ordre :
   - `supabase/new-schema.sql`
   - `supabase/add-colors-schema.sql`
   - `supabase/IMPORTANT_SCHEMA.sql`

## Pages principales

- `/` - Page d'accueil avec authentification (Code: KRL2025)
- `/admin/seating` - Gestion des places (drag & drop)
- `/admin/qrcodes` - Génération et téléchargement des QR codes
- `/scan-v2` - Scanner pour l'enregistrement des invités

## Déploiement

Le projet est configuré pour un déploiement automatique sur Vercel.

## Technologies

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase
- React DnD