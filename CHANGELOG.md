# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [0.1.0] — 2026-02-09

Première version fonctionnelle complète (MVP).

### Ajouté

#### Backend (API)
- API REST complète avec Hono sur Cloudflare Workers
- Authentification JWT via Supabase Auth (middleware sur toutes les routes)
- Routes Settings : configuration initiale (setup), lecture, mise à jour, upload logo, export données, suppression compte
- Routes Contacts : CRUD complet avec recherche et protection contre la suppression de contacts liés
- Routes Documents : CRUD + envoi, paiement, annulation, conversion devis → facture, génération PDF
- Routes Transactions : CRUD avec création automatique d'un dossier de preuves pour les achats d'occasion
- Routes Preuves : upload fichiers vers R2, consultation bundle, téléchargement, génération PDF certificat de cession
- Routes Dashboard : totaux URSSAF mensuel/trimestriel, alertes de seuils, export CSV
- Génération PDF avec pdf-lib (documents commerciaux + certificats de cession)
- Validation Zod sur toutes les entrées API
- Pagination configurable avec métadonnées
- Gestion d'erreurs centralisée

#### Frontend
- Application Vue 3 SPA avec Composition API et TypeScript strict
- Module Auth : login email/mot de passe + magic link, guards de route
- Module Setup : formulaire de configuration initiale
- Module Contacts : liste paginée, formulaire création/édition, fiche détail
- Module Documents : liste avec onglets (Devis/Factures/Avoirs), éditeur de lignes avec ventilation fiscale, actions (envoyer, payer, annuler, convertir)
- Module Trésorerie : liste paginée, formulaire, détail, upload de preuves, checklist faisceau de preuves
- Module Dashboard URSSAF : sélecteur de période, cartes fiscales, barres de progression, alertes, export CSV
- Module Paramètres : profil entreprise, logo, personnalisation documents, fréquence de déclaration, export données, suppression compte
- Layout responsive : sidebar mobile avec drawer, header adaptatif, toasts
- Composants réutilisables : ConfirmDialog, AppToast, AppLoading

#### Base de données
- 10 migrations SQL pour PostgreSQL (Supabase)
- Row Level Security (RLS) sur toutes les tables avec policy `is_owner()`
- Triggers d'immutabilité sur les documents envoyés/payés
- Numérotation séquentielle des documents via `next_sequence()` avec `FOR UPDATE`
- Index de performance (14 index)

#### Schémas partagés
- Types TypeScript pour toutes les entités (enums, documents, contacts, transactions, etc.)
- Schémas Zod de validation partagés entre frontend et backend
- Constantes : seuils URSSAF, types MIME, taille maximale des fichiers, préfixes documents

#### Tests
- 185 tests unitaires et d'intégration (Vitest)
- 6 specs E2E (Playwright)
- Tests de sécurité : auth sur toutes les routes, validation uploads, setup unique
- Tests d'intégration : immutabilité, calculs URSSAF, numérotation séquentielle
- Tests contenu PDF : mentions légales, données extraites

#### CI/CD
- Workflow GitHub Actions : type-check + tests sur chaque push/PR

#### Documentation
- Spécification fonctionnelle et technique complète
- Guide de déploiement pas-à-pas dans le README
- Guide de contribution (CONTRIBUTING.md)
- Roadmap et suivi d'avancement
