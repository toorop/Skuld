# SKULD — Gestion Auto-Entrepreneur

## 1. VISION DU PROJET

**Skuld** est une Web App open-source de gestion ("ERP Light") destinée aux Auto-Entrepreneurs (Micro-Entreprises) français. Elle couvre la facturation, la trésorerie, la conformité fiscale URSSAF et la traçabilité des achats d'occasion.

### Modèle de distribution

- **Open-source & self-hosted :** Chaque utilisateur déploie sa propre instance.
- **Single-tenant :** Une instance = un auto-entrepreneur = une base de données.
- L'auth Supabase protège l'accès mais il n'y a qu'un seul utilisateur par instance.
- Pas de SaaS, pas d'abonnement, pas de serveur central.

### Objectifs

1. **Conformité Fiscale :** Tracer chaque centime. Distinguer **BIC Vente**, **BIC Presta** et **BNC** pour les déclarations URSSAF.
2. **Preuve d'Achat (Anti-Fraude) :** Achats d'occasion auprès de particuliers via un "Faisceau de preuves" (Annonce + Paiement + Certificat de cession).
3. **Gratuit & Simple :** Architecture serverless sur tiers gratuits (Cloudflare + Supabase). Déployable en 15 minutes par quelqu'un qui suit la doc.
4. **Universel :** S'adapte à tous les profils d'AE (prestataire, commerçant, mixte).

---

## 2. ARCHITECTURE TECHNIQUE

Monorepo 100% TypeScript.

```
skuld/
├── frontend/              # Vue 3 SPA
├── backend/               # Cloudflare Worker (Hono)
├── packages/
│   └── shared/            # Types, constantes, schémas Zod partagés
├── supabase/
│   └── migrations/        # Fichiers SQL versionnés
└── SPECIFICATION.md
```

### 2.1. Frontend (`/frontend`)

| Choix       | Techno                                       |
| ----------- | -------------------------------------------- |
| Hébergement | Cloudflare Pages                             |
| Framework   | Vue 3 (Composition API, `<script setup>`)    |
| Build       | Vite                                         |
| Langage     | TypeScript strict                            |
| Style       | Tailwind CSS                                 |
| UI          | Headless UI (accessibilité)                  |
| State       | Pinia                                        |
| Formulaires | VeeValidate + Zod                            |
| Auth        | Supabase Auth SDK                            |
| i18n        | Vue I18n (FR par défaut, prêt pour EN)       |

### 2.2. Backend / API (`/backend`)

| Choix       | Techno                                       |
| ----------- | -------------------------------------------- |
| Runtime     | Cloudflare Workers                           |
| Framework   | Hono                                         |
| Langage     | TypeScript strict                            |
| Validation  | Zod (schémas partagés via `packages/shared`) |
| Auth        | Vérification JWT Supabase (middleware Hono)  |
| Stockage    | Cloudflare R2 (bucket `skuld-proofs`)        |
| PDF         | `pdf-lib`                                    |
| Déploiement | Wrangler                                     |

### 2.3. Données & Stockage

| Composant       | Service       | Usage                              |
| --------------- | ------------- | ---------------------------------- |
| Base de données | Supabase (PG) | Données métier, RLS par user       |
| Auth            | Supabase Auth | Login (email/password, magic link) |
| Fichiers        | Cloudflare R2 | Factures PDF, preuves d'achat      |

### 2.4. Configuration d'instance

Chaque déploiement utilise des variables d'environnement :

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Backend uniquement

