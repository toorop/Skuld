-- Skuld — Migration 00006 : Table transactions
-- Livre de trésorerie (recettes et dépenses)

CREATE TABLE transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  amount          numeric(12,2) NOT NULL,
  direction       transaction_dir NOT NULL,
  label           text NOT NULL,
  fiscal_category fiscal_category,
  payment_method  payment_method,
  document_id     uuid REFERENCES documents,
  contact_id      uuid REFERENCES contacts,
  is_second_hand  boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Le montant doit toujours être positif (la direction indique le sens)
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  -- Un achat d'occasion est forcément une dépense
  CONSTRAINT chk_second_hand_expense CHECK (
    NOT (is_second_hand = true AND direction = 'INCOME')
  )
);
