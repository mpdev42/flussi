# CLAUDE.md — Référence pour sessions IA

Projet **Flussi** — logiciel d'échange de fichiers AC056 entre notre logiciel de gestion métier VEOS (IGA) et notre partenaire MSP. Portage Electron, à parité fonctionnelle, de l'application Lazarus existante.

> La roadmap est dans `docs/roadmap.md`. Le backlog est dans `docs/backlog.md`.
> Centraliser toutes les notes de projet dans ces deux fichiers.

---

## Cadrage initial

**Cadrage — 2026-10-01**

- **Utilisateurs réels** : le service administratif.
- **Problème à résoudre** : porter vers Electron l'application Lazarus qui génère un fichier et l'envoie à un partenaire. Le portage seul n'apporte rien à l'utilisateur. On en profite pour définir avec lui les améliorations à apporter.
- **Version minimale (v0.1)** : portage complet des fonctions existantes : récupération du fichier auprès de VEOS, chargement et contrôle avant envoi, envoi chez MSP, récupération et contrôle des fichiers de rejet mis à disposition par MSP, lecture des logs, chargement d'un fichier pour contrôle.
- **Hors scope** : aucune exclusion : toutes les fonctions sont construites dans la première version.
- **Critère de succès à 3 mois** : l'application est en production, validée par le service administratif, et Lazarus est arrêtée.
- **Outil existant** : l'application Lazarus actuelle couvre le besoin. Elle sera abandonnée au profit d'Electron, désormais utilisé pour développer les applications.

**Conditions de bascule** (issues des notes de `docs/project-description.md`) :

- **Conformité AC056** : tout fichier AC056 écrit par Flussi est rechargé dans Lazarus avec sa fonction de chargement et doit passer ses contrôles sans erreur. Un fichier VEOS chargé puis enregistré sans modification par Flussi doit être identique à l'original, octet par octet.
- **Date de bascule** : hors de la période du 15 décembre au 31 janvier (pic des renouvellements et des mouvements au 1er janvier).
- **Arrêt de Lazarus** : Lazarus est stockée sur `P:` et n'est installée sur aucun poste. Après validation de Flussi, son dossier est renommé (`flussi_old`) et conservé quelques semaines comme solution de repli, puis supprimé.
- **Usage** : un seul utilisateur à la fois, deux lancements par jour (matin et soir), toujours par le service administratif.