# Cloudflare R2
R2_BUCKET_NAME=skuld-proofs
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# App
APP_URL=https://mon-skuld.pages.dev
```

Un fichier `wrangler.toml.example` et un guide de déploiement accompagnent le projet.

---

## 3. MODÈLE DE DONNÉES

### 3.1. Types ENUM

```sql
CREATE TYPE fiscal_category   AS ENUM ('BIC_VENTE', 'BIC_PRESTA', 'BNC');
CREATE TYPE activity_type     AS ENUM ('BIC_VENTE', 'BIC_PRESTA', 'BNC', 'MIXED');
CREATE TYPE doc_type          AS ENUM ('QUOTE', 'INVOICE', 'CREDIT_NOTE');
CREATE TYPE doc_status        AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');
CREATE TYPE transaction_dir   AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE contact_type      AS ENUM ('CLIENT', 'SUPPLIER', 'BOTH');
CREATE TYPE proof_type        AS ENUM ('SCREENSHOT_AD', 'PAYMENT_PROOF', 'CESSION_CERT', 'INVOICE', 'OTHER');
CREATE TYPE payment_method    AS ENUM ('BANK_TRANSFER', 'CASH', 'CHECK', 'CARD', 'PAYPAL', 'OTHER');
CREATE TYPE declaration_freq  AS ENUM ('MONTHLY', 'QUARTERLY');
```

### 3.2. Tables

#### `settings` — Configuration de l'auto-entrepreneur

Table à **une seule ligne**. Remplace l'ancien `tenants` (pas de multi-tenancy).

| Colonne                  | Type                                                    | Notes                                    |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------- |
| `id`                     | `uuid PK DEFAULT gen_random_uuid()`                     | Toujours une seule ligne                 |
| `user_id`                | `uuid UNIQUE NOT NULL REFERENCES auth.users`            | Propriétaire de l'instance               |
| `siret`                  | `char(14) NOT NULL`                                     |                                          |
| `company_name`           | `text NOT NULL`                                         |                                          |
| `activity_type`          | `activity_type NOT NULL`                                | Conditionne l'interface                  |
| `address_line1`          | `text NOT NULL`                                         |                                          |
| `address_line2`          | `text`                                                  |                                          |
| `postal_code`            | `char(5) NOT NULL`                                      |                                          |
| `city`                   | `text NOT NULL`                                         |                                          |
| `phone`                  | `text`                                                  |                                          |
| `email`                  | `text NOT NULL`                                         | Email pro (peut différer du login)       |
| `bank_iban`              | `text`                                                  | Affiché sur les factures                 |
| `bank_bic`               | `text`                                                  |                                          |
| `vat_exempt_text`        | `text DEFAULT 'TVA non applicable, art. 293 B du CGI'` | Mention légale obligatoire               |
| `activity_start_date`    | `date`                                                  |                                          |
| `declaration_frequency`  | `declaration_freq DEFAULT 'MONTHLY'`                    | Mensuelle ou trimestrielle               |
| `default_payment_terms`  | `int DEFAULT 30`                                        | Délai de paiement par défaut (jours)     |
| `default_payment_method` | `payment_method DEFAULT 'BANK_TRANSFER'`                |                                          |
| `logo_url`               | `text`                                                  | Chemin R2 du logo                        |
| `created_at`             | `timestamptz DEFAULT now()`                             |                                          |
| `updated_at`             | `timestamptz DEFAULT now()`                             |                                          |

#### `sequences` — Compteurs de numérotation

Numérotation séquentielle sûre via `SELECT ... FOR UPDATE`.

| Colonne       | Type                               | Notes                            |
| ------------- | ---------------------------------- | -------------------------------- |
| `id`          | `uuid PK DEFAULT gen_random_uuid()`|                                  |
| `doc_type`    | `doc_type NOT NULL`                |                                  |
| `prefix`      | `text NOT NULL`                    | Ex: `FAC-`, `DEV-`, `AV-`       |
| `year`        | `int NOT NULL`                     | Reset annuel                     |
| `current_val` | `int NOT NULL DEFAULT 0`           |                                  |
| **UNIQUE**    | `(doc_type, year)`                 |                                  |

**Fonction SQL :**

```sql
CREATE OR REPLACE FUNCTION next_sequence(p_type doc_type)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  seq RECORD;
  v_year int := EXTRACT(YEAR FROM now());
  v_prefix text;
