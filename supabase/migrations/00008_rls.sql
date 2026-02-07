-- Skuld — Migration 00008 : Row Level Security
-- Même en single-tenant, le RLS empêche tout accès sans JWT valide.
-- Le pattern vérifie qu'un settings existe pour l'utilisateur authentifié.

-- Fonction helper réutilisée par toutes les policies
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM settings WHERE user_id = auth.uid()
  );
$$;

-- settings : seul le propriétaire peut lire et modifier sa config
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY settings_insert ON settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY settings_update ON settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY settings_delete ON settings
  FOR DELETE USING (user_id = auth.uid());

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_all ON contacts
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_all ON documents
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- document_lines : protégé via la FK CASCADE vers documents
-- mais on active quand même le RLS par sécurité en profondeur
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_lines_all ON document_lines
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- sequences
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY sequences_all ON sequences
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_all ON transactions
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- proof_bundles
ALTER TABLE proof_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY proof_bundles_all ON proof_bundles
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- proofs
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY proofs_all ON proofs
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
