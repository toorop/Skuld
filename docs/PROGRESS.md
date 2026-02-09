# Suivi d'avancement — Skuld

Dernière mise à jour : 2026-02-09

---

## Résumé

| Phase | Description                  | Avancement | Statut       |
| ----- | ---------------------------- | ---------- | ------------ |
| 0     | Fondations (Monorepo)        | 100%       | Terminé      |
| 1     | Backend (API Hono)           | 100%       | Terminé      |
| 2     | Frontend (Vue 3)             | 100%       | Terminé      |
| 3     | Intégration, E2E & Polish    | 70%        | En cours     |
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
- [x] Types TypeScript (enums, entités, API)
- [x] Schémas Zod (settings, contacts, documents, transactions)
- [x] Constantes (seuils URSSAF, types MIME, etc.)
- [x] Tests validation Zod (52 tests)

### 0.3 Migrations SQL
- [x] Enums
- [x] Table settings (+ contrainte single-row)
- [x] Table sequences + fonction next_sequence()
- [x] Table contacts
- [x] Tables documents + document_lines + triggers (immutabilité + recalcul totaux)
- [x] Table transactions
- [x] Tables proof_bundles + proofs + trigger mise à jour flags
- [x] RLS policies (fonction is_owner + policies sur 7 tables)
- [x] Index (14 index de performance)
- [x] Trigger updated_at

---

## Phase 1 — Backend

### 1.1 Scaffolding
- [x] package.json + dépendances
- [x] wrangler.toml + wrangler.toml.example + .dev.vars.example
- [x] Point d'entrée Hono (`index.ts` + `types.ts`)
- [x] Configuration Vitest

### 1.2 Middleware & utilitaires
- [x] Auth JWT (`middleware/auth.ts`) — 6 tests
- [x] CORS (`middleware/cors.ts`)
- [x] Client Supabase (`lib/supabase.ts`)
- [x] Helpers réponse API (`lib/response.ts`)
- [x] Validation Zod (`lib/validation.ts`)
- [x] Pagination (`lib/pagination.ts`) — 12 tests
- [x] Gestion d'erreurs (`middleware/error-handler.ts`) — 1 test

### 1.3 Routes Settings
- [x] POST /api/setup — configuration initiale (`routes/setup.ts`)
- [x] GET/PUT /api/settings, POST logo, GET export, DELETE account (`routes/settings.ts`)

### 1.4 Routes Contacts
- [x] CRUD complet + recherche + protection suppression (`routes/contacts.ts`)

### 1.5 Routes Documents
- [x] CRUD + send/pay/cancel/convert/pdf (9 routes) (`routes/documents.ts`)

### 1.6 Génération PDF
- [x] Template PDF document commercial (facture/devis/avoir) — 8 tests + 12 tests contenu
- [x] Template PDF certificat de cession — 6 tests + 7 tests contenu
- [x] Helpers PDF (formatage, dessin) — 27 tests
- [x] Stockage R2 + intégration routes (/send + /cession-pdf)

### 1.7 Routes Transactions
- [x] CRUD + création auto proof_bundle (`routes/transactions.ts`)

### 1.8 Routes Preuves
- [x] Upload, bundle, download, cession PDF (`routes/proofs.ts`)

### 1.9 Routes Dashboard
- [x] Totaux URSSAF mensuel/trimestriel + alertes seuils + export CSV (`routes/dashboard.ts`)

---

## Phase 2 — Frontend

### 2.1 Scaffolding
- [x] Vue 3 + Vite + Tailwind + Pinia + Router + Headless UI + vue-i18n
- [x] Client API typé (`lib/api.ts`)
- [x] Client Supabase (`lib/supabase.ts`)
- [x] i18n FR complet (`fr.json`)
- [x] Build Vite OK (344 Ko / 108 Ko gzip)

### 2.2 Layout & Navigation
- [x] Layout authentifié (sidebar + header + main)
- [x] Sidebar avec icônes Heroicons
- [x] Guards de route (auth, setup, redirections)
- [x] Composants globaux (AppLoading, AppToast + useToast)

### 2.3 Auth & Setup (Module 0)
- [x] Page login (email/password + magic link)
- [x] Store auth (session, login, logout, signUp, checkSetup)
- [x] Page setup (formulaire complet)

### 2.4 Contacts (Module A) + tests
- [x] Store Pinia contacts (CRUD + mapping snake_case → camelCase)
- [x] Liste + recherche + filtre par type + pagination
- [x] Formulaire création/édition (ContactForm réutilisable + validation Zod)
- [x] Fiche détail (lecture + édition inline + suppression)
- [x] Composant ConfirmDialog réutilisable (Headless UI)
- [ ] Tests ContactForm

