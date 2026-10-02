# Project: [Nom du projet]

> [Description courte — une ligne]

---

## Cadrage initial

> Section optionnelle mais fortement recommandée. Si tu as utilisé `/office-hours project` en amont, colle ici le bloc produit. Sinon, remplis-la directement à partir de tes notes. Si tu sautes cette section, le projet démarre sans cadrage explicite et `/project-start` le signalera.

- **Utilisateurs réels** : qui va se servir de l'outil au quotidien ?
- **Problème à résoudre** : quel pain point concret, formulé du point de vue de l'utilisateur ?
- **Version minimale de valeur** : qu'est-ce qui rend l'outil utile dès la v0.1, en une phrase ?
- **Hors-scope** : qu'est-ce qui ne sera **pas** construit, au moins dans les premières versions ?
- **Critère de succès à 3 mois** : comment saura-t-on que l'outil sert vraiment ?
- **Alternatives existantes** : comment ce besoin est-il couvert aujourd'hui (Excel, autre outil interne, rien) ?

---

## Type

`electron` | `tauri` | `nextjs` | `react-spa` | `node-api` | `full-stack` | `other`

## Déploiement

`desktop` | `web` | `serveur` | `cli` | `desktop+serveur`

> Préciser si l'application comporte plusieurs processus distincts (ex : interface desktop + worker de fond + API locale).

---

## Stack

| Layer      | Technology |
|------------|------------|
| Runtime    | …          |
| Framework  | …          |
| UI         | …          |
| DB         | …          |
| Build      | …          |
| Tests      | …          |
| Quality    | …          |

## Architecture

[Décrire les couches de l'application.]

```
Renderer
  └─ hooks
       └─ Transport
            └─ Service
                 └─ Persistence
```

---

## Modes de fonctionnement

[Lister les modes distincts si l'application en a plusieurs.]

| Mode    | Description                          |
|---------|--------------------------------------|
| `dev`   | Développement local avec hot-reload  |
| `prod`  | Production                           |

> Supprimer cette section si l'application n'a qu'un seul mode.

---

## Services externes

[Lister les dépendances vers des services ou APIs externes.]

| Service | Usage | Accès |
|---------|-------|-------|
| …       | …     | …     |

> Supprimer cette section si l'application n'a aucune dépendance externe.

---

## Variables d'environnement

[Noms de variables uniquement, jamais de valeurs. Sera utilisé pour générer `.env.example`.]

```env
# Catégorie
NOM_VARIABLE=
```

> Supprimer cette section si l'application n'utilise pas de variables d'environnement.

---

## Dev Commands

```bash
{commande start}      # Lancer en dev
{commande test}       # Exécuter les tests
{commande build}      # Build production
{commande lint}       # Lint check
{commande lint:fix}   # Lint fix auto
{commande format}     # Formatter (si applicable)
```

---

## Code Conventions

- **Langue du code** : `FR` | `EN` (commentaires, nommage DB, messages d'erreur internes)
- **Langue de l'interface** : `FR` | `EN` (labels, messages utilisateur, notifications)
- **Nommage** : ex. camelCase TypeScript, snake_case DB
- **Style** : ex. ESLint Airbnb, ruff, autre
- **Principes** : KISS, DRY, YAGNI, SOLID

---

## Modules / Domaine

Liste des modules ou entités principales du projet :

- `ModuleA` : description courte
- `ModuleB` : description courte

---

## Design

> Choisir un seul des trois cas suivants et supprimer les deux autres.

### Cas 1 — Pas d'interface utilisateur

Le projet est une CLI, un worker, une API ou un service sans UI. Aucun design requis.

### Cas 2 — Interface présente, design déjà produit

- **Source du design** : Claude Design
- **Emplacement** :
  - `DESIGN.md` à la racine — tokens du design system (couleurs, typographie, espacements, rayons).
  - `design/patterns/` — patterns d'écran de référence (`list.tsx`, `form.tsx`, `list+form.tsx`), si déjà produits via `/design-patterns-bootstrap`.
  - `design/handoff/` — écrans sur-mesure produits via `/design-screen-prompt` pour les cas qui ne rentrent dans aucun pattern (dashboards, wizards, écrans composites…).

> Les agents UI utiliseront `DESIGN.md` (tokens), `design/patterns/` (coquilles réutilisables pour les CRUD) et `design/handoff/` (écrans sur-mesure, dont les dashboards) comme références pour générer les composants. `/project-start` mentionnera explicitement ces fichiers dans le `CLAUDE.md` généré.

### Cas 3 — Interface présente, design à produire plus tard

- **État** : à faire
- **Plan** : produire dans cet ordre :
  1. `DESIGN.md` via `/design-system-bootstrap` (tokens fondamentaux).
  2. `design/patterns/` via `/design-patterns-bootstrap` (patterns d'écran réutilisables).
  3. Au cas par cas, `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les écrans sur-mesure qui sortent des patterns standards.

> Le projet peut démarrer sans design. Les agents UI travailleront sans guide visuel tant que `DESIGN.md` et `design/patterns/` n'existent pas, et produiront des composants par défaut.

---

## Agents à inclure

Cocher les agents standards à activer (ils sont déjà présents dans `.claude/agents/` après copie initiale du dossier `Claude/`) :

- [ ] `test` — tests unitaires et d'intégration. Recommandé pour tout projet.
- [ ] `migration` — migrations ORM/DB. Inclure si une base de données est dans la stack.
- [ ] `audit` — audit de cohérence transversale entre couches. Inclure si le projet est multi-couches (UI + transport + service + DB).
- [ ] `component` — composants UI génériques partagés. Inclure si une bibliothèque de composants partagés est prévue.
- [ ] `feature` — implémentation d'une feature de bout en bout (UI + service + persistence). Inclure si tu veux déléguer une feature complète à un agent plutôt que d'orchestrer manuellement.

---

## Agents additionnels

[Déclarer ici les agents métier spécifiques à ce projet.]

- `nom-agent` : description du périmètre

> Supprimer cette section si aucun agent métier spécifique n'est nécessaire.

---

## Notes

[Contraintes connues, décisions d'architecture importantes, contexte métier, dépendances externes particulières.]
