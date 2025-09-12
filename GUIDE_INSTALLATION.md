# 🎉 GUIDE D'INSTALLATION - Système de Gestion des Places de Mariage

## 📊 1. CONFIGURER LA BASE DE DONNÉES SUPABASE

### Étape 1.1 : Connexion à Supabase
1. Allez sur https://supabase.com
2. Connectez-vous à votre projet (gdksgmkwbprdjthzjbvs)
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 1.2 : Exécuter les scripts SQL
**IMPORTANT : Exécutez dans cet ordre exact !**

1. **Premier script** : Ouvrez le fichier `supabase/new-schema.sql`
   - Copiez TOUT le contenu
   - Collez dans l'éditeur SQL de Supabase
   - Cliquez sur **Run** (bouton vert)
   - Attendez le message de succès

2. **Deuxième script** : Ouvrez le fichier `supabase/add-colors-schema.sql`
   - Copiez TOUT le contenu
   - Collez dans l'éditeur SQL
   - Cliquez sur **Run**
   - Attendez le message de succès

## 📥 2. IMPORTER LES 268 INVITÉS

### Étape 2.1 : Lancer l'import
```bash
# Dans le terminal, depuis le dossier du projet
source venv/bin/activate
cd scripts
python3 import-guests.py
```

Répondez "o" quand on vous demande confirmation.

## 🚀 3. LANCER L'APPLICATION

```bash
# Depuis le dossier principal du projet
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 📱 4. URLS DES INTERFACES

### Pour l'administrateur :
- **Gestion des places** : http://localhost:3000/admin/seating
  - Interface drag & drop pour assigner les invités aux tables
  - Visualisation par couleurs
  - Recherche d'invités

- **Dashboard admin** : http://localhost:3000/admin
  - Vue d'ensemble
  - Statistiques

### Pour l'hôtesse d'accueil :
- **Scanner QR** : http://localhost:3000/scan-v2
  - Scanner optimisé avec couleurs
  - Affichage immédiat de la table et siège
  - Check-in automatique

## 🎨 5. SYSTÈME DE COULEURS DES TABLES

| Table | Nom | Couleur | Code |
|-------|-----|---------|------|
| 1 | Table d'honneur | Or ⭐ | #FFD700 |
| 2 | Famille proche 1 | Violet Royal | #8B008B |
| 3 | Famille proche 2 | Violet Doux | #9370DB |
| 4-6 | Famille | Nuances de Bleu | |
| 7-8 | Amis marié | Verts | |
| 9-10 | Amis mariée | Roses | |
| 11-25 | Autres invités | Couleurs variées | |
| 26 | Table enfants | Rose Bonbon | #FFB6C1 |
| 27-30 | Tables supplémentaires | Gris | |

## 📲 6. GÉNÉRATION DES QR CODES

Les QR codes sont générés automatiquement lors de l'import.
Format : `WEDDING-{ID}-{TIMESTAMP}`

Pour voir/exporter les QR codes :
1. Allez dans l'admin
2. Sélectionnez un invité
3. Le QR code est disponible pour impression/envoi

## ⚡ 7. FONCTIONNALITÉS CLÉS

✅ **Drag & Drop** : Glissez les invités entre les tables
✅ **Couleurs visuelles** : Chaque table a sa couleur unique
✅ **Mobile First** : 100% responsive, optimisé pour téléphone
✅ **Scan rapide** : Check-in instantané avec vibration tactile
✅ **Historique** : Traçabilité de tous les changements
✅ **Temps réel** : Synchronisation instantanée

## 🆘 8. EN CAS DE PROBLÈME

### La base de données ne se crée pas ?
- Vérifiez que vous êtes dans le bon projet Supabase
- Exécutez les scripts dans l'ordre exact
- Regardez les messages d'erreur dans Supabase

### L'import Excel ne fonctionne pas ?
- Vérifiez que le fichier `plantable.xlsx` est bien présent
- Activez l'environnement virtuel : `source venv/bin/activate`
- Vérifiez les variables d'environnement dans `.env.local`

### Le scanner ne démarre pas ?
- Utilisez HTTPS en production (requis pour la caméra)
- Autorisez l'accès à la caméra dans le navigateur
- Testez sur `/camera-test` d'abord

## 🎯 9. WORKFLOW LE JOUR J

1. **Avant l'événement** :
   - Assignez tous les invités aux tables
   - Générez et envoyez les QR codes
   - Testez le scanner

2. **Pendant l'événement** :
   - L'hôtesse scanne les QR codes sur `/scan-v2`
   - La couleur de la table apparaît immédiatement
   - L'invité est dirigé vers sa table/siège
   - Check-in automatique

3. **Suivi en temps réel** :
   - Dashboard admin pour voir qui est arrivé
   - Statistiques de présence
   - Gestion des changements de dernière minute

---

**Support** : En cas de besoin, tous les fichiers sources sont dans le projet.
**Backup** : Faites un export Supabase avant l'événement !