> Pre-mortem du projet : `docs/premortem/premortem-project-2026-10-02.md`. Échec le plus dangereux : divergence silencieuse de la parité AC056 (encodage, padding, positions comptées en caractères au lieu d'octets, CRLF).

---

## Stack technique

| Layer      | Technology |
|------------|------------|
| Runtime    | Node.js (embarqué par Electron) + Electron |
| Framework  | React + TypeScript (strict) |
| UI         | Tailwind CSS + shadcn/ui |
| DB         | Aucune (fichiers sur le stockage partagé ; SQLite exclu sur un dossier SharePoint synchronisé) |
| Build      | electron-vite + electron-builder (NSIS, pour Intune) |
| Tests      | Vitest (unitaires) + Playwright (e2e Electron) |
| Quality    | ESLint + Prettier + zod (validation de la configuration et des échanges IPC) |

> Les bibliothèques de transfert et d'encodage (`basic-ftp`, `ssh2-sftp-client`, gestion ANSI/UTF-8) seront ajoutées par les items concernés, pas au bootstrap.

**Contraintes de versions** (plages `^` dans `package.json`, `package-lock.json` fait référence) — ne pas monter ces paquets sans vérifier la compatibilité :

- `vite` reste en 7.x : `electron-vite` 5 n'accepte pas vite 8. `@vitejs/plugin-react` reste en 5.x pour la même raison.
- `typescript` reste en 6.0.x : `typescript-eslint` 8 exige `typescript < 6.1`.
- `tailwindcss` reste en 3.4.x : la configuration (`tailwind.config.js`, directives `@tailwind`, plugin PostCSS) et les variables shadcn sont au format v3. `tailwind-merge` reste en 2.x (la v3 cible Tailwind 4).

---

## Architecture

```
Renderer (pages, composants)
  └─ hooks                         état d'écran, appels asynchrones, rafraîchissement
       └─ services renderer        façade typée sur window.api, un fichier par module
            └─ Preload (contextBridge)   expose l'API IPC, jamais ipcRenderer brut
                 └─ IPC handlers (main/ipc/{module})   validation zod des entrées, renvoi d'erreurs typées
                      └─ Services métier (main/services)   orchestration des cas d'usage
                           └─ Adapters (main/adapters)       entrées-sorties techniques, remplaçables
                                ├─ stockage    lecture/écriture des fichiers de travail (IN, OUT, Journal)
                                ├─ ftp-iga     client FTP
                                ├─ sftp-msp    client SFTP (clé + mot de passe)
                                ├─ veos        fenêtre Chromium cachée pilotée par JavaScript
                                └─ config      chemins, environnement, secrets

Domaine AC056 (shared/domain)   pur TypeScript, sans entrées-sorties
  lecture et écriture en largeur fixe, règles de contrôle, rejets, codes ERRxxx
```

- **Domaine AC056 partagé** : utilisé côté main (lecture et écriture des fichiers) et côté renderer (contrôle en direct à la sortie d'un champ). C'est la zone la plus couverte par les tests.
- **Adapter `stockage`** : les services ne manipulent que des emplacements logiques (`in`, `out`, `journal`), jamais des chemins Windows. En v1.0, l'implémentation pointe vers des dossiers configurables (`P:`). Une implémentation Graph/SharePoint la remplacera plus tard.
- **Adapter `veos`** : VEOS n'expose pas d'API de lancement de workflow. Le pilotage de la page web est isolé ici, pour pouvoir être remplacé si IGA ouvre un accès par l'API.
- **Secrets** : ils ne transitent jamais vers le renderer.
- **Alias d'import** : `@` pointe vers `src/renderer/src` (renderer uniquement), `@shared` pointe vers `src/shared` (main, preload, renderer, tests). Déclarés dans `electron.vite.config.ts`, `tsconfig.json` et `vitest.config.ts`.
- **Build** : main et preload émis en CJS avec l'extension `.cjs` (`out/main/index.cjs`, `out/preload/index.cjs`), malgré `"type": "module"` dans `package.json`. L'extension `.cjs` est indispensable : Electron 44 (Node 24) applique `"type": "module"` à un preload en `.js` et le charge comme module ES, ce qui casse `require` et laisse `window.api` à `undefined`. Ne pas retirer les blocs `rollupOptions` de `electron.vite.config.ts` (voir pièges §7.1 et §7.2 de `.claude/templates/template-electron.md`).

### Déploiement

`desktop` — Windows uniquement, processus unique (main + preload + renderer).

- **Distribution** : Intune. electron-builder produit un installeur NSIS par machine (installation silencieuse `/S`), emballé en `.intunewin` comme application Win32.
- **Mises à jour** : poussées par Intune. Pas de mise à jour automatique dans l'application (pas d'`electron-updater`, `publish: null` dans `electron-builder.yml`).
- **Stockage de production** : lecteur `P:` (bibliothèque SharePoint) en v1.0, accessible uniquement par des chemins configurables derrière l'adapter `stockage`. La bascule vers SharePoint par Microsoft Graph se fera après la v1.0, sans impact sur le code métier.
- **Journal** : partagé entre tous les utilisateurs, dans le stockage de production. Un seul utilisateur à la fois : pas d'écriture concurrente à gérer. Chaque dépôt chez MSP y est tracé avec l'empreinte SHA-256 du fichier déposé.

---

## Modes de fonctionnement

| Mode       | Description |
|------------|-------------|
| `recette`  | VEOS de recette (`rec-veos.iga.fr`), SFTP MSP de recette (`mft-hp.macif.fr`, compte de recette), dossiers de travail locaux configurables. Mode par défaut avec `npm run dev`. |
| `prod`     | VEOS de production (`prod-veos.iga.fr`), SFTP MSP de production (`mft.macif.fr`, compte de production), dossiers de travail sur `P:\…\Transferts\` (IN, OUT, Journal). Mode par défaut de l'application installée. |

- **Sélection** : par configuration (variable `FLUSSI_ENV`, surchargeable dans `%ProgramData%\Flussi\config.json`), jamais par l'emplacement de l'exécutable.
- **Repère visible** : le mode est affiché dans le titre de la fenêtre, avec un bandeau de couleur en recette.
- **Point d'attention** : le serveur FTP IGA est unique dans les deux modes. En recette, les fichiers AC056 téléchargés sont donc des fichiers réels.
- **Garde-fou** : l'adapter `sftp-msp` refuse tout dépôt si l'hôte ne correspond pas au mode actif. En recette, aucun dépôt n'est possible vers `mft.macif.fr`.
- **Déploiement** : le `config.json` déployé par Intune fixe `FLUSSI_ENV` explicitement.

---

## Services externes

| Service | Usage | Accès |
|---------|-------|-------|
| VEOS (IGA) | Lancer le workflow d'export vers MSP (`EXPORT_APIVIA` côté VEOS) | Interface web pilotée : fenêtre Chromium cachée, identifiants VEOS personnels de l'utilisateur (saisis à chaque fois, jamais stockés), puis URL de lancement du workflow. L'API REST VEOS (`/rs/rsExtranet2`) n'expose pas de lancement de workflow. |
| IGA, FTP externe | Lister les fichiers AC056 du dossier `APIVIA`, contrôler leur date, les télécharger vers IN | FTP, compte technique (`basic-ftp` pressenti) |
| MSP (ex-APIVIA), serveur de transfert MACIF | Déposer l'AC056 dans `/Depot_AMM_NAS`, lister, récupérer les rejets dans `/Retrait` vers OUT | SFTP sur le port 10022, compte technique + mot de passe + clé privée (`ssh2-sftp-client` pressenti) |
| SharePoint, par le lecteur `P:` | Dossiers de travail IN, OUT et Journal partagé | Système de fichiers (lecteur réseau) en v1.0. Microsoft Graph après la v1.0, derrière l'adapter `stockage`. |

> MSP est le nouveau nom d'APIVIA. Le nom MSP est utilisé dans tout le code. Les noms côté IGA et VEOS (`APIVIA`, `EXPORT_APIVIA`) restent inchangés.

---

## Variables d'environnement

Référence : `.env.example`.

| Groupe | Variables |
|--------|-----------|
| Environnement | `FLUSSI_ENV` |
| Stockage (dossiers de travail — `P:` en v1.0) | `STOCKAGE_DOSSIER_TRAVAIL`, `STOCKAGE_DOSSIER_IN`, `STOCKAGE_DOSSIER_OUT`, `STOCKAGE_DOSSIER_JOURNAL` |
| VEOS (IGA) | `VEOS_URL`, `VEOS_WORKFLOW_EXPORT_ID` |
| IGA — FTP | `IGA_FTP_HOST`, `IGA_FTP_USER`, `IGA_FTP_PASSWORD`, `IGA_FTP_DOSSIER` |
| MSP — SFTP | `MSP_SFTP_HOST`, `MSP_SFTP_PORT`, `MSP_SFTP_USER`, `MSP_SFTP_PASSWORD`, `MSP_SFTP_CLE_PRIVEE_CHEMIN`, `MSP_SFTP_DOSSIER_DEPOT`, `MSP_SFTP_DOSSIER_RETRAIT` |

**Sources selon le contexte (mêmes noms partout)** :

- **Dev** : `.env` (ignoré par git).
- **Application installée, paramètres non secrets** : valeurs par défaut du mode dans le code, surchargées par `%ProgramData%\Flussi\config.json` (déployé par Intune, en lecture seule pour les utilisateurs), puis par les surcharges de l'écran Paramètres, enregistrées dans le profil de l'utilisateur (`%APPDATA%\Flussi\`).
- **Application installée, secrets** (`*_PASSWORD`, clé privée) : `safeStorage` d'Electron (DPAPI, propre à chaque utilisateur), saisis une fois dans l'écran Paramètres. Jamais intégrés au paquet.
- **Cible à terme** : Azure Key Vault, au moment de la bascule Graph/SharePoint.

Les identifiants VEOS sont personnels et saisis à chaque lancement : ils ne figurent pas ici.

---

## Structure des dossiers

```
src/
  main/
    index.ts                    fenêtre, cycle de vie, handler de smoke-test app:ping
    ipc/{veos,iga,msp,ac056,journal,parametres}/          handlers IPC par module
    services/{veos,iga,msp,ac056,journal,parametres}/     services métier par module
    adapters/{stockage,ftp-iga,sftp-msp,veos,config}/     entrées-sorties techniques
  preload/
    index.ts                    contextBridge + export type Api
  renderer/
    index.html
    src/
      components/ui/            composants shadcn (installés à la demande)
      hooks/                    état d'écran, appels asynchrones
      pages/                    écrans
      services/                 façade typée sur window.api, un fichier par module (veos.ts, iga.ts…)
      lib/utils.ts              helper cn (shadcn)
      styles/index.css          Tailwind + variables shadcn
      App.tsx
      main.tsx
  shared/
    domain/ac056/               domaine pur AC056 (entités 000 à 800, lecteur, écrivain, contrôles, ERRxxx)
    schemas/                    schémas zod (configuration, échanges IPC)
    types/
      index.ts                  types métier partagés
      window.d.ts               augmentation globale Window.api
e2e/
  specs/                        specs Playwright versionnés (smoke.spec.ts)
  fixtures/electron.ts          lancement de l'app buildée
  tsconfig.json
scripts/
  dev.mjs                       wrapper npm run dev (neutralise ELECTRON_RUN_AS_NODE)
  e2e.mjs                       wrapper npm run test:e2e (idem)
resources/                      ressources embarquées dans le paquet
build/                          ressources de build electron-builder (icône…)
design/                         sources de design (à produire)
docs/                           roadmap, backlog, description, pre-mortem
```

---

## Commandes de développement

```bash
npm run dev           # Lancer en dev — electron-vite dev (encapsulé par scripts/dev.mjs)
npm test              # Tests unitaires — vitest run
npm run test:e2e      # Tests e2e Playwright — après npm run build (encapsulé par scripts/e2e.mjs)
npm run build         # Build production — electron-vite build
npm run package       # Installeur Windows NSIS pour Intune — electron-vite build && electron-builder --win nsis
npm run typecheck     # Vérification des types — tsc --noEmit
npm run lint          # Lint check — eslint .
npm run lint:fix      # Lint fix auto — eslint . --fix
npm run format        # Formatter — prettier --write .
```

- Les tests e2e se lancent uniquement depuis la racine, via `npm run test:e2e`, après au moins un `npm run build`.
- Les tests unitaires vivent à côté du code (`src/**/*.test.ts`). Vitest ignore le dossier `e2e/`.
- ESLint et Prettier ignorent `.claude/`, `docs/` et `design/` (sources gérées par les skills).

---

## Conventions de code

- **Langue du code** : FR — commentaires, messages d'erreur internes et vocabulaire métier en français (sans accents dans les identifiants : `beneficiaire`, `evenement`, `rejet`). Les termes techniques imposés par l'écosystème restent en anglais (`services`, `adapters`, `hooks`, `handler`).
- **Langue de l'interface** : FR
- **Nommage** : camelCase pour les variables et fonctions, PascalCase pour les types et composants React, SCREAMING_SNAKE_CASE pour les constantes, kebab-case pour les fichiers hors composants, canaux IPC au format `module:action`. Pas de préfixes hongrois hérités de Lazarus (`s_`, `i_`, `b_`).
- **Style** : ESLint (flat config, typescript-eslint, react-hooks, react-refresh) + Prettier (`semi`, `singleQuote`, `trailingComma: all`), TypeScript strict
- **Principes** : KISS, DRY, YAGNI, SOLID, parité fonctionnelle avec Lazarus en v1.0 (toute divergence de comportement est explicite et validée)

---

## Modules / Entités

- `Veos` : lancement du workflow d'export vers MSP dans VEOS (saisie des identifiants personnels, pilotage de la page cachée, détection des échecs de connexion). S'appuie sur l'adapter `veos`.
- `Iga` : liste des fichiers AC056 sur le FTP IGA, avertissement si le fichier n'est pas du jour, téléchargement vers le dossier IN. S'appuie sur les adapters `ftp-iga` et `stockage`.
- `Msp` : dépôt de l'AC056 dans le dossier de dépôt avec listing de vérification, liste et téléchargement des fichiers de rejet vers le dossier OUT. S'appuie sur les adapters `sftp-msp` et `stockage`.
- `Ac056` : chargement d'un fichier, issu de VEOS (UTF-8) ou de rejet (ANSI). Navigation par évènement, bénéficiaire, garantie et entité, avec contrôle, marquage des erreurs, modification et enregistrement si le fichier ne contient plus d'erreur. Rejets rattachés : message par ligne et explication `ERRxxx`. S'appuie sur le domaine pur `shared/domain/ac056` (entités 000 à 800, lecteur, écrivain, règles de contrôle).
- `Journal` : écriture du journal de session dans le stockage partagé (une entrée d'index par session, avec date et utilisateur Windows), consultation de l'historique. Trace chaque dépôt MSP avec l'empreinte SHA-256 du fichier déposé.
- `Parametres` : mode actif, dossiers de travail (surcharge de `config.json`, enregistrée dans `%APPDATA%\Flussi\` : `%ProgramData%\Flussi\config.json` reste en lecture seule), saisie et mise à jour des secrets dans `safeStorage`. S'appuie sur l'adapter `config`.

---

## Design

- **État** : à faire
- **Plan** : produire dans cet ordre :
  1. `DESIGN.md` + composants atomiques `design/handoff/` via `/design-system-bootstrap` (tokens fondamentaux + atomes Button/Input/Card/Modal au format `.html`/`.css`/`.jsx`).
  2. Patterns d'écran composites `design/patterns/` via `/design-patterns-bootstrap` (list, form, list+form, au format `.tsx` self-contained). `list+form` en priorité pour l'écran AC056.
  3. Au cas par cas, écrans sur-mesure `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les items marqués `Pattern: custom` dans `version-{X}.md`.

Tant que `DESIGN.md` et `design/patterns/` n'existent pas, les agents UI travaillent sans guide visuel et produisent des composants par défaut. Préviens-moi si tu lances un travail UI avant que le design soit produit.

**Convention de format à venir** : `design/handoff/` contiendra des atomes au format `.html` + `.css` + `.jsx` (plusieurs représentations utiles à `component-agent`). `design/patterns/` contiendra des patterns au format `.tsx` self-contained uniquement (composition complète previewable, instanciée par `feature-agent`).

---

## Workflow obligatoire

Pour toute tâche de développement (fonctionnalité, bug, refonte) :

1. **Plan d'abord** — propose un plan d'implémentation détaillé.
2. **Attendre validation** — ne pas commencer à coder avant un `ok`, `go` ou `validé` explicite.
3. **Développement** — orchestrer les agents de `.claude/agents/` pour l'implémentation. Lancer en parallèle les agents indépendants.

Faire les Edit/Write sur les fichiers sources via les agents, pas depuis la session principale.
