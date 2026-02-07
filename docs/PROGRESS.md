# Suivi d'avancement — Skuld

Dernière mise à jour : 2026-02-07

---

## Résumé

| Phase | Description                | Avancement | Statut       |
| ----- | -------------------------- | ---------- | ------------ |
| 0     | Fondations (Monorepo)      | 0%         | Non commencé |
| 1     | Backend (API Hono)         | 0%         | Non commencé |
| 2     | Frontend (Vue 3)           | 0%         | Non commencé |
| 3     | Intégration & Polish       | 0%         | Non commencé |
| 4     | Post-MVP                   | —          | Futur        |

---

## Phase 0 — Fondations

### 0.1 Structure monorepo
- [ ] package.json racine + workspaces
- [ ] Configuration TypeScript partagée
- [ ] .env.example
- [ ] .gitignore
- [ ] .nvmrc

### 0.2 Package partagé (`packages/shared`)
- [ ] Types TypeScript (enums, entités, API)
- [ ] Schémas Zod (settings, contacts, documents, transactions)
- [ ] Constantes (seuils URSSAF, types MIME, etc.)

### 0.3 Migrations SQL
- [ ] Enums
- [ ] Table settings
- [ ] Table sequences + fonction next_sequence()
- [ ] Table contacts
- [ ] Tables documents + document_lines + trigger immutabilité
- [ ] Table transactions
- [ ] Tables proof_bundles + proofs
- [ ] RLS policies
- [ ] Index
- [ ] Trigger updated_at

---

## Phase 1 — Backend

### 1.1 Scaffolding
- [ ] package.json + dépendances
- [ ] wrangler.toml
- [ ] Point d'entrée Hono

### 1.2 Middleware
- [ ] Auth JWT
- [ ] CORS
- [ ] Client Supabase
- [ ] Helpers réponse API
- [ ] Validation Zod
- [ ] Gestion d'erreurs

### 1.3 Routes Settings
- [ ] POST /api/setup
- [ ] GET /api/settings
- [ ] PUT /api/settings
- [ ] POST /api/settings/logo
- [ ] GET /api/settings/export
- [ ] DELETE /api/settings/account

### 1.4 Routes Contacts
- [ ] CRUD complet (5 routes)

### 1.5 Routes Documents
- [ ] CRUD + actions (9 routes)

### 1.6 Génération PDF
- [ ] Template facture
- [ ] Template devis
- [ ] Template avoir
- [ ] Template certificat de cession

### 1.7 Routes Transactions
- [ ] CRUD complet (5 routes)

### 1.8 Routes Preuves
- [ ] Upload, bundle, download, cession PDF (4 routes)

### 1.9 Routes Dashboard
- [ ] Totaux URSSAF + export CSV (2 routes)

---

## Phase 2 — Frontend

### 2.1 Scaffolding
- [ ] Vue 3 + Vite + Tailwind + Pinia + Router
- [ ] Client API typé
- [ ] Vue I18n

### 2.2 Layout & Navigation
- [ ] Layout public / authentifié
- [ ] Sidebar
- [ ] Guards de route
- [ ] Composants globaux (loading, toast)

### 2.3 Auth & Setup (Module 0)
- [ ] Page login
- [ ] Store auth
- [ ] Page setup

### 2.4 Contacts (Module A)
- [ ] Liste + recherche
- [ ] Formulaire création/édition
- [ ] Fiche détail

### 2.5 Documents (Module B)
- [ ] Liste avec onglets
- [ ] Formulaire avec éditeur de lignes
- [ ] Détail + actions
- [ ] Aperçu PDF
- [ ] Conversion devis → facture

### 2.6 Trésorerie (Module C)
- [ ] Liste transactions
- [ ] Formulaire création
- [ ] Workflow achat occasion
- [ ] Gestion des preuves

### 2.7 Dashboard URSSAF (Module D)
- [ ] Totaux par catégorie
- [ ] Sélecteur de période
- [ ] Alertes de seuil
- [ ] Export CSV

### 2.8 Paramètres (Module E)
- [ ] Formulaire profil
- [ ] Upload logo
- [ ] Export données
- [ ] Suppression compte

---

## Phase 3 — Intégration & Polish

- [ ] Tests flux complets
- [ ] Vérification PDF
- [ ] Responsive mobile
- [ ] Messages d'erreur FR
- [ ] Vérification sécurité (RLS, uploads, presigned URLs)
- [ ] Documentation finale

---

## Journal des changements

| Date       | Description                                               |
| ---------- | --------------------------------------------------------- |
| 2026-02-07 | Création de la spécification, CLAUDE.md, README, roadmap  |
