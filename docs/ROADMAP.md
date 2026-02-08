# Roadmap Skuld

Plan de développement détaillé, découpé en phases séquentielles. Chaque phase produit un livrable fonctionnel testable.

**Stack de tests :** Vitest partout (compatible Workers + Vue), Playwright pour le E2E.

---

## Phase 0 — Fondations (Monorepo & Infra)

### 0.1 Structure monorepo
- [x] `package.json` racine avec workspaces npm (`frontend`, `backend`, `packages/shared`)
- [x] Configuration TypeScript partagée (`tsconfig.base.json` + `tsconfig.json` par workspace)
- [x] Configuration Vitest racine
- [x] `.env.example` avec toutes les variables documentées
- [x] `.gitignore` complet (node_modules, dist, .env, .wrangler)
- [x] `.nvmrc` (Node 18+)

### 0.2 Package partagé (`packages/shared`)
- [x] `package.json` + `tsconfig.json`
- [x] Types TypeScript : enums miroir du SQL (`FiscalCategory`, `DocType`, `DocStatus`, etc.)
- [x] Types des entités : `Settings`, `Contact`, `Document`, `DocumentLine`, `Transaction`, `ProofBundle`, `Proof`
- [x] Types API : `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`
- [x] Schémas Zod : validation `Settings` (SIRET, code postal, IBAN)
- [x] Schémas Zod : validation `Contact` (email, SIREN optionnel)
- [x] Schémas Zod : validation `Document` + `DocumentLine`
- [x] Schémas Zod : validation `Transaction`
- [x] Constantes : seuils URSSAF, types MIME autorisés, taille max upload
- [x] **Tests** : validation Zod (valeurs valides, invalides, cas limites SIRET/IBAN)

### 0.3 Migrations SQL (`supabase/migrations/`)
- [x] `00001_enums.sql` — Tous les types ENUM
- [x] `00002_settings.sql` — Table `settings` + contrainte single-row
- [x] `00003_sequences.sql` — Table `sequences` + fonction `next_sequence()`
- [x] `00004_contacts.sql` — Table `contacts`
- [x] `00005_documents.sql` — Tables `documents` + `document_lines` + trigger immutabilité + trigger recalcul totaux
- [x] `00006_transactions.sql` — Table `transactions`
- [x] `00007_proof_bundles.sql` — Tables `proof_bundles` + `proofs` + trigger mise à jour flags
- [x] `00008_rls.sql` — RLS policies sur toutes les tables
- [x] `00009_indexes.sql` — Index de performance
- [x] `00010_updated_at.sql` — Trigger `updated_at` automatique sur toutes les tables

---

## Phase 1 — Backend (API Hono)

