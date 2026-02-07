-- Skuld — Migration 00001 : Types ENUM
-- Catégories et statuts utilisés dans toutes les tables métier

CREATE TYPE fiscal_category   AS ENUM ('BIC_VENTE', 'BIC_PRESTA', 'BNC');
CREATE TYPE activity_type     AS ENUM ('BIC_VENTE', 'BIC_PRESTA', 'BNC', 'MIXED');
CREATE TYPE doc_type          AS ENUM ('QUOTE', 'INVOICE', 'CREDIT_NOTE');
CREATE TYPE doc_status        AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');
CREATE TYPE transaction_dir   AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE contact_type      AS ENUM ('CLIENT', 'SUPPLIER', 'BOTH');
CREATE TYPE proof_type        AS ENUM ('SCREENSHOT_AD', 'PAYMENT_PROOF', 'CESSION_CERT', 'INVOICE', 'OTHER');
CREATE TYPE payment_method    AS ENUM ('BANK_TRANSFER', 'CASH', 'CHECK', 'CARD', 'PAYPAL', 'OTHER');
CREATE TYPE declaration_freq  AS ENUM ('MONTHLY', 'QUARTERLY');
