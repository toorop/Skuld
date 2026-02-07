-- Skuld — Migration 00005 : Tables documents + document_lines
-- Devis, factures et avoirs avec leurs lignes détaillées

CREATE TABLE documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid NOT NULL REFERENCES contacts ON DELETE RESTRICT,
  doc_type            doc_type NOT NULL,
  status              doc_status NOT NULL DEFAULT 'DRAFT',
  reference           text UNIQUE,
  quote_id            uuid REFERENCES documents,
  issued_date         date NOT NULL DEFAULT CURRENT_DATE,
  due_date            date,
  payment_method      payment_method,
  payment_terms_days  int,
  total_ht            numeric(12,2) NOT NULL DEFAULT 0,
  total_bic_vente     numeric(12,2) NOT NULL DEFAULT 0,
  total_bic_presta    numeric(12,2) NOT NULL DEFAULT 0,
  total_bnc           numeric(12,2) NOT NULL DEFAULT 0,
  notes               text,
  terms               text,
  footer_text         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- L'échéance doit être après la date d'émission
  CONSTRAINT chk_due_date_after_issued CHECK (
    due_date IS NULL OR due_date >= issued_date
  ),
  -- Un avoir doit référencer un document existant via quote_id (utilisé comme lien parent)
  -- Un devis converti en facture a son quote_id renseigné
  CONSTRAINT chk_payment_terms_range CHECK (
    payment_terms_days IS NULL OR (payment_terms_days >= 0 AND payment_terms_days <= 365)
  )
);

-- Lignes de document avec calcul automatique du total
CREATE TABLE document_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES documents ON DELETE CASCADE,
  position        int NOT NULL,
  description     text NOT NULL,
  quantity        numeric(10,3) NOT NULL DEFAULT 1,
  unit            text,
  unit_price      numeric(12,2) NOT NULL,
  total           numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  fiscal_category fiscal_category NOT NULL,

  -- Position unique par document
  CONSTRAINT uq_line_position UNIQUE (document_id, position),
  -- Quantité positive
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  -- Prix unitaire non négatif
  CONSTRAINT chk_unit_price_positive CHECK (unit_price >= 0)
);

-- Trigger d'immutabilité : un document SENT ou PAID ne peut plus être modifié
-- Seuls les changements de statut sont autorisés (SENT→PAID, SENT→CANCELLED)
CREATE OR REPLACE FUNCTION prevent_sent_doc_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('SENT', 'PAID') AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Le document % est verrouillé (statut : %). Seul un changement de statut est autorisé.', OLD.reference, OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doc_immutable
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION prevent_sent_doc_update();

-- Trigger de recalcul des totaux par catégorie fiscale
-- Déclenché à chaque INSERT/UPDATE/DELETE sur document_lines
CREATE OR REPLACE FUNCTION recalc_document_totals()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_doc_id uuid;
BEGIN
  -- Déterminer le document concerné
  v_doc_id := COALESCE(NEW.document_id, OLD.document_id);

  UPDATE documents SET
    total_ht         = COALESCE(sub.total, 0),
    total_bic_vente  = COALESCE(sub.bic_vente, 0),
    total_bic_presta = COALESCE(sub.bic_presta, 0),
    total_bnc        = COALESCE(sub.bnc, 0),
    updated_at       = now()
  FROM (
    SELECT
      SUM(quantity * unit_price) AS total,
      SUM(CASE WHEN fiscal_category = 'BIC_VENTE'  THEN quantity * unit_price ELSE 0 END) AS bic_vente,
      SUM(CASE WHEN fiscal_category = 'BIC_PRESTA' THEN quantity * unit_price ELSE 0 END) AS bic_presta,
      SUM(CASE WHEN fiscal_category = 'BNC'        THEN quantity * unit_price ELSE 0 END) AS bnc
    FROM document_lines
    WHERE document_id = v_doc_id
  ) AS sub
  WHERE documents.id = v_doc_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON document_lines
  FOR EACH ROW EXECUTE FUNCTION recalc_document_totals();