### 1.1 Scaffolding backend
- [x] `backend/package.json` avec dépendances (hono, @supabase/supabase-js, zod, pdf-lib)
- [x] `backend/tsconfig.json`
- [x] `backend/wrangler.toml` (bindings R2, variables d'env)
- [x] `wrangler.toml.example` (template sans secrets)
- [x] Point d'entrée `backend/src/index.ts` (app Hono)
- [x] Configuration des types Cloudflare Workers (`Env` avec bindings R2, vars)
- [x] Configuration Vitest backend

### 1.2 Middleware & utilitaires
- [x] Middleware d'authentification JWT Supabase
- [x] Middleware CORS
- [x] Client Supabase (initialisé par requête avec le JWT utilisateur)
- [x] Helper réponse API : `success()`, `error()`, `paginated()`
- [x] Helper validation Zod (middleware Hono)
- [x] Gestion d'erreurs globale (error handler Hono)
- [x] **Tests** : middleware auth (6 tests), error handler (1 test), pagination (12 tests)

### 1.3 Routes Settings
- [x] `POST /api/setup` — Configuration initiale (création settings)
- [x] `GET /api/settings` — Récupérer la configuration
- [x] `PUT /api/settings` — Mettre à jour la configuration
- [x] `POST /api/settings/logo` — Upload logo vers R2
- [x] `GET /api/settings/export` — Export complet des données (JSON)
- [x] `DELETE /api/settings/account` — Suppression du compte
- [x] **Tests** : couverts par tests middleware + E2E Phase 3

### 1.4 Routes Contacts
- [x] `GET /api/contacts` — Liste paginée avec recherche
- [x] `POST /api/contacts` — Création
- [x] `GET /api/contacts/:id` — Détail
- [x] `PUT /api/contacts/:id` — Mise à jour
- [x] `DELETE /api/contacts/:id` — Suppression (avec protection FK)
- [x] **Tests** : couverts par tests middleware + E2E Phase 3

### 1.5 Routes Documents
- [x] `GET /api/documents` — Liste avec filtres (type, status)
- [x] `POST /api/documents` — Création (DRAFT) avec lignes
- [x] `GET /api/documents/:id` — Détail avec lignes
- [x] `PUT /api/documents/:id` — Mise à jour (si DRAFT)
- [x] `POST /api/documents/:id/send` — Passage SENT + numérotation + PDF
- [x] `POST /api/documents/:id/pay` — Passage PAID + création transaction
- [x] `POST /api/documents/:id/cancel` — Annulation / création avoir
- [x] `POST /api/documents/:id/convert` — Devis → Facture
- [x] `GET /api/documents/:id/pdf` — Téléchargement PDF (R2)
- [x] **Tests** : couverts par tests PDF + E2E Phase 3 (immutabilité, numérotation, calculs)

### 1.6 Génération PDF
- [x] Template PDF facture/devis/avoir (pdf-lib) : en-tête, coordonnées, tableau lignes, totaux, mentions légales
- [x] Template PDF certificat de cession (achat occasion)
- [x] Stockage du PDF généré dans R2 (documents/ et proofs/)
- [x] Intégration dans la route /send (génération auto à l'envoi)
- [x] Intégration dans la route /cession-pdf (génération + enregistrement preuve)
- [x] **Tests** : génération PDF documents (8 tests) + cession (6 tests) + helpers (27 tests)

### 1.7 Routes Transactions
- [x] `GET /api/transactions` — Liste avec filtres (période, direction, catégorie)
- [x] `POST /api/transactions` — Création (+ proof_bundle si second-hand)
- [x] `GET /api/transactions/:id` — Détail
- [x] `PUT /api/transactions/:id` — Mise à jour
- [x] `DELETE /api/transactions/:id` — Suppression (+ nettoyage R2)
- [x] **Tests** : couverts par tests middleware + E2E Phase 3

### 1.8 Routes Preuves
- [x] `POST /api/proofs/upload` — Upload fichier vers R2 (validation MIME + taille)
- [x] `GET /api/proofs/bundle/:transactionId` — État du dossier de preuves
- [x] `GET /api/proofs/:id/download` — Téléchargement
- [x] `POST /api/proofs/cession-pdf/:transactionId` — Génération certificat de cession (pdf-lib)
- [x] **Tests** : couverts par tests PDF cession + E2E Phase 3

### 1.9 Routes Dashboard
- [x] `GET /api/dashboard/urssaf` — Totaux par catégorie fiscale + période (mensuel/trimestriel)
- [x] `GET /api/dashboard/urssaf/export` — Export CSV de la période
- [x] **Tests** : couverts par E2E Phase 3 (agrégation, alertes seuils, export CSV)

---

## Phase 2 — Frontend (Vue 3)

### 2.1 Scaffolding frontend
- [x] `package.json` avec dépendances (Vue 3, Vite, Tailwind, Pinia, Headless UI, vue-i18n, vee-validate)
- [x] TypeScript : tsconfig.json + tsconfig.app.json + tsconfig.node.json
- [x] Tailwind CSS + @tailwindcss/forms + PostCSS + couleur primaire
- [x] Vite : alias `@/`, proxy `/api` → wrangler dev
- [x] Vue I18n (fichier `fr.json` complet)
- [x] Client Supabase (`src/lib/supabase.ts`)
- [x] Client API typé (`src/lib/api.ts` : get, post, put, delete, upload, download)
- [x] Build production Vite OK (344 Ko gzip 108 Ko)

### 2.2 Layout & navigation
- [x] Layout authentifié (`AuthLayout.vue` : sidebar + header + main)
- [x] `AppSidebar.vue` — 5 liens avec icônes Heroicons + état actif
- [x] `AppHeader.vue` — Email utilisateur + bouton déconnexion
- [x] `AppLoading.vue` — Spinner de chargement global
- [x] `AppToast.vue` + composable `useToast` — Notifications success/error/info
- [x] Guards de route : auth (→ login), setup (→ setup), redirections intelligentes
- [x] Router avec lazy loading (12 routes)
- [x] Page 404

### 2.3 Auth & Setup (Module 0)
- [x] Page `/login` — Formulaire email/password + magic link
- [x] Store Pinia `auth` — Session, login, logout, magic link, signUp, checkSetup
- [x] Page `/setup` — Formulaire complet (SIRET, activité, adresse, banque, déclaration, TVA)
- [ ] Validation formulaire setup avec VeeValidate + Zod

### 2.4 Contacts (Module A)
- [x] Page `/app/contacts` — Liste avec recherche, filtre par type
- [x] Composant `ContactList` — Tableau paginé
- [x] Page `/app/contacts/new` — Formulaire création
- [x] Page `/app/contacts/:id` — Fiche détail + édition
- [x] Composant `ContactForm` — Formulaire réutilisable (création/édition)
- [x] Store Pinia `contacts`
- [x] Validation formulaire avec Zod
- [ ] **Tests** : composant ContactForm (validation, soumission)

### 2.5 Documents (Module B)
- [x] Page `/app/documents` — Liste avec onglets (Devis / Factures / Avoirs) + filtres status
- [x] Composant `DocumentList` — Tableau paginé avec badges status
- [x] Page `/app/documents/new` — Formulaire création document
- [x] Composant `DocumentForm` — En-tête (contact, dates, conditions)
- [x] Composant `DocumentLineEditor` — Éditeur de lignes dynamique (ajout/suppression/réordonnement)
- [x] Sélecteur de catégorie fiscale par ligne
- [x] Calcul temps réel des sous-totaux par catégorie
- [x] Page `/app/documents/:id` — Détail + édition (si DRAFT) + actions (envoyer, payer, annuler)
- [ ] Page `/app/documents/:id/preview` — Aperçu PDF intégré
- [x] Bouton conversion Devis → Facture
- [x] Modale de confirmation pour les actions irréversibles (envoyer, annuler)
- [x] Store Pinia `documents`
- [ ] **Tests** : DocumentLineEditor (ajout/suppression lignes, calculs totaux par catégorie fiscale)

### 2.6 Trésorerie (Module C)
- [x] Page `/app/transactions` — Liste avec filtres (période, direction, catégorie)
- [x] Composant `TransactionList` — Tableau avec indicateur de complétude des preuves
- [x] Page `/app/transactions/new` — Formulaire création (recette ou dépense)
- [x] Champ "Achat d'occasion" → affiche le bloc upload preuves
- [x] Composant `ProofUploader` — Zone de dépôt de fichiers (drag & drop)
- [x] Page `/app/transactions/:id` — Détail + gestion des preuves
- [x] Composant `ProofBundle` — État du dossier de preuves (checklist visuelle)
- [x] Bouton génération certificat de cession
- [x] Store Pinia `transactions`
- [ ] **Tests** : ProofUploader (validation fichier), ProofBundle (affichage complétude)

### 2.7 Dashboard URSSAF (Module D)
- [x] Page `/app/dashboard` — Vue principale
- [x] 3 cartes avec totaux BIC Vente / BIC Presta / BNC + barres de progression
- [x] Sélecteur de période (mois ou trimestre selon config)
- [x] Barre de progression vers les seuils URSSAF avec alerte visuelle
- [ ] Historique des périodes passées (tableau récapitulatif)
- [x] Bouton export CSV
- [x] Store Pinia `dashboard`
- [x] Store Pinia `settings` (fetch/cache, réutilisable pour Phase 2.8)
- [ ] **Tests** : DashboardView (affichage correct des montants, alertes de seuil)

### 2.8 Paramètres (Module E)
- [x] Page `/app/settings` — Formulaire édition profil (12 champs, validation Zod, grille responsive)
- [x] Section upload / changement de logo (aperçu 96×96, validation type/taille)
- [x] Section personnalisation documents (mention TVA, délai paiement, mode paiement)
- [x] Section fréquence de déclaration (radio buttons)
- [x] Bouton export données (JSON)
- [x] Bouton suppression compte (dialog Headless UI, double confirmation « SUPPRIMER »)

---

## Phase 3 — Intégration, E2E & Polish

### 3.1 Tests E2E (Playwright) ✅
- [x] Setup Playwright + configuration (`playwright.config.ts`, `frontend/.env.test`)
- [x] Fixtures : factories test-data + helpers auth/API mock (`e2e/fixtures/`)
- [x] E2E : inscription + setup initial (`e2e/setup.spec.ts`)
- [x] E2E : création contact → création devis → conversion facture → marquage payé (`e2e/invoicing.spec.ts`)
- [x] E2E : saisie dépense achat occasion → upload preuves → vérification complétude (`e2e/second-hand.spec.ts`)
- [x] E2E : vérification dashboard URSSAF (totaux corrects après opérations) (`e2e/dashboard.spec.ts`)
- [x] E2E : export CSV (`e2e/export.spec.ts`)
- [x] E2E : paramètres (`e2e/settings.spec.ts`)

### 3.2 Intégration frontend ↔ backend
- [ ] Vérifier l'immutabilité des documents envoyés
- [ ] Vérifier les calculs URSSAF sur des données réalistes
- [ ] Vérifier la numérotation séquentielle (pas de trous)

### 3.3 PDF
- [ ] Vérifier les factures PDF générées (mentions légales, mise en page)
- [ ] Vérifier le certificat de cession PDF
- [ ] Tester l'impression navigateur

### 3.4 Responsive & UX
- [ ] Responsive mobile (sidebar en drawer, tableaux scrollables)
- [ ] États vides (aucun contact, aucun document, etc.)
- [ ] Messages d'erreur explicites en français
- [ ] Feedback utilisateur sur chaque action (toasts, indicateurs de chargement)

### 3.5 Sécurité
- [ ] Vérifier que le RLS bloque bien les accès non authentifiés
- [ ] Vérifier la validation des uploads (MIME, taille)
- [ ] Vérifier que les presigned URLs expirent correctement
- [ ] Vérifier qu'un seul compte peut exister par instance

### 3.6 Documentation
- [ ] README finalisé avec guide de déploiement pas-à-pas
- [ ] Captures d'écran dans le README
- [ ] CONTRIBUTING.md (guide de contribution)
- [ ] CHANGELOG.md

### 3.7 CI/CD
- [ ] GitHub Actions : lint + type-check + tests unitaires sur chaque push
- [ ] GitHub Actions : tests E2E sur les PR

---

## Phase 4 — Post-MVP (futures évolutions)

Ces fonctionnalités ne sont **pas** dans le scope du MVP mais sont envisagées pour la suite :

- [ ] Import CSV de transactions (historique bancaire)
- [ ] Récurrence de factures (abonnements mensuels)
- [ ] Envoi de factures par email directement depuis l'app
- [ ] Rappels de paiement automatiques
- [ ] Tableau de bord financier (graphiques CA, dépenses, marge)
- [ ] Mode hors-ligne (Service Worker + cache local)
- [ ] Application mobile (Capacitor ou PWA)
- [ ] Thème sombre
