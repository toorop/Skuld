# Roadmap Skuld

Plan de développement détaillé, découpé en phases séquentielles. Chaque phase produit un livrable fonctionnel testable.

---

## Phase 0 — Fondations (Monorepo & Infra)

### 0.1 Structure monorepo
- [ ] `package.json` racine avec workspaces npm (`frontend`, `backend`, `packages/shared`)
- [ ] Configuration TypeScript partagée (`tsconfig.base.json` + `tsconfig.json` par workspace)
- [ ] `.env.example` avec toutes les variables documentées
- [ ] `.gitignore` complet (node_modules, dist, .env, .wrangler)
- [ ] `.nvmrc` (Node 18+)

### 0.2 Package partagé (`packages/shared`)
- [ ] `package.json` + `tsconfig.json`
- [ ] Types TypeScript : enums miroir du SQL (`FiscalCategory`, `DocType`, `DocStatus`, etc.)
- [ ] Types des entités : `Settings`, `Contact`, `Document`, `DocumentLine`, `Transaction`, `ProofBundle`, `Proof`
- [ ] Types API : `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`
- [ ] Schémas Zod : validation `Settings` (SIRET, code postal, IBAN)
- [ ] Schémas Zod : validation `Contact` (email, SIREN optionnel)
- [ ] Schémas Zod : validation `Document` + `DocumentLine`
- [ ] Schémas Zod : validation `Transaction`
- [ ] Constantes : seuils URSSAF, types MIME autorisés, taille max upload

### 0.3 Migrations SQL (`supabase/migrations/`)
- [ ] `00001_enums.sql` — Tous les types ENUM
- [ ] `00002_settings.sql` — Table `settings` + contrainte single-row
- [ ] `00003_sequences.sql` — Table `sequences` + fonction `next_sequence()`
- [ ] `00004_contacts.sql` — Table `contacts`
- [ ] `00005_documents.sql` — Tables `documents` + `document_lines` + trigger immutabilité
- [ ] `00006_transactions.sql` — Table `transactions`
- [ ] `00007_proof_bundles.sql` — Tables `proof_bundles` + `proofs`
- [ ] `00008_rls.sql` — RLS policies sur toutes les tables
- [ ] `00009_indexes.sql` — Index de performance
- [ ] `00010_updated_at.sql` — Trigger `updated_at` automatique sur toutes les tables

---

## Phase 1 — Backend (API Hono)