BEGIN
  SELECT * INTO seq FROM sequences
    WHERE doc_type = p_type AND year = v_year
    FOR UPDATE;

  IF NOT FOUND THEN
    v_prefix := CASE p_type
      WHEN 'INVOICE' THEN 'FAC-'
      WHEN 'QUOTE' THEN 'DEV-'
      ELSE 'AV-'
    END;
    INSERT INTO sequences (doc_type, prefix, year, current_val)
    VALUES (p_type, v_prefix, v_year, 1)
    RETURNING * INTO seq;
  ELSE
    UPDATE sequences SET current_val = current_val + 1
      WHERE id = seq.id RETURNING * INTO seq;
  END IF;

  RETURN seq.prefix || seq.year || '-' || LPAD(seq.current_val::text, 4, '0');
END;
$$;
```

Exemple de résultat : `FAC-2026-0001`, `DEV-2026-0012`.

#### `contacts` — Clients & Fournisseurs

| Colonne         | Type                                     | Notes               |
| --------------- | ---------------------------------------- | -------------------- |
| `id`            | `uuid PK DEFAULT gen_random_uuid()`      |                      |
| `type`          | `contact_type NOT NULL DEFAULT 'CLIENT'` |                      |
| `display_name`  | `text NOT NULL`                          |                      |
| `legal_name`    | `text`                                   | Raison sociale       |
| `email`         | `text`                                   |                      |
| `phone`         | `text`                                   |                      |
| `address_line1` | `text`                                   |                      |
| `address_line2` | `text`                                   |                      |
| `postal_code`   | `text`                                   |                      |
| `city`          | `text`                                   |                      |
| `country`       | `text DEFAULT 'FR'`                      | Code ISO 3166 alpha-2|
| `is_individual` | `boolean DEFAULT false`                  | Particulier = true   |
| `siren`         | `char(9)`                                | Si professionnel     |
| `notes`         | `text`                                   |                      |
| `created_at`    | `timestamptz DEFAULT now()`              |                      |
| `updated_at`    | `timestamptz DEFAULT now()`              |                      |

#### `documents` — Devis, Factures, Avoirs

| Colonne              | Type                                      | Notes                                             |
| -------------------- | ----------------------------------------- | ------------------------------------------------- |
| `id`                 | `uuid PK DEFAULT gen_random_uuid()`       |                                                   |
| `contact_id`         | `uuid NOT NULL REFERENCES contacts`       |                                                   |
| `doc_type`           | `doc_type NOT NULL`                       |                                                   |
| `status`             | `doc_status NOT NULL DEFAULT 'DRAFT'`     |                                                   |
| `reference`          | `text UNIQUE`                             | Généré par `next_sequence()`                      |
| `quote_id`           | `uuid REFERENCES documents`               | Lien devis → facture                              |
| `issued_date`        | `date NOT NULL DEFAULT CURRENT_DATE`      |                                                   |
| `due_date`           | `date`                                    | Calculée : `issued_date` + `payment_terms_days`   |
| `payment_method`     | `payment_method`                          |                                                   |
| `payment_terms_days` | `int`                                     |                                                   |
| `total_ht`           | `numeric(12,2) NOT NULL DEFAULT 0`        | Somme des lignes                                  |
| `total_bic_vente`    | `numeric(12,2) NOT NULL DEFAULT 0`        | Sous-total lignes BIC_VENTE                       |
| `total_bic_presta`   | `numeric(12,2) NOT NULL DEFAULT 0`        | Sous-total lignes BIC_PRESTA                      |
| `total_bnc`          | `numeric(12,2) NOT NULL DEFAULT 0`        | Sous-total lignes BNC                             |
| `notes`              | `text`                                    | Remarques sur le document                         |
| `terms`              | `text`                                    | Conditions particulières                          |
| `footer_text`        | `text`                                    | Pied de page personnalisé                         |
| `created_at`         | `timestamptz DEFAULT now()`               |                                                   |
| `updated_at`         | `timestamptz DEFAULT now()`               |                                                   |

**Trigger d'immutabilité :**

```sql
CREATE OR REPLACE FUNCTION prevent_sent_doc_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Un document SENT ou PAID ne peut plus être modifié sur le fond
  -- Seuls les changements de statut sont autorisés (SENT→PAID, SENT→CANCELLED)
  IF OLD.status IN ('SENT', 'PAID')
     AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Le document % est verrouillé (statut: %)', OLD.reference, OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doc_immutable
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION prevent_sent_doc_update();
```

#### `document_lines` — Lignes de document

| Colonne           | Type                                                                        | Notes                           |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------- |
| `id`              | `uuid PK DEFAULT gen_random_uuid()`                                         |                                 |
| `document_id`     | `uuid NOT NULL REFERENCES documents ON DELETE CASCADE`                      |                                 |
| `position`        | `int NOT NULL`                                                              | Ordre d'affichage               |
| `description`     | `text NOT NULL`                                                             |                                 |
| `quantity`        | `numeric(10,3) NOT NULL DEFAULT 1`                                          |                                 |
| `unit`            | `text`                                                                      | Ex: heures, pièces, forfait     |
| `unit_price`      | `numeric(12,2) NOT NULL`                                                    |                                 |
| `total`           | `numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED`          | Calculé auto                    |
| `fiscal_category` | `fiscal_category NOT NULL`                                                  | **Obligatoire par ligne**        |

#### `transactions` — Livre de trésorerie

| Colonne           | Type                                        | Notes                                    |
| ----------------- | ------------------------------------------- | ---------------------------------------- |
| `id`              | `uuid PK DEFAULT gen_random_uuid()`         |                                          |
| `date`            | `date NOT NULL`                             |                                          |
| `amount`          | `numeric(12,2) NOT NULL`                    | Toujours positif                         |
| `direction`       | `transaction_dir NOT NULL`                  |                                          |
| `label`           | `text NOT NULL`                             |                                          |
| `fiscal_category` | `fiscal_category`                           | NULL si non catégorisable                |
| `payment_method`  | `payment_method`                            |                                          |
| `document_id`     | `uuid REFERENCES documents`                 | Rapprochement facture ↔ encaissement     |
| `contact_id`      | `uuid REFERENCES contacts`                  |                                          |
| `is_second_hand`  | `boolean DEFAULT false`                     | Active le workflow "achat occasion"      |
| `notes`           | `text`                                      |                                          |
| `created_at`      | `timestamptz DEFAULT now()`                 |                                          |
| `updated_at`      | `timestamptz DEFAULT now()`                 |                                          |

#### `proof_bundles` — Dossiers de preuves (achats occasion)

| Colonne          | Type                                                                             | Notes                          |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `id`             | `uuid PK DEFAULT gen_random_uuid()`                                              |                                |
| `transaction_id` | `uuid UNIQUE NOT NULL REFERENCES transactions ON DELETE CASCADE`                 |                                |
| `has_ad`         | `boolean DEFAULT false`                                                          | Capture d'annonce              |
| `has_payment`    | `boolean DEFAULT false`                                                          | Preuve de paiement             |
| `has_cession`    | `boolean DEFAULT false`                                                          | Certificat de cession          |
| `is_complete`    | `boolean GENERATED ALWAYS AS (has_ad AND has_payment AND has_cession) STORED`    | Dossier complet ?              |
| `notes`          | `text`                                                                           |                                |
| `created_at`     | `timestamptz DEFAULT now()`                                                      |                                |

#### `proofs` — Fichiers de preuves

| Colonne       | Type                                               | Notes              |
| ------------- | -------------------------------------------------- | -------------------|
| `id`          | `uuid PK DEFAULT gen_random_uuid()`                |                    |
| `bundle_id`   | `uuid NOT NULL REFERENCES proof_bundles ON DELETE CASCADE` |            |
| `type`        | `proof_type NOT NULL`                              |                    |
| `file_url`    | `text NOT NULL`                                    | Chemin R2          |
| `file_name`   | `text NOT NULL`                                    | Nom original       |
| `file_size`   | `int NOT NULL`                                     | Octets             |
| `mime_type`   | `text NOT NULL`                                    | Validé côté API    |
| `uploaded_at` | `timestamptz DEFAULT now()`                        |                    |

### 3.3. Row Level Security (RLS)

Même en single-tenant, le RLS protège les données via le JWT Supabase (empêche tout accès sans auth valide).

```sql
-- Appliqué sur chaque table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_only ON contacts
  USING (
    EXISTS (SELECT 1 FROM settings WHERE user_id = auth.uid())
  );

