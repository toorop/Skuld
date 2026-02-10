-- Skuld — Migration 00011 : Table attachments
-- Justificatifs généraux attachés directement aux transactions (dépenses)

CREATE TABLE attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid NOT NULL REFERENCES transactions ON DELETE CASCADE,
  file_url        text NOT NULL,
  file_name       text NOT NULL,
  file_size       int NOT NULL,
  mime_type       text NOT NULL,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),

  -- Taille de fichier positive
  CONSTRAINT chk_attachment_file_size_positive CHECK (file_size > 0),
  -- Types MIME autorisés
  CONSTRAINT chk_attachment_mime_type_allowed CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  -- Taille max 5 Mo (5 * 1024 * 1024 = 5242880)
  CONSTRAINT chk_attachment_file_size_max CHECK (file_size <= 5242880)
);

-- Index pour les requêtes par transaction
CREATE INDEX idx_attachments_transaction_id ON attachments (transaction_id);

-- RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_all ON attachments
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
