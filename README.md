# Skuld — Gestion Auto-Entrepreneur

Skuld est une application web open-source de gestion pour les **auto-entrepreneurs (micro-entreprises) français**. Elle couvre la facturation, le suivi de trésorerie, la conformité fiscale URSSAF et la traçabilité des achats d'occasion.

## Fonctionnalités

- **Facturation** — Devis, factures et avoirs avec numérotation séquentielle conforme. Génération PDF avec toutes les mentions légales obligatoires.
- **Ventilation fiscale** — Chaque ligne de document est catégorisée (BIC Vente, BIC Presta, BNC) pour faciliter les déclarations URSSAF.
- **Trésorerie** — Suivi des recettes et dépenses, rapprochement avec les factures.
- **Achats d'occasion** — Système de "faisceau de preuves" pour les achats auprès de particuliers (capture d'annonce, preuve de paiement, certificat de cession).
- **Dashboard URSSAF** — Totaux par catégorie fiscale (mensuel ou trimestriel), alertes de dépassement de seuils, export CSV.
- **Gestion des contacts** — Clients et fournisseurs, particuliers et professionnels.

## Prérequis

Skuld est une application **self-hosted** : vous déployez votre propre instance. Vous aurez besoin de deux comptes gratuits :

### Cloudflare (gratuit)

Le [plan gratuit Cloudflare](https://www.cloudflare.com/plans/) suffit largement pour un usage individuel :

- **Cloudflare Pages** — Héberge l'interface web (frontend). Builds et déploiements illimités.
- **Cloudflare Workers** — Exécute l'API (backend). 100 000 requêtes/jour en gratuit, ce qui est plus que suffisant.
- **Cloudflare R2** — Stocke les fichiers (factures PDF, preuves d'achat). 10 Go de stockage gratuit.

Pour créer un compte : [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### Supabase (gratuit)

Le [plan gratuit Supabase](https://supabase.com/pricing) fournit tout ce dont Skuld a besoin :

- **Base de données PostgreSQL** — 500 Mo de stockage (largement suffisant pour des années de facturation).
- **Authentification** — Gestion du login sécurisée, jusqu'à 50 000 utilisateurs actifs (Skuld n'en utilise qu'un seul).

Pour créer un compte : [supabase.com/dashboard](https://supabase.com/dashboard)

### Sur votre machine (pour le déploiement)

- **Node.js** >= 18
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
3. Lancez les migrations SQL pour créer les tables :

```bash
# Avec la CLI Supabase (recommandé)
npx supabase link --project-ref VOTRE_REF_PROJET
npx supabase db push
```

### 3. Créer un bucket R2 sur Cloudflare

1. Dans le [dashboard Cloudflare](https://dash.cloudflare.com/), allez dans R2 > Créer un bucket.
2. Nommez-le `skuld-proofs`.
3. Créez une clé API R2 (R2 > Gérer les clés API).

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplissez le fichier `.env` avec vos clés Supabase et Cloudflare R2 :

```env
# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare R2
R2_BUCKET_NAME=skuld-proofs
R2_ACCESS_KEY_ID=votre_clé
R2_SECRET_ACCESS_KEY=votre_secret

# Application
APP_URL=https://votre-skuld.pages.dev
```

### 5. Déployer

```bash
# Déployer le backend (Cloudflare Workers)
npm run deploy:backend

# Déployer le frontend (Cloudflare Pages)
npm run deploy:frontend
```

### 6. Première utilisation

1. Ouvrez l'URL de votre application.
2. Créez votre compte (un seul compte par instance).
3. Remplissez vos informations d'auto-entrepreneur (SIRET, adresse, etc.).
4. C'est prêt !

## Stack technique

| Composant | Technologie |
| --------- | ----------- |
| Frontend  | Vue 3, Vite, TypeScript, Tailwind CSS, Pinia |
| Backend   | Cloudflare Workers, Hono, TypeScript |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth |
| Stockage fichiers | Cloudflare R2 |
| Validation | Zod (partagée front/back) |
| PDF | pdf-lib |

## Structure du projet

```
skuld/
├── frontend/              # Application Vue 3
├── backend/               # API Hono (Cloudflare Worker)
├── packages/
│   └── shared/            # Types et schémas Zod partagés
├── supabase/
│   └── migrations/        # Migrations SQL
├── docs/
│   ├── SPECIFICATION.md   # Spécification complète
│   ├── ROADMAP.md         # Plan de développement
│   └── PROGRESS.md        # Suivi d'avancement
└── README.md
```

## Développement local

```bash
# Installer les dépendances
npm install

# Lancer le frontend en développement
npm run dev:frontend

# Lancer le backend en développement (Wrangler)
npm run dev:backend
```

## Licence

[MIT](LICENSE)
