-- Skuld — Migration 00009 : Index de performance
-- Optimisent les requêtes fréquentes (listes, filtres, dashboard)

-- Documents : filtrage par statut et par type (onglets)
CREATE INDEX idx_documents_status ON documents (status);
CREATE INDEX idx_documents_type   ON documents (doc_type);
CREATE INDEX idx_documents_contact ON documents (contact_id);
CREATE INDEX idx_documents_issued ON documents (issued_date);

-- Lignes de document : lookup par document
CREATE INDEX idx_document_lines_doc ON document_lines (document_id);

-- Transactions : filtrage par date (dashboard URSSAF) et par catégorie fiscale
CREATE INDEX idx_transactions_date   ON transactions (date);
CREATE INDEX idx_transactions_fiscal ON transactions (fiscal_category, date);
CREATE INDEX idx_transactions_dir    ON transactions (direction, date);
CREATE INDEX idx_transactions_doc    ON transactions (document_id);

-- Contacts : filtrage par type
CREATE INDEX idx_contacts_type ON contacts (type);

-- Preuves : lookup par bundle
CREATE INDEX idx_proofs_bundle ON proofs (bundle_id);

-- Proof bundles : lookup par transaction
CREATE INDEX idx_proof_bundles_transaction ON proof_bundles (transaction_id);
