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
- [ ] Configuration Vitest backend (miniflare)

### 1.2 Middleware & utilitaires
- [x] Middleware d'authentification JWT Supabase
- [x] Middleware CORS
- [x] Client Supabase (initialisé par requête avec le JWT utilisateur)
- [x] Helper réponse API : `success()`, `error()`, `paginated()`
- [x] Helper validation Zod (middleware Hono)
- [x] Gestion d'erreurs globale (error handler Hono)
- [ ] **Tests** : middleware auth (JWT valide, expiré, absent), helpers réponse

### 1.3 Routes Settings
- [x] `POST /api/setup` — Configuration initiale (création settings)
- [x] `GET /api/settings` — Récupérer la configuration
- [x] `PUT /api/settings` — Mettre à jour la configuration
- [x] `POST /api/settings/logo` — Upload logo vers R2
- [x] `GET /api/settings/export` — Export complet des données (JSON)
- [x] `DELETE /api/settings/account` — Suppression du compte
- [ ] **Tests** : setup initial, mise à jour, refus de double setup

### 1.4 Routes Contacts
- [x] `GET /api/contacts` — Liste paginée avec recherche
- [x] `POST /api/contacts` — Création
- [x] `GET /api/contacts/:id` — Détail
- [x] `PUT /api/contacts/:id` — Mise à jour
- [x] `DELETE /api/contacts/:id` — Suppression (avec protection FK)
- [ ] **Tests** : CRUD complet, recherche, validation entrées

### 1.5 Routes Documents
- [x] `GET /api/documents` — Liste avec filtres (type, status)
- [x] `POST /api/documents` — Création (DRAFT) avec lignes
- [x] `GET /api/documents/:id` — Détail avec lignes
- [x] `PUT /api/documents/:id` — Mise à jour (si DRAFT)
- [x] `POST /api/documents/:id/send` — Passage SENT + numérotation
- [x] `POST /api/documents/:id/pay` — Passage PAID + création transaction
- [x] `POST /api/documents/:id/cancel` — Annulation / création avoir
- [x] `POST /api/documents/:id/convert` — Devis → Facture
- [x] `GET /api/documents/:id/pdf` — Téléchargement PDF (R2)
- [ ] **Tests** : immutabilité document SENT, numérotation séquentielle sans trous, calculs totaux fiscaux, conversion devis→facture

