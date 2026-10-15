# CLAUDE.md — Référence pour sessions IA

Projet **Flussi** — logiciel d'échange de fichiers AC056 entre notre logiciel de gestion métier VEOS (IGA) et notre partenaire MSP. Portage Electron, à parité fonctionnelle, de l'application Lazarus existante.

> La roadmap est dans `docs/roadmap.md`. Le backlog est dans `docs/backlog.md`.
> Centraliser toutes les notes de projet dans ces deux fichiers.

---

## Cadrage initial

**Cadrage — 2026-10-01**

- **Utilisateurs réels** : le service administratif.
- **Problème à résoudre** : porter vers Electron l'application Lazarus qui génère un fichier et l'envoie à un partenaire. Le portage seul n'apporte rien à l'utilisateur. On en profite pour définir avec lui les améliorations à apporter.
- **Version livrée (v1.0)** : portage complet des fonctions existantes : récupération du fichier auprès de VEOS, chargement et contrôle avant envoi, envoi chez MSP, récupération et contrôle des fichiers de rejet mis à disposition par MSP, lecture des logs, chargement d'un fichier pour contrôle.
- **Versions intermédiaires** : les versions 0.1, 0.2… sont des étapes de développement internes, pas des livraisons aux utilisateurs.
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

| Layer     | Technology                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------- |
| Runtime   | Node.js (embarqué par Electron) + Electron                                                     |
| Framework | React + TypeScript (strict)                                                                    |
| UI        | Tailwind CSS + shadcn/ui                                                                       |
| DB        | Aucune (fichiers sur le stockage partagé ; SQLite exclu sur un dossier SharePoint synchronisé) |
| Build     | electron-vite + electron-builder (NSIS, pour Intune)                                           |
| Tests     | Vitest (unitaires) + Playwright (e2e Electron)                                                 |
| Quality   | ESLint + Prettier + zod (validation de la configuration et des échanges IPC)                   |

> Les bibliothèques de transfert et d'encodage (`basic-ftp`, `ssh2-sftp-client`, gestion ANSI/UTF-8) seront ajoutées par les items concernés, pas au bootstrap.

**Contraintes de versions** (plages `^` dans `package.json`, `package-lock.json` fait référence) — ne pas monter ces paquets sans vérifier la compatibilité :

- `vite` reste en 7.x : `electron-vite` 5 n'accepte pas vite 8. `@vitejs/plugin-react` reste en 5.x pour la même raison.
- `typescript` reste en 6.0.x : `typescript-eslint` 8 exige `typescript < 6.1`.
- `tailwindcss` reste en 3.4.x : la configuration (`tailwind.config.js`, directives `@tailwind`, plugin PostCSS) et les variables shadcn sont au format v3. `tailwind-merge` reste en 2.x (la v3 cible Tailwind 4).

Ces contraintes sont reprises dans les règles `ignore` de `.github/dependabot.yml` : toute modification se reporte aux deux endroits.

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

- **Distribution** : Intune. electron-builder produit un installeur NSIS par machine (installation silencieuse `/S`), emballé en `.intunewin` comme application Win32. `config.json` est déposé par une seconde application Win32, qui dépend de la première. L'installeur est le même en recette et en production, et ne contient ni `config.json` ni secret. Procédure et liste de contrôle du test pilote : `docs/deploiement-intune.md`.
- **Mises à jour** : poussées par Intune. Pas de mise à jour automatique dans l'application (pas d'`electron-updater`, `publish: null` dans `electron-builder.yml`).
- **Stockage de production** : lecteur `P:` (bibliothèque SharePoint) en v1.0, accessible uniquement par des chemins configurables derrière l'adapter `stockage`. La bascule vers SharePoint par Microsoft Graph se fera après la v1.0, sans impact sur le code métier.
- **Journal** : partagé entre tous les utilisateurs, dans le stockage de production. Un seul utilisateur à la fois : pas d'écriture concurrente à gérer. Chaque dépôt chez MSP y est tracé avec l'empreinte SHA-256 du fichier déposé.

---

## Modes de fonctionnement

