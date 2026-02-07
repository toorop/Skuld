-- Skuld — Migration 00004 : Table contacts
-- Clients et fournisseurs (particuliers ou professionnels)

CREATE TABLE contacts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           contact_type NOT NULL DEFAULT 'CLIENT',
  display_name   text NOT NULL,
  legal_name     text,
  email          text,
  phone          text,
  address_line1  text,
  address_line2  text,
  postal_code    text,
  city           text,
  country        text NOT NULL DEFAULT 'FR',
  is_individual  boolean NOT NULL DEFAULT false,
  siren          char(9),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Un particulier ne peut pas avoir de SIREN
  CONSTRAINT chk_individual_no_siren CHECK (
    NOT (is_individual = true AND siren IS NOT NULL)
  ),
  -- Format SIREN : 9 chiffres
  CONSTRAINT chk_siren_format CHECK (
    siren IS NULL OR siren ~ '^\d{9}$'
  ),
  -- Code pays : 2 lettres ISO 3166
  CONSTRAINT chk_country_format CHECK (
    country ~ '^[A-Z]{2}$'
  )
);
