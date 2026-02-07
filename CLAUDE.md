# CLAUDE.md — Instructions pour l'agent IA

## Projet

Skuld est un ERP Light open-source pour auto-entrepreneurs français. Self-hosted, single-tenant.

## Langue

- **Tout en français** : commentaires, documentation, messages d'erreur, commits, noms de variables d'UI.
- Exceptions : noms de variables/fonctions en anglais dans le code (convention standard), mots-clés techniques (API, CRUD, etc.).

## Stack technique

- **Monorepo** avec workspaces npm
- **Frontend** : Vue 3 (`<script setup>` + Composition API), Vite, TypeScript strict, Tailwind CSS, Pinia, VeeValidate + Zod, Vue I18n, Supabase Auth SDK
- **Backend** : Cloudflare Workers, Hono, TypeScript strict, Zod, pdf-lib
- **Partagé** : `packages/shared/` — types, constantes, schémas Zod
- **BDD** : Supabase (PostgreSQL), migrations dans `supabase/migrations/`
- **Stockage fichiers** : Cloudflare R2

## Structure du monorepo

```
skuld/
├── frontend/          # Vue 3 SPA (Cloudflare Pages)
├── backend/           # Cloudflare Worker (Hono)
├── packages/
│   └── shared/        # Types, constantes, schémas Zod
├── supabase/
│   └── migrations/    # SQL versionnés (ordre chronologique)
├── SPECIFICATION.md   # Spec fonctionnelle et technique complète
├── CLAUDE.md          # Ce fichier
└── README.md
```

## Conventions de code

- TypeScript `strict: true` partout
- `camelCase` en TypeScript, `snake_case` en SQL
- Composants Vue : PascalCase, un fichier `.vue` par composant
- Réponses API : `{ data, error, meta }`
- Schémas Zod partagés entre front et back via `packages/shared`
- Validation Zod côté API (entrée) + côté front (formulaires)

## Conventions Git

- Conventional Commits en français pour la description : `feat: ajouter la gestion des contacts`
- Préfixes : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Ne jamais faire de commit ou push** — l'utilisateur s'en charge

## Base de données

- Les migrations SQL sont dans `supabase/migrations/` avec un préfixe horodaté : `YYYYMMDDHHMMSS_description.sql`
- RLS activé sur toutes les tables (single-tenant mais protégé par JWT)
- Table `settings` = une seule ligne (config de l'auto-entrepreneur)
- Numérotation des documents via la fonction `next_sequence()` avec `FOR UPDATE`
- Trigger d'immutabilité sur les documents envoyés/payés

## Points d'attention

- **Conformité fiscale** : distinction BIC_VENTE / BIC_PRESTA / BNC obligatoire sur chaque ligne de document
- **Immutabilité** : un document SENT ou PAID ne peut plus être modifié (seulement changer de statut)
- **Achats occasion** : workflow proof_bundle obligatoire (annonce + paiement + cession)
- **Seuils URSSAF** : 188 700€ BIC Vente, 77 700€ BIC Presta/BNC — alertes à implémenter
- **Pas de TVA** : auto-entrepreneur = franchise en base de TVA (mention obligatoire sur les factures)