| Mode      | Description                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `recette` | VEOS de recette (`rec-veos.iga.fr`), SFTP MSP de recette (`mft-hp.macif.fr`, compte de recette), dossiers de travail configurables, sans valeur par défaut. Seul mode accepté avec `npm run dev`.                  |
| `prod`    | VEOS de production (`prod-veos.iga.fr`), SFTP MSP de production (`mft.macif.fr`, compte de production), dossiers de travail sur `P:\…\Transferts\` (IN, OUT, Journal) par défaut. Application installée seulement. |

- **Sélection** : par la clé `FLUSSI_ENV`, obligatoire, sans valeur par défaut ni tolérance de casse, jamais par l'emplacement de l'exécutable. Application installée : `%ProgramData%\Flussi\config.json`. Dev : `.env` ou variables du processus. **En dev, le mode `prod` est refusé** : le travail réel en production se fait avec Flussi installé.
- **Refus de démarrer** : configuration absente, illisible, incomplète, clé inconnue, secret dans `config.json` ou `FLUSSI_ENV` invalide → boîte de dialogue Windows native (fichier, clé, attendu), puis arrêt. Jamais de repli sur `prod`.
- **Repère visible** : titre de la fenêtre « Flussi — Recette » en recette, « Flussi » seul en production ; bandeau Recette rayé et badge « Recette » dans l'en-tête en recette, rien en production.
- **Point d'attention** : le serveur FTP IGA est unique dans les deux modes. En recette, les fichiers AC056 téléchargés sont donc des fichiers réels.
- **Garde-fou** : l'adapter `sftp-msp` refuse tout dépôt si l'hôte ne correspond pas au mode actif. En recette, aucun dépôt n'est possible vers `mft.macif.fr`.
- **Déploiement** : le `config.json` déployé par Intune fixe `FLUSSI_ENV` explicitement.

---

## Services externes

| Service                                     | Usage                                                                                        | Accès                                                                                                                                                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VEOS (IGA)                                  | Lancer le workflow d'export vers MSP (`EXPORT_APIVIA` côté VEOS)                             | Interface web pilotée : fenêtre Chromium cachée, identifiants VEOS personnels de l'utilisateur (saisis à chaque fois, jamais stockés), puis URL de lancement du workflow. L'API REST VEOS (`/rs/rsExtranet2`) n'expose pas de lancement de workflow. |
| IGA, FTP externe                            | Lister les fichiers AC056 du dossier `APIVIA`, contrôler leur date, les télécharger vers IN  | FTP, compte technique (`basic-ftp` pressenti)                                                                                                                                                                                                        |
| MSP (ex-APIVIA), serveur de transfert MACIF | Déposer l'AC056 dans `/Depot_AMM_NAS`, lister, récupérer les rejets dans `/Retrait` vers OUT | SFTP sur le port 10022, compte technique + mot de passe + clé privée (`ssh2-sftp-client` pressenti)                                                                                                                                                  |
| SharePoint, par le lecteur `P:`             | Dossiers de travail IN, OUT et Journal partagé                                               | Système de fichiers (lecteur réseau) en v1.0. Microsoft Graph après la v1.0, derrière l'adapter `stockage`.                                                                                                                                          |

> MSP est le nouveau nom d'APIVIA. Le nom MSP est utilisé dans tout le code. Les noms côté IGA et VEOS (`APIVIA`, `EXPORT_APIVIA`) restent inchangés.

---

## Variables d'environnement

Référence : `.env.example`.

| Groupe                                        | Variables                                                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environnement                                 | `FLUSSI_ENV`                                                                                                                                                                                        |
| Stockage (dossiers de travail — `P:` en v1.0) | `STOCKAGE_DOSSIER_TRAVAIL`                                                                                                                                                                          |
| VEOS (IGA)                                    | `VEOS_URL`, `VEOS_WORKFLOW_EXPORT_ID`                                                                                                                                                               |
| IGA — FTP                                     | `IGA_FTP_HOST`, `IGA_FTP_USER`, `IGA_FTP_PASSWORD` (dev uniquement), `IGA_FTP_DOSSIER`                                                                                                              |
| MSP — SFTP                                    | `MSP_SFTP_HOST`, `MSP_SFTP_PORT`, `MSP_SFTP_USER`, `MSP_SFTP_PASSWORD` (dev uniquement), `MSP_SFTP_CLE_PRIVEE_CHEMIN` (dev uniquement), `MSP_SFTP_DOSSIER_DEPOT`, `MSP_SFTP_DOSSIER_RETRAIT`        |
| Tests (dev uniquement)                        | `AC056_CORPUS_DIR` (corpus AC056 de référence sur `P:`, voir « Commandes de développement »), `FLUSSI_PROFIL_DEV` (profil Electron des e2e, variable du processus seulement, jamais dans le `.env`) |

**Sources selon le contexte (mêmes noms partout)** :

- **Dev** (`!app.isPackaged`, e2e compris) : valeurs par défaut du mode, puis le `.env` du répertoire courant **seul** (ignoré par git, lu par `util.parseEnv`, jamais versé dans `process.env`). Les variables d'environnement du processus sont ignorées pour la configuration : une copie restée dans un terminal ne masque jamais le `.env`. `%ProgramData%\Flussi\config.json` n'est **jamais** lu en dev. Le `.env` accepte aussi les secrets de dev et `AC056_CORPUS_DIR`, absents de la configuration résolue. Valeur vide = absente.
- **Terminaux VS Code** : `.vscode/settings.json` fixe `"python.terminal.useEnvFile": false`, sinon l'extension Python Environments injecte le `.env` (mots de passe compris) dans chaque terminal du projet. Ne pas retirer ce réglage.
- **Application installée, paramètres non secrets** : valeurs par défaut du mode dans le code, puis `%ProgramData%\Flussi\config.json` (obligatoire, déployé par Intune, en lecture seule pour les utilisateurs ; clés à plat, mêmes noms que les variables, BOM UTF-8 accepté). Le `.env` n'est jamais lu. Aucune surcharge dans `%APPDATA%\Flussi\`.
- **Dossiers de travail** : `STOCKAGE_DOSSIER_TRAVAIL` seul, chemin absolu Windows. `IN`, `OUT` et `Journal` en sont toujours dérivés (`{TRAVAIL}\IN`…, noms fixes, disposition de Lazarus) et doivent exister : Flussi ne les crée jamais (seuls les sous-dossiers `Journal\AAAA\MM`), et refuse de démarrer (« Réessayer » / « Quitter ») si l'un d'eux est inaccessible. Défaut en `prod` : `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts`. Aucun défaut en `recette`.
- Résolution : `src/main/adapters/config/` (`resolution.ts` pur, `lecture.ts` pour les fichiers), schéma et listes de clés dans `src/shared/schemas/config.ts`. Une clé ajoutée au `.env.example` doit l'être aussi dans ces listes, sinon elle est refusée comme « clé inconnue ».
- **Application installée, secrets** (`*_PASSWORD`, clé privée) : saisis une fois par l'administrateur après le déploiement (la clé `.ppk` est importée par un sélecteur de fichier), stockés chiffrés et utilisables par tous les utilisateurs du poste. Le mécanisme est choisi à l'implémentation. Jamais saisis par les utilisateurs, jamais affichés, jamais intégrés au paquet.
- **Cible à terme** : Azure Key Vault, au moment de la bascule Graph/SharePoint.

Les identifiants VEOS sont personnels et saisis à chaque lancement : ils ne figurent pas ici.

---

## Structure des dossiers

```
src/
  main/
    index.ts                    séquence de démarrage (profil dev, instance unique, configuration, fenêtre), handler de smoke-test app:ping
    ipc/{veos,iga,msp,ac056,journal,parametres}/          handlers IPC par module
    services/{veos,iga,msp,ac056,journal,parametres}/     services métier par module
    adapters/{stockage,ftp-iga,sftp-msp,veos,config}/     entrées-sorties techniques
  preload/
    index.ts                    contextBridge + export type Api
  renderer/
    index.html
    src/
      components/ui/            composants shadcn (installés à la demande) et stubs de la charte
      components/cadre-application.tsx   cadre de tous les écrans : bandeau Recette, en-tête, navigation, version
      hooks/                    état d'écran, appels asynchrones
      pages/                    écrans
      services/                 façade typée sur window.api, un fichier par module (veos.ts, iga.ts…)
      lib/utils.ts              helper cn (shadcn)
      styles/index.css          Tailwind + variables shadcn
      App.tsx
      main.tsx
      env.d.ts                  types Vite côté client (vite/client)
  shared/
    domain/ac056/               domaine pur AC056 (22 entités 000 à 999, lecteur, écrivain, structure et hiérarchie, contrôles, modification, rejets, ERRxxx)
    schemas/                    schémas zod (configuration, échanges IPC)
    test/                       helpers de test, jamais importés hors tests
      corpus.ts                 accès au corpus AC056 de référence (P:), écarts sans valeur
      comparaison-ac056.ts      comparaisons de parité par SHA-256 sur le corpus
      releve-lazarus.ts         lecture du relevé Lazarus NOM.erreurs.txt (PIEGES\)
      ac056-synthetique.ts      fabrique de fichiers AC056 fictifs, indépendante du lecteur
      controle-ac056.ts         aides des tests de contrôle (rattachements-, codes-anomalies-ac056.ts)
    types/
      index.ts                  types métier partagés (réexporte stockage.ts et journal.ts)
      stockage.ts               résultats et erreurs de l'adapter stockage qui traversent l'IPC
      journal.ts                sessions, lignes et état du journal
      window.d.ts               augmentation globale Window.api
