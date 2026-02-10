# Skuld — Gestion Auto-Entrepreneur

[![CI](https://github.com/toorop/Skuld/actions/workflows/ci.yml/badge.svg)](https://github.com/toorop/Skuld/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Skuld est une application web **open-source** de gestion pour les **auto-entrepreneurs (micro-entreprises) français**. Self-hosted, single-tenant : une instance = un utilisateur, vos données restent chez vous.

<!-- TODO: ajouter des captures d'écran ici
![Dashboard](docs/screenshots/dashboard.png)
![Facture PDF](docs/screenshots/facture-pdf.png)
-->

## Fonctionnalités

- **Facturation** — Devis, factures et avoirs avec numérotation séquentielle conforme. Génération PDF avec toutes les mentions légales obligatoires (TVA, pénalités de retard, IBAN).
- **Ventilation fiscale** — Chaque ligne de document est catégorisée (BIC Vente, BIC Presta, BNC) pour faciliter les déclarations URSSAF.
- **Trésorerie** — Suivi des recettes et dépenses, rapprochement avec les factures.
- **Achats d'occasion** — Système de "faisceau de preuves" pour les achats auprès de particuliers (capture d'annonce, preuve de paiement, certificat de cession PDF généré automatiquement).
- **Dashboard URSSAF** — Totaux par catégorie fiscale (mensuel ou trimestriel), barres de progression, alertes de dépassement de seuils, export CSV.
- **Gestion des contacts** — Clients et fournisseurs, particuliers et professionnels.
- **Paramètres** — Profil entreprise, upload logo, personnalisation documents, fréquence de déclaration, export complet des données (JSON), suppression de compte.

## Stack technique

| Composant | Technologie |
| --------- | ----------- |
| Frontend  | Vue 3 (Composition API), Vite, TypeScript, Tailwind CSS, Pinia, Headless UI |
| Backend   | Cloudflare Workers, Hono, TypeScript |
| Base de données | Supabase (PostgreSQL) avec RLS |
| Authentification | Supabase Auth (email + magic link) |
| Stockage fichiers | Cloudflare R2 |
| Validation | Zod (schémas partagés front/back) |
| PDF | pdf-lib |
| Tests | Vitest (185 tests unitaires et d'intégration), Playwright (E2E) |
| CI | GitHub Actions |

## Prérequis

Skuld est une application **self-hosted** : vous déployez votre propre instance. Vous aurez besoin de deux comptes gratuits :

### Cloudflare (gratuit)

Le [plan gratuit Cloudflare](https://www.cloudflare.com/plans/) suffit largement pour un usage individuel :

- **Cloudflare Pages** — Héberge l'interface web (frontend). Builds et déploiements illimités.
- **Cloudflare Workers** — Exécute l'API (backend). 100 000 requêtes/jour en gratuit.
- **Cloudflare R2** — Stocke les fichiers (factures PDF, preuves d'achat). 10 Go de stockage gratuit.

Pour créer un compte : [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### Supabase (gratuit)

Le [plan gratuit Supabase](https://supabase.com/pricing) fournit tout ce dont Skuld a besoin :

- **Base de données PostgreSQL** — 500 Mo de stockage (largement suffisant pour des années de facturation).
- **Authentification** — Gestion du login sécurisée (email + magic link).

Pour créer un compte : [supabase.com/dashboard](https://supabase.com/dashboard)

### Sur votre machine (pour le déploiement)

- **Node.js** >= 22
- **npm** >= 9

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/toorop/Skuld.git
cd Skuld
npm install
```

### 2. Créer un projet Supabase

1. Allez sur [supabase.com/dashboard](https://supabase.com/dashboard) et créez un nouveau projet.
2. Notez l'**URL du projet** et la **clé anon** (dans Paramètres > API).
3. Notez également la **clé service role** (même page, section "service_role key" — ne jamais l'exposer côté client).
4. Notez la **référence du projet** : c'est la chaîne de caractères visible dans l'URL du dashboard, juste après `/project/`. Par exemple, si l'URL est `https://supabase.com/dashboard/project/abcdefghijklmnop`, la référence est `abcdefghijklmnop`.
5. Lancez les commandes suivantes pour créer les tables :

```bash
# Se connecter à Supabase (ouvre le navigateur pour autoriser l'accès)
npx supabase login

# Lier votre projet (remplacez par votre référence notée à l'étape 4)
npx supabase link --project-ref VOTRE_REF_PROJET

# Appliquer les migrations (crée toutes les tables nécessaires)
npx supabase db push
```

### 3. Créer un bucket R2 sur Cloudflare

1. Dans le [dashboard Cloudflare](https://dash.cloudflare.com/), allez dans **R2 > Créer un bucket**.
2. Nommez-le `skuld-proofs`.
3. Dans **Emplacement**, sélectionnez **Union européenne (EU)** pour garantir que vos fichiers restent hébergés en Europe (conformité RGPD).

### 4. Configurer et déployer le backend

```bash
# Copier et remplir la configuration Wrangler
cp backend/wrangler.toml.example backend/wrangler.toml

# Premier déploiement (crée le Worker sur Cloudflare)
npm run deploy:backend
```

Ensuite, définissez les secrets Supabase. Chaque commande vous demandera de coller la valeur correspondante :

```bash
cd backend

# L'URL de votre projet Supabase (ex: https://abcdefgh.supabase.co)
npx wrangler secret put SUPABASE_URL

# La clé anon de votre projet (Paramètres > API > anon public)
npx wrangler secret put SUPABASE_ANON_KEY

# La clé service role (Paramètres > API > service_role — ne jamais exposer côté client)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

cd ..
```

Notez l'URL du Worker affichée lors du déploiement (ex: `https://skuld-api.votre-compte.workers.dev`).

### 5. Configurer et déployer le frontend

Créez un fichier `frontend/.env.production` avec vos valeurs :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://skuld-api.votre-compte.workers.dev
```

`VITE_API_URL` est l'URL du Worker obtenue à l'étape 5.

```bash
# Construire le frontend
npm run build:frontend

# Déployer sur Cloudflare Pages
npx wrangler pages deploy frontend/dist --project-name=skuld
```

Notez l'URL du frontend affichée à la fin (ex: `https://skuld.pages.dev`).

### 6. Finaliser la configuration

Définissez le dernier secret du backend — l'URL du frontend déployé à l'étape 5 :

```bash
cd backend
npx wrangler secret put APP_URL
# Collez l'URL de votre frontend (ex: https://skuld.pages.dev)
cd ..
```

### 7. Domaine personnalisé (optionnel)

Par défaut, votre application est accessible via les URLs Cloudflare (ex: `skuld.pages.dev`). Si vous possédez un nom de domaine géré par Cloudflare, vous pouvez utiliser vos propres adresses (ex: `app.mondomaine.fr` et `api.mondomaine.fr`).

**Frontend** : dans le [dashboard Cloudflare](https://dash.cloudflare.com/), allez dans **Pages** > votre projet > **Domaines personnalisés** > **Ajouter un domaine personnalisé**. Saisissez le sous-domaine souhaité (ex: `app.mondomaine.fr`). Cloudflare crée automatiquement l'enregistrement DNS.

**Backend** : dans **Workers & Pages** > votre Worker > **Paramètres** > **Domaines et routes** > **Ajouter** > **Domaine personnalisé**. Saisissez le sous-domaine souhaité (ex: `api.mondomaine.fr`).

Ensuite, mettez à jour les URLs :

1. Modifiez `VITE_API_URL` dans `frontend/.env.production` avec la nouvelle URL de l'API, puis reconstruisez et redéployez le frontend :

```bash
npm run build:frontend
npx wrangler pages deploy frontend/dist --project-name=skuld
```

2. Mettez à jour le secret `APP_URL` du backend avec la nouvelle URL du frontend :

```bash
cd backend
npx wrangler secret put APP_URL
# Collez la nouvelle URL (ex: https://app.mondomaine.fr)
cd ..
```

### 8. Première utilisation

1. Ouvrez l'URL de votre application (celle de l'étape 5).
2. Créez votre compte (un seul compte par instance).
3. Remplissez vos informations d'auto-entrepreneur (SIRET, adresse, activité, etc.).
4. C'est prêt !

## Développement local

```bash
# Installer les dépendances
npm install

# Copier les variables d'environnement du backend
cp backend/.dev.vars.example backend/.dev.vars
# Remplir avec vos clés Supabase

# Lancer le backend en développement
npm run dev:backend

# Lancer le frontend en développement (dans un autre terminal)
npm run dev:frontend

# Lancer les tests
npm test

# Type-check + tests
npm run check
```

## Structure du projet

```
skuld/
├── frontend/              # Application Vue 3 (SPA)
│   └── src/
│       ├── components/    # Composants réutilisables
│       ├── views/         # Pages
│       ├── stores/        # Stores Pinia
│       ├── lib/           # Client API, Supabase
│       └── router/        # Routes Vue Router
├── backend/               # API Hono (Cloudflare Worker)
│   └── src/
│       ├── routes/        # Routes API (+ __tests__/)
│       ├── middleware/     # Auth, CORS, erreurs
│       └── lib/           # Supabase, PDF, validation
├── packages/
│   └── shared/            # Types, constantes, schémas Zod
├── supabase/
│   └── migrations/        # 10 migrations SQL
├── e2e/                   # Tests E2E Playwright
├── docs/
│   ├── SPECIFICATION.md   # Spécification fonctionnelle et technique
│   ├── ROADMAP.md         # Plan de développement
│   └── PROGRESS.md        # Suivi d'avancement
├── CONTRIBUTING.md        # Guide de contribution
├── CHANGELOG.md           # Journal des versions
└── README.md
```

## Tests

Le projet dispose d'une couverture de tests complète :

- **185 tests unitaires et d'intégration** (Vitest)
  - 52 tests validation des schémas Zod (packages/shared)
  - 19 tests middleware auth + pagination + gestion d'erreurs
  - 47 tests génération PDF (documents commerciaux, certificats de cession, helpers)
  - 37 tests d'intégration (immutabilité documents, calculs URSSAF, numérotation séquentielle)
  - 17 tests sécurité (auth obligatoire, validation uploads, setup unique)
  - 13 tests contenu PDF (mentions légales, données extraites)
- **6 specs E2E** (Playwright) — inscription, facturation, achats d'occasion, dashboard, export, paramètres

```bash
# Tests unitaires + intégration
npm test

# Tests E2E (nécessite un environnement Supabase de test)
npx playwright test
```

## Sécurité

- **Authentification JWT** sur toutes les routes API (middleware Hono)
- **Row Level Security (RLS)** PostgreSQL — chaque table protégée par une policy `is_owner()`
- **Validation des uploads** — types MIME autorisés (JPEG, PNG, WebP, PDF) et taille maximale (5 Mo preuves, 2 Mo logo)
- **Setup unique** — un seul compte par instance (409 Conflict si déjà configuré)
- **Pas de secrets côté client** — la clé service role Supabase n'est utilisée que dans le Worker

## Conformité fiscale

Skuld respecte les obligations des auto-entrepreneurs français :

- **Mention TVA obligatoire** — "TVA non applicable, art. 293 B du CGI" sur chaque document
- **Pénalités de retard** — mention légale obligatoire sur les factures (art. L.441-10 du Code de commerce)
- **Numérotation séquentielle** — conforme, non modifiable une fois le document envoyé
- **Immutabilité** — un document envoyé ou payé ne peut plus être modifié (verrouillage en base)
- **Ventilation BIC/BNC** — distinction BIC Vente / BIC Presta / BNC sur chaque ligne
- **Seuils URSSAF** — alertes à 80% et 100% des plafonds (188 700 EUR BIC Vente, 77 700 EUR BIC Presta/BNC)

## Licence

[MIT](LICENSE) — Stéphane Depierrepont