### 2.5 Documents (Module B) + tests
- [x] Store Pinia documents (CRUD + send/pay/cancel/convert + mapping)
- [x] Liste avec onglets (Devis/Factures/Avoirs) + filtre statut + pagination
- [x] Formulaire avec éditeur de lignes (DocumentLineEditor + sous-totaux par catégorie)
- [x] DocumentForm réutilisable (sélecteur contact, dates auto, paiement, lignes, options)
- [x] Détail + actions (envoyer, payer, annuler, convertir, télécharger PDF)
- [x] Conversion devis → facture + confirmation dialogs
- [ ] Tests DocumentLineEditor (calculs fiscaux)

### 2.6 Trésorerie (Module C) + tests
- [x] Store Pinia transactions (CRUD + mapping snake_case → camelCase)
- [x] Liste transactions paginée + filtres (direction, catégorie)
- [x] Formulaire création/édition (TransactionForm réutilisable + validation Zod)
- [x] Fiche détail + suppression
- [x] Composant ProofUploader (upload fichier vers R2)
- [x] Composant ProofBundle (checklist visuelle du dossier de preuves)
- [ ] Tests ProofUploader, ProofBundle

### 2.7 Dashboard URSSAF (Module D) + tests
- [x] Store Pinia settings (fetch/cache, mapping snake_case → camelCase)
- [x] Store Pinia dashboard (fetch URSSAF + export CSV)
- [x] Page complète : sélecteur de période, 3 cartes fiscales, barres de progression, alertes
- [x] Export CSV avec téléchargement automatique
- [ ] Tests DashboardView

### 2.8 Paramètres (Module E)
- [x] Formulaire profil entreprise (12 champs, validation Zod, grille responsive)
- [x] Upload logo (validation type/taille, aperçu, action immédiate)
- [x] Personnalisation documents (mention TVA, délai paiement, mode paiement)
- [x] Déclaration URSSAF (radio buttons mensuelle/trimestrielle)
- [x] Export données (téléchargement JSON)
- [x] Suppression compte (dialog Headless UI, double confirmation « SUPPRIMER »)

---

## Phase 3 — Intégration, E2E & Polish

### 3.1 Tests E2E (Playwright)
- [x] Setup Playwright + configuration (`playwright.config.ts`, `frontend/.env.test`)
- [x] Fixtures : factories test-data + helpers auth/API mock (`e2e/fixtures/`)
- [x] E2E : inscription + setup (`e2e/setup.spec.ts`)
- [x] E2E : flux facturation complet (`e2e/invoicing.spec.ts`)
- [x] E2E : achat occasion + preuves (`e2e/second-hand.spec.ts`)
- [x] E2E : dashboard URSSAF (`e2e/dashboard.spec.ts`)
- [x] E2E : export CSV (`e2e/export.spec.ts`)
- [x] E2E : paramètres (`e2e/settings.spec.ts`)

### 3.2 Tests d'intégration (37 tests)
- [x] Immutabilité documents — 19 tests (`documents-immutability.test.ts`)
  - PUT sur SENT/PAID → 409, PUT sur DRAFT → 200
  - SEND sur SENT/PAID → 409, SEND sur DRAFT → 200
  - PAY sur DRAFT/PAID → 409, PAY sur SENT → 200 (+ création transaction)
  - CANCEL sur CANCELLED → 409, CANCEL sur DRAFT/SENT/PAID → 200 (+ avoir)
  - CONVERT non-QUOTE → 409
  - PDF sans référence → 409, PDF doc inexistant → 404
- [x] Calculs URSSAF — 10 tests (`dashboard-urssaf.test.ts`)
  - Agrégation mensuelle et trimestrielle
  - Totaux mixtes BIC_VENTE + BIC_PRESTA + BNC
  - Alertes seuil 80% et 100% (exceeded)
  - Pas d'alerte sous 80%, totaux à 0 sans transactions
  - Catégorie null ignorée dans l'agrégation
  - Export CSV format correct (séparateur ;, montants virgule)
  - Export CSV sans dates → 422
- [x] Numérotation séquentielle — 8 tests (`documents-sequencing.test.ts`)
  - Premier envoi → FAC-YYYY-0001 via rpc next_sequence
  - Envois successifs → séquence incrémentée
  - Types différents : INVOICE→FAC-, QUOTE→DEV-
  - Référence stockée dans le document via update
  - Erreur séquence → 500
  - Conversion devis → facture DRAFT sans référence
  - Avoir créé en DRAFT sans référence
  - Référence dans le Content-Disposition du PDF

