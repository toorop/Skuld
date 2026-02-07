# Suivi d'avancement — Skuld

Dernière mise à jour : 2026-02-07

---

## Résumé

| Phase | Description                  | Avancement | Statut       |
| ----- | ---------------------------- | ---------- | ------------ |
| 0     | Fondations (Monorepo)        | 0%         | En cours     |
| 1     | Backend (API Hono)           | 0%         | Non commencé |
| 2     | Frontend (Vue 3)             | 0%         | Non commencé |
| 3     | Intégration, E2E & Polish    | 0%         | Non commencé |
| 4     | Post-MVP                     | —          | Futur        |

---

## Phase 0 — Fondations

### 0.1 Structure monorepo
- [x] package.json racine + workspaces
- [x] Configuration TypeScript partagée
- [x] Configuration Vitest racine
- [x] .env.example
- [x] .gitignore
- [x] .nvmrc

### 0.2 Package partagé (`packages/shared`)
- [ ] Types TypeScript (enums, entités, API)
- [ ] Schémas Zod (settings, contacts, documents, transactions)
- [ ] Constantes (seuils URSSAF, types MIME, etc.)
- [ ] Tests validation Zod

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
- [ ] Configuration Vitest (miniflare)

### 1.2 Middleware & tests
- [ ] Auth JWT
- [ ] CORS
- [ ] Client Supabase
- [ ] Helpers réponse API
- [ ] Validation Zod
- [ ] Gestion d'erreurs
- [ ] Tests middleware

### 1.3 Routes Settings + tests
- [ ] CRUD settings (6 routes)
- [ ] Tests setup, mise à jour, refus double setup

### 1.4 Routes Contacts + tests
- [ ] CRUD complet (5 routes)
- [ ] Tests CRUD, recherche, validation

### 1.5 Routes Documents + tests
- [ ] CRUD + actions (9 routes)
- [ ] Tests immutabilité, numérotation, calculs fiscaux, conversion

### 1.6 Génération PDF + tests
- [ ] Templates PDF (facture, devis, avoir, certificat cession)
- [ ] Tests génération et contenu

### 1.7 Routes Transactions + tests
- [ ] CRUD complet (5 routes)
- [ ] Tests CRUD, création auto proof_bundle

### 1.8 Routes Preuves + tests
- [ ] Upload, bundle, download, cession PDF (4 routes)
- [ ] Tests validation MIME/taille, complétude bundle

### 1.9 Routes Dashboard + tests
- [ ] Totaux URSSAF + export CSV (2 routes)
- [ ] Tests agrégation, alertes seuils, export CSV

---

## Phase 2 — Frontend

### 2.1 Scaffolding
- [ ] Vue 3 + Vite + Tailwind + Pinia + Router
- [ ] Client API typé
- [ ] Vue I18n
- [ ] Configuration Vitest + Vue Test Utils

### 2.2 Layout & Navigation
- [ ] Layout public / authentifié
- [ ] Sidebar
- [ ] Guards de route
- [ ] Composants globaux (loading, toast)

### 2.3 Auth & Setup (Module 0)
- [ ] Page login
- [ ] Store auth
- [ ] Page setup

### 2.4 Contacts (Module A) + tests
- [ ] Liste + recherche
- [ ] Formulaire création/édition
- [ ] Fiche détail
- [ ] Tests ContactForm

### 2.5 Documents (Module B) + tests
- [ ] Liste avec onglets
- [ ] Formulaire avec éditeur de lignes
- [ ] Détail + actions
- [ ] Aperçu PDF
- [ ] Conversion devis → facture
- [ ] Tests DocumentLineEditor (calculs fiscaux)

### 2.6 Trésorerie (Module C) + tests
- [ ] Liste transactions
- [ ] Formulaire création
- [ ] Workflow achat occasion
- [ ] Gestion des preuves
- [ ] Tests ProofUploader, ProofBundle

### 2.7 Dashboard URSSAF (Module D) + tests
- [ ] Totaux par catégorie
- [ ] Sélecteur de période
- [ ] Alertes de seuil
- [ ] Export CSV
- [ ] Tests UrsaffTotals

### 2.8 Paramètres (Module E)
- [ ] Formulaire profil
- [ ] Upload logo
- [ ] Export données
- [ ] Suppression compte

---

## Phase 3 — Intégration, E2E & Polish

### 3.1 Tests E2E (Playwright)
- [ ] Setup Playwright
- [ ] E2E : inscription + setup
- [ ] E2E : flux facturation complet
- [ ] E2E : achat occasion + preuves
- [ ] E2E : dashboard URSSAF
- [ ] E2E : export CSV

### 3.2 Intégration
- [ ] Vérification immutabilité, calculs URSSAF, numérotation

### 3.3 Responsive & UX
- [ ] Mobile, états vides, messages FR, feedback

### 3.4 Sécurité
- [ ] RLS, uploads, presigned URLs, single account

### 3.5 Documentation
- [ ] README final, captures d'écran, CONTRIBUTING, CHANGELOG

### 3.6 CI/CD
- [ ] GitHub Actions : lint + tests unitaires + E2E

---

## Journal des changements

| Date       | Description                                               |
| ---------- | --------------------------------------------------------- |
| 2026-02-07 | Création de la spécification, CLAUDE.md, README, roadmap  |
| 2026-02-07 | Ajout stratégie de tests dans chaque phase                |
| 2026-02-07 | Phase 0.1 terminée : monorepo, TS, Vitest, .env, .gitignore |