e2e/
  specs/                        specs Playwright versionnés (smoke.spec.ts)
  fixtures/electron.ts          lancement hermétique de l'app buildée (racine du projet, répertoire courant, profil et dossier de travail temporaires)
  tsconfig.json
scripts/
  dev.mjs                       wrapper npm run dev (neutralise ELECTRON_RUN_AS_NODE)
  e2e.mjs                       wrapper npm run test:e2e (idem)
  test.mjs                      wrapper npm test et test:corpus (lance Vitest avec le lecteur en majuscule)
  claude-format.mjs             hook Claude Code : formate avec Prettier chaque fichier modifié
  icone.mjs                     node scripts/icone.mjs : build/icon.svg → build/icon.ico (16 à 256 px), rendu par l'Electron du projet
.vscode/                        formatage à l'enregistrement, extensions recommandées
resources/                      ressources embarquées dans le paquet
build/                          ressources de build electron-builder
  icon.svg                      source de l'icône (icon.ico en est généré, jamais retouché à la main)
  installer.nsh                 crée %ProgramData%\Flussi et ses droits (SYSTEM et Administrateurs : écriture, Utilisateurs : lecture)
deploiement/intune/             paquets Intune hors installeur (config-recette/config.json), validés par src/main/adapters/config/deploiement.test.ts
design/                         sources de design (handoff/ et patterns/, référence visuelle)
docs/                           roadmap, backlog, description, pre-mortem, déploiement Intune (deploiement-intune.md, guide-intune-win32.md)
  reference/lazarus/            sources Lazarus de référence (sans uconstantes.pas : mots de passe en clair)
  reference/iga/                cahier des charges IGA AC056 (archive, consultée sur un point bloquant)
