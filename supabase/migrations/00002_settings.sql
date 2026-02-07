-- Skuld — Migration 00002 : Table settings
-- Configuration de l'auto-entrepreneur (une seule ligne par instance)

CREATE TABLE settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid UNIQUE NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  siret                  char(14) NOT NULL,
  company_name           text NOT NULL,
  activity_type          activity_type NOT NULL,
  address_line1          text NOT NULL,
  address_line2          text,
  postal_code            char(5) NOT NULL,
  city                   text NOT NULL,
  phone                  text,
  email                  text NOT NULL,
  bank_iban              text,
  bank_bic               text,
  vat_exempt_text        text NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
  activity_start_date    date,
  declaration_frequency  declaration_freq NOT NULL DEFAULT 'MONTHLY',
  default_payment_terms  int NOT NULL DEFAULT 30,
  default_payment_method payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
  logo_url               text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  -- Contraintes de format
  CONSTRAINT chk_siret_format       CHECK (siret ~ '^\d{14}$'),
  CONSTRAINT chk_postal_code_format CHECK (postal_code ~ '^\d{5}$'),
  CONSTRAINT chk_payment_terms      CHECK (default_payment_terms >= 0 AND default_payment_terms <= 365)
);

-- Empêche la création de plus d'une ligne dans settings
-- On utilise un trigger plutôt qu'une contrainte car c'est plus explicite
CREATE OR REPLACE FUNCTION enforce_single_settings_row()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM settings) >= 1 THEN
    RAISE EXCEPTION 'Une seule configuration est autorisée par instance. Utilisez UPDATE pour modifier la configuration existante.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_settings
  BEFORE INSERT ON settings
  FOR EACH ROW EXECUTE FUNCTION enforce_single_settings_row();