-- Même pattern pour : documents, document_lines, transactions,
-- proof_bundles, proofs, sequences, settings
```

### 3.4. Index

```sql
CREATE INDEX idx_documents_status    ON documents (status);
CREATE INDEX idx_documents_type      ON documents (doc_type);
CREATE INDEX idx_transactions_date   ON transactions (date);
CREATE INDEX idx_transactions_fiscal ON transactions (fiscal_category, date);
CREATE INDEX idx_contacts_type       ON contacts (type);
CREATE INDEX idx_proofs_bundle       ON proofs (bundle_id);
```

---

## 4. SÉCURITÉ

### Auth

- Supabase Auth : email/password + magic link.
- JWT vérifié côté Worker via middleware Hono.
- Single-user : le premier inscrit est le propriétaire, pas d'inscription ouverte après setup.

### Uploads

- Types MIME autorisés : `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Taille max par fichier : **5 Mo**.
- Fichiers R2 préfixés : `proofs/{bundle_id}/{filename}`.
- Téléchargement via presigned URLs (expiration 15 min).

---

## 5. FONCTIONNALITÉS (MVP)

### Module 0 : Setup initial

1. Première visite → écran de création de compte (Supabase Auth).
2. Formulaire de configuration :
   - SIRET, nom, adresse, coordonnées bancaires.
   - **Type d'activité** (BIC Vente / BIC Presta / BNC / Mixte).
   - Fréquence de déclaration URSSAF.
