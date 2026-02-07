-- Skuld — Migration 00007 : Tables proof_bundles + proofs
-- Système de faisceau de preuves pour les achats d'occasion

-- Dossier de preuves lié à une transaction d'achat occasion
CREATE TABLE proof_bundles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid UNIQUE NOT NULL REFERENCES transactions ON DELETE CASCADE,
  has_ad          boolean NOT NULL DEFAULT false,
  has_payment     boolean NOT NULL DEFAULT false,
  has_cession     boolean NOT NULL DEFAULT false,
  is_complete     boolean GENERATED ALWAYS AS (has_ad AND has_payment AND has_cession) STORED,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Fichiers de preuves individuels (images, PDF)
CREATE TABLE proofs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id   uuid NOT NULL REFERENCES proof_bundles ON DELETE CASCADE,
  type        proof_type NOT NULL,
  file_url    text NOT NULL,
  file_name   text NOT NULL,
  file_size   int NOT NULL,
  mime_type   text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),

  -- Taille de fichier positive
  CONSTRAINT chk_file_size_positive CHECK (file_size > 0),
  -- Types MIME autorisés
  CONSTRAINT chk_mime_type_allowed CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  -- Taille max 5 Mo (5 * 1024 * 1024 = 5242880)
  CONSTRAINT chk_file_size_max CHECK (file_size <= 5242880)
);

-- Trigger : mise à jour automatique des flags has_* dans proof_bundles
-- quand on ajoute/supprime une preuve
CREATE OR REPLACE FUNCTION update_bundle_flags()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_bundle_id uuid;
BEGIN
  v_bundle_id := COALESCE(NEW.bundle_id, OLD.bundle_id);

  UPDATE proof_bundles SET
    has_ad      = EXISTS (SELECT 1 FROM proofs WHERE bundle_id = v_bundle_id AND type = 'SCREENSHOT_AD'),
    has_payment = EXISTS (SELECT 1 FROM proofs WHERE bundle_id = v_bundle_id AND type = 'PAYMENT_PROOF'),
    has_cession = EXISTS (SELECT 1 FROM proofs WHERE bundle_id = v_bundle_id AND type = 'CESSION_CERT')
  WHERE id = v_bundle_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_bundle_flags
  AFTER INSERT OR UPDATE OR DELETE ON proofs
  FOR EACH ROW EXECUTE FUNCTION update_bundle_flags();