### 1.6 Génération PDF
- [x] Template PDF facture/devis/avoir (pdf-lib) : en-tête, coordonnées, tableau lignes, totaux, mentions légales
- [x] Template PDF certificat de cession (achat occasion)
- [x] Stockage du PDF généré dans R2 (documents/ et proofs/)
- [x] Intégration dans la route /send (génération auto à l'envoi)
- [x] Intégration dans la route /cession-pdf (génération + enregistrement preuve)
- [ ] **Tests** : génération PDF (vérifier que le fichier est produit, contient les mentions légales)

### 1.7 Routes Transactions
- [x] `GET /api/transactions` — Liste avec filtres (période, direction, catégorie)
- [x] `POST /api/transactions` — Création (+ proof_bundle si second-hand)
- [x] `GET /api/transactions/:id` — Détail
- [x] `PUT /api/transactions/:id` — Mise à jour
- [x] `DELETE /api/transactions/:id` — Suppression (+ nettoyage R2)
- [ ] **Tests** : CRUD, création auto proof_bundle pour achat occasion

### 1.8 Routes Preuves
- [x] `POST /api/proofs/upload` — Upload fichier vers R2 (validation MIME + taille)
- [x] `GET /api/proofs/bundle/:transactionId` — État du dossier de preuves
- [x] `GET /api/proofs/:id/download` — Téléchargement
- [x] `POST /api/proofs/cession-pdf/:transactionId` — Génération certificat de cession (TODO: implémentation pdf-lib)
- [ ] **Tests** : rejet MIME invalide, rejet fichier trop gros, complétude du bundle

### 1.9 Routes Dashboard
- [x] `GET /api/dashboard/urssaf` — Totaux par catégorie fiscale + période (mensuel/trimestriel)
- [x] `GET /api/dashboard/urssaf/export` — Export CSV de la période
- [ ] **Tests** : calculs d'agrégation URSSAF (mensuel, trimestriel), alertes de seuil, export CSV

---

## Phase 2 — Frontend (Vue 3)

### 2.1 Scaffolding frontend
- [ ] `create-vue` avec TypeScript, Vue Router, Pinia
- [ ] Tailwind CSS + configuration
- [ ] Headless UI
- [ ] Vue I18n (fichier `fr.json` initial)
- [ ] Client Supabase (`@supabase/supabase-js`)
- [ ] Client API (fetch wrapper typé avec intercepteurs auth)
- [ ] Configuration Vite (proxy dev vers Wrangler)
- [ ] Configuration Vitest + Vue Test Utils

### 2.2 Layout & navigation
- [ ] Layout public (login, setup)
- [ ] Layout authentifié (sidebar, header, contenu)
- [ ] Sidebar : Dashboard, Contacts, Documents, Trésorerie, Paramètres
- [ ] Guard de route : redirection login si non authentifié
- [ ] Guard de route : redirection setup si settings non configuré
- [ ] Composant de chargement global
- [ ] Composant de notification (toast)

### 2.3 Auth & Setup (Module 0)
- [ ] Page `/login` — Formulaire email/password + magic link
- [ ] Store Pinia `auth` — Session, login, logout, refresh
- [ ] Page `/setup` — Formulaire configuration initiale (SIRET, activité, etc.)
- [ ] Validation formulaire setup avec VeeValidate + Zod

### 2.4 Contacts (Module A)
- [ ] Page `/app/contacts` — Liste avec recherche, filtre par type
- [ ] Composant `ContactList` — Tableau paginé
- [ ] Page `/app/contacts/new` — Formulaire création
- [ ] Page `/app/contacts/:id` — Fiche détail + édition
- [ ] Composant `ContactForm` — Formulaire réutilisable (création/édition)
- [ ] Store Pinia `contacts`
- [ ] Validation formulaire avec Zod
- [ ] **Tests** : composant ContactForm (validation, soumission)

### 2.5 Documents (Module B)
- [ ] Page `/app/documents` — Liste avec onglets (Devis / Factures / Avoirs) + filtres status
- [ ] Composant `DocumentList` — Tableau paginé avec badges status
- [ ] Page `/app/documents/new` — Formulaire création document
- [ ] Composant `DocumentForm` — En-tête (contact, dates, conditions)
- [ ] Composant `DocumentLineEditor` — Éditeur de lignes dynamique (ajout/suppression/réordonnement)
- [ ] Sélecteur de catégorie fiscale par ligne
- [ ] Calcul temps réel des sous-totaux par catégorie
- [ ] Page `/app/documents/:id` — Détail + édition (si DRAFT) + actions (envoyer, payer, annuler)
- [ ] Page `/app/documents/:id/preview` — Aperçu PDF intégré
- [ ] Bouton conversion Devis → Facture
- [ ] Modale de confirmation pour les actions irréversibles (envoyer, annuler)
- [ ] Store Pinia `documents`
- [ ] **Tests** : DocumentLineEditor (ajout/suppression lignes, calculs totaux par catégorie fiscale)

### 2.6 Trésorerie (Module C)
- [ ] Page `/app/transactions` — Liste avec filtres (période, direction, catégorie)
- [ ] Composant `TransactionList` — Tableau avec indicateur de complétude des preuves
- [ ] Page `/app/transactions/new` — Formulaire création (recette ou dépense)
- [ ] Champ "Achat d'occasion" → affiche le bloc upload preuves
- [ ] Composant `ProofUploader` — Zone de dépôt de fichiers (drag & drop)
- [ ] Page `/app/transactions/:id` — Détail + gestion des preuves
- [ ] Composant `ProofBundle` — État du dossier de preuves (checklist visuelle)
- [ ] Bouton génération certificat de cession
- [ ] Store Pinia `transactions`
- [ ] **Tests** : ProofUploader (validation fichier), ProofBundle (affichage complétude)

### 2.7 Dashboard URSSAF (Module D)
- [ ] Page `/app/dashboard` — Vue principale
- [ ] Composant `UrsaffTotals` — 3 cartes avec totaux BIC Vente / BIC Presta / BNC
- [ ] Sélecteur de période (mois ou trimestre selon config)
- [ ] Barre de progression vers les seuils URSSAF avec alerte visuelle
- [ ] Historique des périodes passées (tableau récapitulatif)
- [ ] Bouton export CSV
- [ ] Store Pinia `dashboard`
- [ ] **Tests** : UrsaffTotals (affichage correct des montants, alertes de seuil)

### 2.8 Paramètres (Module E)
- [ ] Page `/app/settings` — Formulaire édition profil
- [ ] Section upload / changement de logo
- [ ] Section personnalisation documents (pied de page, mentions)
- [ ] Section fréquence de déclaration
- [ ] Bouton export données (ZIP)
- [ ] Bouton suppression compte (avec double confirmation)

---

## Phase 3 — Intégration, E2E & Polish

### 3.1 Tests E2E (Playwright)
- [ ] Setup Playwright + configuration
- [ ] E2E : inscription + setup initial
- [ ] E2E : création contact → création devis → conversion facture → marquage payé
- [ ] E2E : saisie dépense achat occasion → upload preuves → vérification complétude
- [ ] E2E : vérification dashboard URSSAF (totaux corrects après opérations)
- [ ] E2E : export CSV

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
