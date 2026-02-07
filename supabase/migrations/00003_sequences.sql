-- Skuld — Migration 00003 : Table sequences + fonction next_sequence()
-- Numérotation séquentielle des documents (FAC-2026-0001, DEV-2026-0002, etc.)
-- Utilise SELECT ... FOR UPDATE pour éviter les doublons en concurrence

CREATE TABLE sequences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type    doc_type NOT NULL,
  prefix      text NOT NULL,
  year        int NOT NULL,
  current_val int NOT NULL DEFAULT 0,

  CONSTRAINT uq_sequences_type_year UNIQUE (doc_type, year),
  CONSTRAINT chk_current_val_positive CHECK (current_val >= 0)
);

-- Fonction appelée lors du passage d'un document en SENT
-- Retourne la prochaine référence (ex: FAC-2026-0001)
CREATE OR REPLACE FUNCTION next_sequence(p_type doc_type)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  seq RECORD;
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_prefix text;
BEGIN
  -- Verrouillage de la ligne pour éviter les doublons
  SELECT * INTO seq FROM sequences
    WHERE doc_type = p_type AND year = v_year
    FOR UPDATE;

  IF NOT FOUND THEN
    -- Première utilisation de l'année : création de la séquence
    v_prefix := CASE p_type
      WHEN 'INVOICE'     THEN 'FAC-'
      WHEN 'QUOTE'       THEN 'DEV-'
      WHEN 'CREDIT_NOTE' THEN 'AV-'
    END;
    INSERT INTO sequences (doc_type, prefix, year, current_val)
    VALUES (p_type, v_prefix, v_year, 1)
    RETURNING * INTO seq;
  ELSE
    -- Incrémentation du compteur
    UPDATE sequences SET current_val = current_val + 1
      WHERE id = seq.id
      RETURNING * INTO seq;
  END IF;

  -- Format : PREFIX + ANNÉE + - + NUMÉRO sur 4 chiffres
  RETURN seq.prefix || seq.year || '-' || LPAD(seq.current_val::text, 4, '0');
END;
$$;