### 3.3 Tests contenu PDF (19 tests)
- [x] Documents commerciaux — 12 tests (`document-pdf.test.ts`)
  - Mention TVA (`art. 293 B du CGI`) présente sur tous les documents
  - Pénalités de retard (`article L.441-10`) uniquement sur les factures
  - IBAN/BIC affichés quand renseignés
  - Devis et avoir sans pénalités de retard
  - Référence document, label type (FACTURE/DEVIS/AVOIR)
  - Nom entreprise + SIRET, nom destinataire
  - Total HT formaté, sous-totaux par catégorie (activité mixte)
  - Mode de paiement
- [x] Certificat de cession — 7 tests (`cession-pdf.test.ts`)
  - Titre « CERTIFICAT DE CESSION »
  - Nom du vendeur (contact), nom acheteur (entreprise) + SIRET
  - Description du bien, montant formaté, date formatée
  - Mention légale « Article 321-1 du Code penal »

### 3.4 Responsive & UX
- [x] Sidebar mobile : drawer avec overlay + Transition, bouton hamburger (`AuthLayout`, `AppSidebar`, `AppHeader`)
- [x] Header responsive : email et texte déconnexion cachés sur mobile, padding adaptatif
- [x] Toasts mobile : pleine largeur sur petit écran (`AppToast`)
- [x] Empty states améliorés : icône + texte + CTA (contacts, documents, transactions, dashboard)
- [x] Dashboard en-tête responsive : flex-col mobile, bouton export pleine largeur
- [x] DocumentLineEditor : colonnes Unité/Catégorie cachées sur mobile, sous-totaux pleine largeur

### 3.5 Sécurité
- [ ] RLS, uploads, presigned URLs, single account

### 3.6 Documentation
- [ ] README final, captures d'écran, CONTRIBUTING, CHANGELOG

### 3.7 CI/CD
- [x] GitHub Actions : lint + tests unitaires sur push/PR (`ci.yml`)

---

## Journal des changements

| Date       | Description                                               |
| ---------- | --------------------------------------------------------- |
| 2026-02-07 | Création de la spécification, CLAUDE.md, README, roadmap  |
| 2026-02-07 | Ajout stratégie de tests dans chaque phase                |
| 2026-02-07 | Phase 0.1 terminée : monorepo, TS, Vitest, .env, .gitignore |
| 2026-02-07 | Phase 0.2 terminée : types, schémas Zod, constantes, 52 tests |
| 2026-02-07 | Phase 0.3 terminée : 10 migrations SQL (tables, triggers, RLS, index) |
| 2026-02-07 | Phase 1 — Routes API : scaffolding, middleware, 7 fichiers routes, 0 erreur TS |
| 2026-02-07 | Phase 1.6 — Génération PDF : documents commerciaux + certificat de cession |
| 2026-02-07 | Phase 1 terminée — 60 tests backend (auth, pagination, PDF), 112 tests au total |
| 2026-02-07 | Phase 2.1-2.3 — Scaffolding frontend, layout, auth, setup, 12 routes, build OK |
| 2026-02-07 | Phase 2.4 — Module Contacts : store, liste paginée, formulaire, détail, ConfirmDialog |
| 2026-02-07 | Phase 2.5 — Module Documents : store, liste onglets, éditeur lignes, formulaire, détail + actions |
| 2026-02-08 | Phase 2.6 — Module Trésorerie : store, liste paginée, formulaire, détail, ProofUploader, ProofBundle |
| 2026-02-08 | Phase 2.7 — Dashboard URSSAF : store settings, store dashboard, vue complète, export CSV |
| 2026-02-08 | Phase 2.8 — Paramètres : profil entreprise, logo, personnalisation docs, URSSAF, export, suppression compte |
| 2026-02-08 | Phase 3.1 — Tests E2E Playwright : 6 specs (setup, invoicing, second-hand, dashboard, export, settings), fixtures + helpers, 6/6 passing |
| 2026-02-09 | Phase 3.2 — Tests d'intégration : immutabilité (19), URSSAF (10), numérotation (8) — 149 tests au total |
| 2026-02-09 | Phase 3.3 — Tests contenu PDF : documents (12), cession (7) — 168 tests au total |
| 2026-02-09 | Phase 3.7 — CI/CD : workflow GitHub Actions (type-check + tests) |
| 2026-02-09 | Phase 3.4 — Responsive & UX : sidebar mobile drawer, hamburger, empty states, toasts, DocumentLineEditor |
