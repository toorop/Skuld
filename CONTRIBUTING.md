# Contribuer à Skuld

Merci de votre intérêt pour Skuld ! Ce guide explique comment contribuer au projet.

## Prérequis

- **Node.js** >= 18
- **npm** >= 9
- Un projet **Supabase** (pour les tests d'intégration et le développement local)

## Installation pour le développement

```bash
# Cloner le dépôt
git clone https://github.com/toorop/Skuld.git
cd Skuld

# Installer les dépendances
npm install

# Copier les variables d'environnement du backend
cp backend/.dev.vars.example backend/.dev.vars
# Remplir avec vos clés Supabase
```

## Lancer le projet en local

```bash
# Backend (Cloudflare Workers via Wrangler)
npm run dev:backend

# Frontend (Vite, dans un autre terminal)
npm run dev:frontend
```

## Tests

```bash
# Lancer tous les tests unitaires et d'intégration
npm test

# Lancer les tests en mode watch
npm run test:watch

# Type-check + tests
npm run check
```

Avant de soumettre une PR, vérifiez que `npm run check` passe sans erreur.

## Structure du monorepo

| Dossier | Description |
| ------- | ----------- |
| `packages/shared/` | Types TypeScript, schémas Zod, constantes — partagés entre front et back |
| `backend/` | API Hono déployée sur Cloudflare Workers |
| `frontend/` | Application Vue 3 déployée sur Cloudflare Pages |
| `supabase/migrations/` | Migrations SQL (PostgreSQL) |
| `e2e/` | Tests E2E Playwright |
| `docs/` | Spécification, roadmap, suivi d'avancement |

## Conventions de code

### TypeScript

- `strict: true` partout
- `camelCase` en TypeScript, `snake_case` en SQL
- Composants Vue : PascalCase, un fichier `.vue` par composant, `<script setup>` + Composition API
- Réponses API : `{ data, error, meta }`

### Validation

- Les schémas Zod sont définis dans `packages/shared/` et utilisés à la fois côté API (validation entrée) et côté frontend (validation formulaires).
- Toute nouvelle route API doit valider ses entrées avec un schéma Zod.

### Langue

- **Tout en français** : commentaires, documentation, messages d'erreur, libellés d'UI.
- **Code en anglais** : noms de variables, fonctions, composants (convention standard).
- **Pas d'i18n** : les chaînes françaises sont en dur. Pour les lookups dynamiques, utiliser des `const Record<string, string>`.

### Commits

Format [Conventional Commits](https://www.conventionalcommits.org/) avec description en français :

```
feat: ajouter l'export PDF des devis
fix: corriger le calcul du total HT avec remise
docs: mettre à jour le guide de déploiement
refactor: simplifier le middleware d'authentification
test: ajouter les tests d'immutabilité des documents
chore: mettre à jour les dépendances
```

Préfixes autorisés : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Workflow de contribution

1. **Fork** le dépôt et créez une branche depuis `main` :
   ```bash
   git checkout -b feat/ma-fonctionnalite
   ```

2. **Développez** votre fonctionnalité ou correction.

3. **Testez** : ajoutez des tests si nécessaire et vérifiez que tout passe :
   ```bash
   npm run check
   ```

4. **Commitez** en suivant les conventions ci-dessus.

5. **Poussez** et ouvrez une **Pull Request** vers `main`.

## Points d'attention

- **Conformité fiscale** : les documents (factures, devis, avoirs) doivent respecter la réglementation française. Ne modifiez pas les mentions légales sans vérification.
- **Immutabilité** : un document envoyé (`SENT`) ou payé (`PAID`) ne peut plus être modifié. Ce comportement est protégé par des triggers SQL et des vérifications côté API.
- **Sécurité** : toutes les routes API sont protégées par JWT. Le RLS Supabase est actif sur toutes les tables. Ne contournez pas ces protections.
- **Migrations SQL** : les fichiers dans `supabase/migrations/` sont préfixés avec un horodatage (`YYYYMMDDHHMMSS_description.sql`). Ne modifiez jamais une migration existante — créez-en une nouvelle.

## Signaler un bug

Ouvrez une [issue sur GitHub](https://github.com/toorop/Skuld/issues) avec :

- La description du problème
- Les étapes pour reproduire
- Le comportement attendu vs observé
- Votre environnement (navigateur, OS)

## Licence

En contribuant à Skuld, vous acceptez que votre contribution soit publiée sous la [licence MIT](LICENSE).
