# Project: [Nom du projet]

> [Description courte — une ligne]

## Type

`electron` | `tauri` | `nextjs` | `react-spa` | `node-api` | `full-stack` | `other`

## Déploiement

`desktop` | `web` | `serveur` | `cli` | `desktop+serveur`

> Préciser si l'application comporte plusieurs processus (ex : interface desktop + worker de fond + API locale).

## Stack

| Layer      | Technology               |
|------------|--------------------------|
| Runtime    | Node.js 22               |
| Framework  | React 18                 |
| UI         | TailwindCSS 4 + shadcn/ui |
| DB         | SQLite + Drizzle ORM     |
| Build      | Vite 7                   |
| Tests      | Vitest 4                 |
| Quality    | ESLint + Prettier        |

## Architecture

[Décrire les couches de l'application, ex :]

```
Renderer (React)
  └─ useGenericCrud / hooks
       └─ IPC / API
            └─ Service
                 └─ DB / ORM
```

## Modes de fonctionnement

[Lister les modes distincts de l'application, s'il y en a plusieurs, ex :]

| Mode        | Description                                      |
|-------------|--------------------------------------------------|
| `dev`       | Développement local avec hot-reload              |
| `staging`   | Environnement de test avec données réelles       |
| `prod`      | Production                                       |

> Supprimer cette section si l'application n'a qu'un seul mode de fonctionnement.

## Services externes

[Lister toutes les dépendances vers des services ou APIs externes, ex :]

| Service       | Usage                        | Accès           |
|---------------|------------------------------|-----------------|
| Stripe        | Paiements                    | API key         |
| SendGrid      | Emails transactionnels       | API key         |
| Google OAuth  | Authentification             | OAuth 2.0       |
| AWS S3        | Stockage fichiers            | Access key      |

> Supprimer cette section si l'application n'a pas de dépendances externes.

## Variables d'environnement

[Lister les noms de variables uniquement — pas les valeurs. Sera utilisé pour générer `.env.example`, ex :]

```env
# Base de données
DATABASE_URL=

# Authentification
JWT_SECRET=
SESSION_SECRET=

# Services externes
STRIPE_API_KEY=
SENDGRID_API_KEY=
```

> Supprimer cette section si l'application n'a pas de variables d'environnement.

## Dev Commands

```bash
npm start         # Lancer en dev
npm test          # Exécuter les tests
npm run build     # Build production
npm run lint      # Lint (check)
npm run lint:fix  # Lint (fix auto)
npm run format    # Prettier (fix)
```

## Code Conventions

- **Langue du code** : `FR` | `EN` (commentaires, nommage DB, messages d'erreur)
- **Langue de l'interface** : `FR` | `EN` (labels, messages utilisateur, notifications)
- **Nommage** : ex. camelCase TypeScript, snake_case DB
- **Style** : ESLint Airbnb | Standard | autre
- **Principes** : KISS, DRY, YAGNI, SOLID

## Modules / Domaine

Liste des modules ou entités principales du projet :

- `ModuleA` : description courte
- `ModuleB` : description courte

## Agents à inclure

Cocher les agents à inclure dans `.claude/agents/` :

- `test` — tests unitaires et d'intégration (recommandé toujours)
- `migration` — migrations ORM/DB (si DB/ORM dans le stack)
- `audit` — audit de cohérence transversale (si projet multi-couches)
- `component` — composants UI génériques (si bibliothèque de composants partagés)

## Agents additionnels

[Déclarer ici les agents métier spécifiques à ce projet, ex :]

- `pipeline-agent` : gestion des pipelines de données (ingestion, transformation, stockage)
- `strategy-agent` : implémentation et validation des stratégies métier

> Supprimer cette section si aucun agent additionnel n'est nécessaire.

## Roadmap initiale

[Lister les versions prévues et leurs items. Sera utilisé pour générer `docs/roadmap.md`, ex :]

### v0.1.0 — {titre}

- Item 1 : description courte
- Item 2 : description courte

### v0.2.0 — {titre}

- Item 1 : description courte

> Supprimer cette section si la roadmap n'est pas encore définie (elle sera alimentée manuellement dans `docs/roadmap.md`).

## Backlog initial

[Lister les idées d'évolution et questions ouvertes connues dès le départ. Sera utilisé pour générer `docs/backlog.md`, ex :]

### Améliorations

- Amélioration A : description courte
- Amélioration B : description courte

### Questions ouvertes

- Question A
- Question B

> Supprimer cette section si le backlog est vide au démarrage.

## Design

- **Outil** : Claude Design | Figma | autre
- **État** : à faire | en cours | terminé
- **Handoff** : `design/handoff/` | [lien vers le prototype] | —

> Supprimer cette section si le projet n'a pas d'interface graphique ou si aucun prototypage n'est prévu.

## Notes

[Contraintes connues, dépendances externes, décisions d'architecture importantes, contexte métier...]