### 1.1 Scaffolding backend
- [ ] `backend/package.json` avec dépendances (hono, @supabase/supabase-js, zod, pdf-lib)
- [ ] `backend/tsconfig.json`
- [ ] `backend/wrangler.toml` (bindings R2, variables d'env)
- [ ] `wrangler.toml.example` (template sans secrets)
- [ ] Point d'entrée `backend/src/index.ts` (app Hono)
- [ ] Configuration des types Cloudflare Workers (`Env` avec bindings R2, vars)

### 1.2 Middleware & utilitaires
- [ ] Middleware d'authentification JWT Supabase
- [ ] Middleware CORS
- [ ] Client Supabase (initialisé par requête avec le JWT utilisateur)
- [ ] Helper réponse API : `success()`, `error()`, `paginated()`
- [ ] Helper validation Zod (middleware Hono)
- [ ] Gestion d'erreurs globale (error handler Hono)

### 1.3 Routes Settings
- [ ] `POST /api/setup` — Configuration initiale (création settings)
- [ ] `GET /api/settings` — Récupérer la configuration
- [ ] `PUT /api/settings` — Mettre à jour la configuration
- [ ] `POST /api/settings/logo` — Upload logo vers R2
- [ ] `GET /api/settings/export` — Export complet des données (ZIP)
- [ ] `DELETE /api/settings/account` — Suppression du compte

### 1.4 Routes Contacts
- [ ] `GET /api/contacts` — Liste paginée avec recherche
- [ ] `POST /api/contacts` — Création
- [ ] `GET /api/contacts/:id` — Détail
- [ ] `PUT /api/contacts/:id` — Mise à jour
- [ ] `DELETE /api/contacts/:id` — Suppression

### 1.5 Routes Documents
- [ ] `GET /api/documents` — Liste avec filtres (type, status)
- [ ] `POST /api/documents` — Création (DRAFT) avec lignes
- [ ] `GET /api/documents/:id` — Détail avec lignes
- [ ] `PUT /api/documents/:id` — Mise à jour (si DRAFT)
- [ ] `POST /api/documents/:id/send` — Passage SENT + numérotation + PDF
- [ ] `POST /api/documents/:id/pay` — Passage PAID + création transaction
- [ ] `POST /api/documents/:id/cancel` — Annulation / création avoir
- [ ] `POST /api/documents/:id/convert` — Devis → Facture
- [ ] `GET /api/documents/:id/pdf` — Téléchargement PDF

### 1.6 Génération PDF
- [ ] Template PDF facture (pdf-lib) : en-tête, coordonnées, tableau lignes, totaux, mentions légales
- [ ] Template PDF devis
- [ ] Template PDF avoir
- [ ] Template PDF certificat de cession (achat occasion)
- [ ] Stockage du PDF généré dans R2

### 1.7 Routes Transactions
- [ ] `GET /api/transactions` — Liste avec filtres (période, direction, catégorie)
- [ ] `POST /api/transactions` — Création (+ proof_bundle si second-hand)
- [ ] `GET /api/transactions/:id` — Détail
- [ ] `PUT /api/transactions/:id` — Mise à jour
- [ ] `DELETE /api/transactions/:id` — Suppression

### 1.8 Routes Preuves
- [ ] `POST /api/proofs/upload` — Upload fichier vers R2 (validation MIME + taille)
- [ ] `GET /api/proofs/bundle/:transactionId` — État du dossier de preuves
- [ ] `GET /api/proofs/:id/download` — Téléchargement (presigned URL)
- [ ] `POST /api/proofs/cession-pdf/:transactionId` — Génération certificat de cession

### 1.9 Routes Dashboard
- [ ] `GET /api/dashboard/urssaf` — Totaux par catégorie fiscale + période
- [ ] `GET /api/dashboard/urssaf/export` — Export CSV de la période

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

### 2.7 Dashboard URSSAF (Module D)
- [ ] Page `/app/dashboard` — Vue principale
- [ ] Composant `UrsaffTotals` — 3 cartes avec totaux BIC Vente / BIC Presta / BNC
- [ ] Sélecteur de période (mois ou trimestre selon config)
- [ ] Barre de progression vers les seuils URSSAF avec alerte visuelle
- [ ] Historique des périodes passées (tableau récapitulatif)
- [ ] Bouton export CSV
- [ ] Store Pinia `dashboard`

### 2.8 Paramètres (Module E)
- [ ] Page `/app/settings` — Formulaire édition profil
- [ ] Section upload / changement de logo
- [ ] Section personnalisation documents (pied de page, mentions)
- [ ] Section fréquence de déclaration
- [ ] Bouton export données (ZIP)
- [ ] Bouton suppression compte (avec double confirmation)

---

## Phase 3 — Intégration & Polish

### 3.1 Intégration frontend ↔ backend
- [ ] Tester tous les flux complets : setup → contact → devis → facture → paiement → dashboard
- [ ] Tester le workflow achat occasion complet
- [ ] Vérifier l'immutabilité des documents envoyés
- [ ] Vérifier les calculs URSSAF sur des données réalistes
- [ ] Vérifier la numérotation séquentielle (pas de trous)

### 3.2 PDF
- [ ] Vérifier les factures PDF générées (mentions légales, mise en page)
- [ ] Vérifier le certificat de cession PDF
- [ ] Tester l'impression navigateur

### 3.3 Responsive & UX
- [ ] Responsive mobile (sidebar en drawer, tableaux scrollables)
- [ ] États vides (aucun contact, aucun document, etc.)
- [ ] Messages d'erreur explicites en français
- [ ] Feedback utilisateur sur chaque action (toasts, indicateurs de chargement)

### 3.4 Sécurité
- [ ] Vérifier que le RLS bloque bien les accès non authentifiés
- [ ] Vérifier la validation des uploads (MIME, taille)
- [ ] Vérifier que les presigned URLs expirent correctement
- [ ] Vérifier qu'un seul compte peut exister par instance

### 3.5 Documentation
- [ ] README finalisé avec guide de déploiement pas-à-pas
- [ ] Captures d'écran dans le README
- [ ] CONTRIBUTING.md (guide de contribution)
- [ ] CHANGELOG.md

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
- [ ] Tests automatisés (Vitest + Playwright)
- [ ] CI/CD GitHub Actions (lint, build, tests)