3. Redirection vers le Dashboard.

### Module A : Contacts

- CRUD contacts (clients / fournisseurs / les deux).
- Distinction particulier / professionnel.
- Recherche par nom.

### Module B : Facturation

- CRUD Devis, Factures, Avoirs avec lignes détaillées.
- **Catégorie fiscale obligatoire par ligne.**
- Calcul automatique des sous-totaux par catégorie (BIC Vente / BIC Presta / BNC).
- Numérotation séquentielle sécurisée (`next_sequence()`).
- Transformation Devis → Facture (copie avec lien `quote_id`).
- Avoirs (annulation totale ou partielle d'une facture).
- **Génération PDF** conforme avec mentions obligatoires :
  - Identité vendeur/acheteur, numéro, date.
  - "TVA non applicable, art. 293 B du CGI".
  - Conditions de paiement, pénalités de retard.
- Passage SENT → document verrouillé.
- Passage PAID → création/liaison d'une transaction.

### Module C : Trésorerie

- Saisie des recettes et dépenses.
- Rapprochement transaction ↔ facture.
- **Workflow "Achat Occasion"** (si `is_second_hand = true`) :
  1. Création automatique d'un `proof_bundle`.
  2. Upload obligatoire : capture d'annonce + preuve de paiement.
  3. Génération PDF du "Certificat de Cession" pré-rempli.
  4. Indicateur visuel de complétude du dossier.
- Filtrage par période, direction, catégorie fiscale.

### Module D : Dashboard URSSAF

- Agrégation des **encaissements** par période (mensuelle ou trimestrielle selon config).
- Trois totaux :
  - CA BIC Vente (seuil 188 700 €)
  - CA BIC Presta (seuil 77 700 €)
  - CA BNC (seuil 77 700 €)
- **Alertes de seuil** quand le CA cumulé annuel approche les plafonds.
- Historique des périodes passées.
- **Export CSV** des transactions de la période.

### Module E : Paramètres

- Modification du profil (SIRET, adresse, banque...).
- Personnalisation des documents (logo, pied de page, mentions).
- Export de toutes les données (ZIP).
- Suppression du compte et des données.

---

## 6. API REST

```
Auth middleware sur toutes les routes /api/*

POST   /api/setup                        # Configuration initiale (première utilisation)

/api/contacts
  GET    /                               # Liste (pagination, recherche)
  POST   /                               # Création
  GET    /:id                            # Détail
  PUT    /:id                            # Mise à jour
  DELETE /:id                            # Suppression

/api/documents
  GET    /                               # Liste (filtres: type, status)
  POST   /                               # Création (DRAFT)
  GET    /:id                            # Détail avec lignes
  PUT    /:id                            # Mise à jour (si DRAFT)
  POST   /:id/send                       # Passage SENT + génération PDF
  POST   /:id/pay                        # Passage PAID + création transaction
  POST   /:id/cancel                     # Annulation (→ avoir si déjà SENT)
  POST   /:id/convert                    # Devis → Facture
  GET    /:id/pdf                        # Téléchargement PDF

/api/transactions
  GET    /                               # Liste (filtres: période, direction, catégorie)
  POST   /                               # Création
  GET    /:id                            # Détail
  PUT    /:id                            # Mise à jour
  DELETE /:id                            # Suppression

/api/proofs
  POST   /upload                         # Upload → R2
  GET    /bundle/:transactionId          # État du dossier de preuves
  GET    /:id/download                   # Téléchargement (presigned URL)
  POST   /cession-pdf/:transactionId     # Génération certificat de cession

/api/dashboard
  GET    /urssaf                         # Totaux par catégorie + période
  GET    /urssaf/export                  # Export CSV

/api/settings
  GET    /                               # Configuration actuelle
  PUT    /                               # Mise à jour
  POST   /logo                           # Upload logo
  GET    /export                         # Export complet (ZIP)
  DELETE /account                        # Suppression compte + données
```

---

## 7. PAGES FRONTEND

```
/login                       → Connexion
/setup                       → Configuration initiale (première utilisation)

/app                         → Layout authentifié
  /app/dashboard              → Dashboard URSSAF (Module D)
  /app/contacts               → Liste contacts
  /app/contacts/new           → Nouveau contact
  /app/contacts/:id           → Fiche contact
  /app/documents              → Liste documents (onglets: Devis / Factures / Avoirs)
  /app/documents/new          → Nouveau document
  /app/documents/:id          → Détail / Édition
  /app/documents/:id/preview  → Aperçu PDF
  /app/transactions           → Livre de trésorerie
  /app/transactions/new       → Nouvelle transaction
  /app/transactions/:id       → Détail + preuves
  /app/settings               → Paramètres
```

---

## 8. CONVENTIONS

### Code

- TypeScript `strict: true` partout.
- Schémas Zod partagés dans `packages/shared` (validation front + back).
- Nommage : `camelCase` en TS, `snake_case` en SQL.
- Composants Vue : un fichier par composant, PascalCase.
- Réponses API : `{ data, error, meta }`.

### Git

- Conventional Commits : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Branche principale : `main`.
- Feature branches : `feat/nom-feature`.

### Déploiement (doc à fournir)

1. Fork/clone du repo.
2. Créer un projet Supabase → lancer les migrations SQL.
3. Créer un bucket R2 sur Cloudflare.
4. Copier `.env.example` → `.env` avec ses propres clés.
5. `npm run deploy` (Wrangler pour le backend, CF Pages pour le front).