```

---

## Commandes de développement

```bash
npm run dev           # Lancer en dev — electron-vite dev (encapsulé par scripts/dev.mjs)
npm test              # Tests unitaires — vitest run (encapsulé par scripts/test.mjs)
npm run test:corpus   # Tests de parité sur le corpus AC056 réel, obligatoires — vitest run --mode corpus (encapsulé par scripts/test.mjs)
npm run test:e2e      # Tests e2e Playwright — build puis playwright test (encapsulé par scripts/e2e.mjs)
npm run build         # Build production — electron-vite build
npm run package       # Installeur Windows NSIS pour Intune — electron-vite build && electron-builder --win nsis
npm run typecheck     # Vérification des types — tsc --noEmit
npm run lint          # Lint check — eslint .
npm run lint:fix      # Lint fix auto — eslint . --fix
npm run format        # Formatter — prettier --write .
npm run format:check  # Vérification du formatage, sans écriture — prettier --check .
```

- Les tests unitaires et de corpus se lancent par `npm test` et `npm run test:corpus`, jamais par `npx vitest` directement : le wrapper `scripts/test.mjs` corrige la casse de la lettre de lecteur (sinon toutes les suites échouent depuis une session Claude Code).
- Les tests e2e se lancent uniquement depuis la racine, via `npm run test:e2e`, jamais par `npx playwright test` directement. Le wrapper `scripts/e2e.mjs` rebuild l'application (les specs lancent `out/`, pas les sources) et neutralise `ELECTRON_RUN_AS_NODE`, posée par VS Code et Claude Code. Arguments transmis à Playwright : `npm run test:e2e -- <spec> --reporter=list`. La fixture `launchApp` lance la racine du projet (sinon `app.getVersion()` renvoie la version d'Electron) en recette, avec un répertoire courant temporaire qui porte son propre `.env` (écrit par la fixture), un dossier de travail et un profil temporaires (`FLUSSI_PROFIL_DEV`) : les e2e ne dépendent pas du `.env` du développeur et tournent même avec `npm run dev` ouvert (verrou d'instance distinct). Le titre de la fenêtre se lit par `app.evaluate` (`page.title()` lit la balise `<title>`).
- Les tests unitaires vivent à côté du code (`src/**/*.test.ts`). Vitest ignore le dossier `e2e/`.
- **Corpus AC056** : fichiers réels sur `P:` (`IN\`, `OUT\`, `PIEGES\`, `MODIFIES\`), données personnelles non anonymisées, jamais copiés dans le dépôt (ni fixture, ni snapshot). Chemin dans `AC056_CORPUS_DIR` (`.env`). Les tests corpus s'appellent `*.corpus.test.ts` et sont enveloppés dans `decrireCorpus` (`@shared/test/corpus`) : ignorés par `npm test` si le corpus est indisponible, obligatoires avec `npm run test:corpus`. Jamais de `toEqual` ni de snapshot sur un contenu du corpus (Vitest afficherait les valeurs) : comparer par SHA-256, et localiser un écart par `localiserEcart` et `decrireEcart` (fichier, ligne, octet, jamais la valeur). Convention de `PIEGES\` : `NOM.txt` (copie d'un fichier de `IN\` avec erreurs volontaires, lignes gardées à 700 octets) et `NOM.erreurs.txt` (journal Lazarus copié-collé tel quel après le chargement de `NOM.txt`, en RTF depuis WordPad ou en texte : seules les lignes `Dossier/Evènement … : Entité …` comptent). Jamais de rang non numérique sur un assuré `ASSPRI`, `CONJOI` ou `ENFANT` : Lazarus plante. Convention de `MODIFIES\` : `NOM.txt` (fichier enregistré par Lazarus après correction d'un champ) et `NOM.modification.txt` (`original=` nom dans `IN\`, `ligne=`, `champ=` nom Flussi exact, `valeur=` texte saisi tel quel). Un sous-dossier absent ou vide est ignoré par `npm test` et obligatoire avec `npm run test:corpus` (`decrireSousDossierCorpus`).
- ESLint et Prettier ignorent `.claude/`, `docs/` et `design/` (sources gérées par les skills).
- Fins de ligne LF partout (`.gitattributes` : `* text=auto eol=lf`), cohérentes avec Prettier. Exception : `docs/reference/**` est en `-text`, copies conformes à l'original à l'octet près, sauf la ligne 743 de `uac056.pas` (ligne de rejet réelle en commentaire, remplacée par un texte fictif). Jamais de donnée réelle dans ces copies.

---

## Conventions de code

- **Langue du code** : FR — commentaires, messages d'erreur internes et vocabulaire métier en français (sans accents dans les identifiants : `beneficiaire`, `evenement`, `rejet`). Les termes techniques imposés par l'écosystème restent en anglais (`services`, `adapters`, `hooks`, `handler`).
- **Langue de l'interface** : FR
- **Nommage** : camelCase pour les variables et fonctions, PascalCase pour les types et composants React, SCREAMING_SNAKE_CASE pour les constantes, kebab-case pour les fichiers hors composants, canaux IPC au format `module:action`. Pas de préfixes hongrois hérités de Lazarus (`s_`, `i_`, `b_`).
- **Style** : ESLint (flat config, typescript-eslint, react-hooks, react-refresh) + Prettier (`semi`, `singleQuote`, `trailingComma: all`, `printWidth: 100`), TypeScript strict
- **Principes** : KISS, DRY, YAGNI, SOLID, parité fonctionnelle avec Lazarus en v1.0 (toute divergence de comportement est explicite et validée)

---

## Modules / Entités

- `Veos` : lancement du workflow d'export vers MSP dans VEOS (saisie des identifiants personnels, pilotage de la page cachée, détection des échecs de connexion). S'appuie sur l'adapter `veos`.
- `Iga` : liste des fichiers AC056 sur le FTP IGA, avertissement si le fichier n'est pas du jour, téléchargement vers le dossier IN. S'appuie sur les adapters `ftp-iga` et `stockage`.
- `Msp` : dépôt de l'AC056 dans le dossier de dépôt avec listing de vérification, liste et téléchargement des fichiers de rejet vers le dossier OUT. S'appuie sur les adapters `sftp-msp` et `stockage`.
- `Ac056` : chargement d'un fichier, issu de VEOS (UTF-8) ou de rejet (ANSI). Navigation par évènement, bénéficiaire, garantie et entité, avec contrôle, marquage des erreurs, modification et enregistrement si le fichier ne contient plus d'erreur. Rejets rattachés : message par ligne et explication `ERRxxx`. S'appuie sur le domaine pur `shared/domain/ac056` (entités 000 à 999, lecteur, écrivain, structure et hiérarchie, règles de contrôle, modification de champ).
- `Journal` : écriture du journal de session dans le stockage partagé (un fichier par session, `Journal\AAAA\MM\AAAAMMJJ-HHMMSS-{compte Windows}.txt`, sans index commun), consultation de l'historique. Fichier créé au démarrage (test d'écriture du dossier, « Réessayer » / « Quitter »), écrit au fil de l'eau en ajout seul : UTF-8 sans BOM, CRLF, une ligne par évènement `HH:MM:SS<TAB>NIVEAU<TAB>message` (`TITRE`, `INFO`, `SUCCES`, `ERREUR`), en-tête (début, compte, poste, mode, version) et ligne « Fin de session » écrite à la fermeture de la fenêtre. Échec d'écriture : lignes gardées en mémoire, bandeau « Journal non enregistré », jamais de perte silencieuse. Jamais de secret, d'identifiant VEOS ni de valeur AC056 dans le journal. Historique : seuls les noms au format Flussi sont lus (journaux Lazarus ignorés), contenu lu à la sélection. Canaux `journal:annees`, `journal:sessions`, `journal:lire`, `journal:etat` et `journal:etat-change` (main vers écran). Trace chaque dépôt MSP avec l'empreinte SHA-256 du fichier déposé (v0.5.0).
- `Parametres` : mode actif et dossiers de travail, issus de la configuration (canal `config:lire`, aucune surcharge locale : `%ProgramData%\Flussi\config.json` fait seul référence), saisie des secrets par l'administrateur. S'appuie sur l'adapter `config`.

---

## Design

- **État** : produit. Tokens matérialisés via `/design-system-adapt`, références dans `DESIGN.md`, `design/handoff/` et `design/patterns/`.
- **Charte** : mode clair uniquement, ton sobre et corporate. Bleu clair de la marque (C100 M30 J0 N5, `blue-500` `#0077BD`) pour les actions, bleu foncé (C100 M80 J0 N45, `navy-700` `#13295B`) pour l'identité. Violet réservé à l'environnement Recette. Polices IBM Plex Sans et IBM Plex Mono (paquets `@fontsource`, importés dans `index.css`).
- **Plan restant** : au cas par cas, écrans sur-mesure `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les items marqués `Pattern: custom` dans `version-{X}.md`.

**Sources de référence** :

- `DESIGN.md` : source de vérité des tokens (couleurs, typographie, espacements, ombres, mouvement) et des règles d'usage (marquage des erreurs, bandeau Recette, badges, boutons). Ne pas le modifier depuis l'adaptation.
- `design/handoff/` : composants atomiques au format `.tsx` avec classes `.fl-*`. Référence visuelle uniquement, jamais importés par l'application.
- `design/patterns/` : patterns d'écran `list`, `form` et `list+form` au format `.tsx` self-contained (composition complète previewable, instanciée par `feature-agent`). `list+form` en priorité pour l'écran AC056.

**Composants de l'application** (`src/renderer/src/components/ui/`) :

- Installés par la CLI shadcn : `button`, `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `card`, `dialog`, `alert-dialog`, `alert`, `badge`, `tooltip`, `skeleton`.
- Stubs maison de la charte : `field` (render prop câblant id, aide et erreur vers le contrôle), `select` (`<select>` natif), `spinner`, `operation-progress`, `status-badge` (`StatusBadge`, `EnvironmentBadge`, `CountBadge`), `environment-banner`, `data-list`, `confirm-dialog`.
- Les composants shadcn gardent leurs valeurs par défaut (par exemple hauteur de bouton `h-9` au lieu de `h-control-md`, pas de style d'erreur sur `aria-invalid`). Écart accepté et validé. Ne pas les corriger sans demande.
- `src/renderer/src/lib/utils.ts` : `cn` s'appuie sur `extendTailwindMerge`. Tout nouveau token Tailwind de tailles de police, d'ombres, de hauteurs, de largeurs, de z-index, de durées ou de courbes doit y être déclaré, sinon `tailwind-merge` supprime la classe sans prévenir.

---

## Autonomie et permissions de Claude Code

Les règles sont dans `.claude/settings.json` (versionné), en double `Bash(...)` et `PowerShell(...)` : les règles d'un outil ne s'appliquent pas à l'autre. Les agents héritent des règles `allow` et `deny`.

- **Sans demande** : modifications de fichiers du projet (mode `acceptEdits`), scripts de qualité (`npm test`, `npm run test:e2e`, `build`, `typecheck`, `lint`, `format`, `format:check`), git local (`status`, `diff`, `log`, `add`, `commit`, création de branche), lecture GitHub, listage de fichiers.
- **Avec demande** : `npm install`, `npm run dev`, `npm run package`, `git push`, toute suppression, toute commande mentionnant `.ssh`, et tout ce qui n'est pas listé.
- **Refusé** : lecture ou modification de `.env` (outil ou shell), lecture de ses variantes locales (`.env.local`, `.env.*.local`, `.env.test`, `.env.corpus`) et du corpus `CORPUS-DEV` (outil ou shell), `npm publish`, `npx playwright test` en direct, `git push --force`, `gh repo delete` et `gh repo edit`.
- **Habitudes** : une commande simple par appel (pas de script PowerShell sur une ligne avec variables ou boucles), les outils Read, Grep et Glob plutôt que le shell pour lire des fichiers, les scripts npm plutôt que les outils appelés directement. Ne jamais citer `.env` (ni `.env.example`) ni `CORPUS-DEV` dans une commande shell, même dans un message de commit.
- **Formatage automatique** : le hook `scripts/claude-format.mjs` formate avec Prettier chaque fichier modifié par Edit ou Write. Après une modification, relire le fichier avant d'en modifier la même zone.

---

## Mises à jour de sécurité (Dependabot)

- **Cadre** (`.github/dependabot.yml`) : pas de mises à jour de version (`open-pull-requests-limit: 0`), mises à jour de sécurité npm regroupées en une seule PR, règles `ignore` par plage de versions qui reprennent les contraintes de versions de « Stack technique ». Electron n'est jamais ignoré.
- **Procédure « traite les PR Dependabot »** : l'utilisateur ne juge pas lui-même les PR, Claude fait tout le travail.
  1. Lister les PR Dependabot ouvertes (`gh pr list --author app/dependabot`) et les alertes ouvertes (`gh api "repos/mpdev42/flussi/dependabot/alerts?state=open"`).
  2. Pour chaque PR, comparer les montées (`gh pr diff`) aux contraintes de versions. Une montée contraire, malgré les règles `ignore`, entraîne la fermeture.
  3. Récupérer la branche (`gh pr checkout`), réinstaller les paquets (`npm ci`), puis lancer `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:corpus` (signaler si `P:` est indisponible), `npm run test:e2e` et `npm run build`.
  4. Proposer en une phrase simple, sans jargon, « fusionner » ou « fermer », avec la raison. Rien n'est fusionné ni fermé sans l'accord de l'utilisateur.
  5. Fusionner (`gh pr merge --squash --delete-branch`, qui supprime les branches locale et distante et repasse sur `main`) ou fermer (`gh pr close`, avec un commentaire qui explique pourquoi), puis revenir sur `main` si besoin et le mettre à jour (`git pull`, `npm ci`).
- **Alertes sans PR** : sans correctif publié, l'alerte reste ouverte (Dependabot ouvrira la PR à la sortie du correctif). Si le correctif est incompatible avec les contraintes de versions : alerte classée « risque toléré » (`tolerable_risk`), avec un commentaire, quand la dépendance ne sert qu'au build (absente de `out/**`, donc de l'installeur) ; sinon, la signaler à l'utilisateur.

---

## Workflow obligatoire

Pour toute tâche de développement (fonctionnalité, bug, refonte) :

1. **Plan d'abord** — propose un plan d'implémentation détaillé.
2. **Attendre validation** — ne pas commencer à coder avant un `ok`, `go` ou `validé` explicite.
3. **Développement** — orchestrer les agents de `.claude/agents/` pour l'implémentation. Lancer en parallèle les agents indépendants.

Faire les Edit/Write sur les fichiers sources via les agents, pas depuis la session principale.
