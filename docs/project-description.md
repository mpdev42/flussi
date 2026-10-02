# Project: Flussi

Logiciel d'échange de fichiers entre notre logiciel de gestion métier VEOS et notre partenaire MSP

---

## Cadrage initial

## Cadrage — 2026-10-01

- **Utilisateurs réels** : Le service administratif.
- **Problème à résoudre** : Porter vers Electron l'application Lazarus qui génère un fichier et l'envoie à un partenaire. Le portage seul n'apporte rien à l'utilisateur. On en profite pour définir avec lui les améliorations à apporter.
- **Version minimale (v0.1)** : Portage complet des fonctions existantes : récupération du fichier auprès de VEOS, chargement et contrôle avant envoi, envoi chez MSP, récupération et contrôle des fichiers de rejet mis à disposition par MSP, lecture des logs, chargement d'un fichier pour contrôle.
- **Hors scope** : Aucune exclusion : toutes les fonctions sont construites dans la première version.
- **Critère de succès à 3 mois** : L'application est en production, validée par le service administratif, et Lazarus est arrêtée (voir Notes).
- **Outil existant** : L'application Lazarus actuelle couvre le besoin. Elle sera abandonnée au profit d'Electron, désormais utilisé pour développer les applications.

---

## Type

`electron`

## Déploiement

`desktop` — Windows uniquement, processus unique (main + preload + renderer).

- **Distribution** : Intune. electron-builder produit un installeur NSIS par machine (installation silencieuse), emballé en `.intunewin` comme application Win32.
- **Mises à jour** : poussées par Intune. Pas de mise à jour automatique dans l'application (pas d'`electron-updater`).
- **Stockage de production** : lecteur `P:` (bibliothèque SharePoint) en v1.0, accessible uniquement par des chemins configurables derrière l'adapter `stockage`. Le lecteur `P:` doit disparaître à terme : la bascule vers SharePoint par Microsoft Graph se fera après la v1.0, sans impact sur le code métier.
- **Journal** : partagé entre tous les utilisateurs, dans le stockage de production. Un seul utilisateur à la fois : pas d'écriture concurrente à gérer. Chaque dépôt chez MSP y est tracé avec l'empreinte SHA-256 du fichier déposé.

---

## Stack

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

```env
# Environnement
FLUSSI_ENV=

# Stockage (dossiers de travail — P: en v1.0)
STOCKAGE_DOSSIER_TRAVAIL=
STOCKAGE_DOSSIER_IN=
STOCKAGE_DOSSIER_OUT=
STOCKAGE_DOSSIER_JOURNAL=

# VEOS (IGA)
VEOS_URL=
VEOS_WORKFLOW_EXPORT_ID=

# IGA — FTP
IGA_FTP_HOST=
IGA_FTP_USER=
IGA_FTP_PASSWORD=
IGA_FTP_DOSSIER=

# MSP — SFTP
MSP_SFTP_HOST=
MSP_SFTP_PORT=
MSP_SFTP_USER=
MSP_SFTP_PASSWORD=
MSP_SFTP_CLE_PRIVEE_CHEMIN=
MSP_SFTP_DOSSIER_DEPOT=
MSP_SFTP_DOSSIER_RETRAIT=
```

> **Sources selon le contexte (mêmes noms partout)** :
> - **Dev** : `.env` (ignoré par git).
> - **Application installée, paramètres non secrets** : valeurs par défaut du mode dans le code, surchargées par `%ProgramData%\Flussi\config.json` (déployé par Intune, en lecture seule pour les utilisateurs), puis par les surcharges de l'écran Paramètres, enregistrées dans le profil de l'utilisateur (`%APPDATA%\Flussi\`).
> - **Application installée, secrets** (`*_PASSWORD`, clé privée) : `safeStorage` d'Electron (DPAPI, propre à chaque utilisateur), saisis une fois dans l'écran Paramètres. Jamais intégrés au paquet.
> - **Cible à terme** : Azure Key Vault, au moment de la bascule Graph/SharePoint.
>
> Les identifiants VEOS sont personnels et saisis à chaque lancement : ils ne figurent pas ici.

---

## Dev Commands

```bash
npm run dev           # Lancer en dev — electron-vite dev (encapsulé par scripts/dev.mjs)
npm test              # Tests unitaires — vitest run
npm run test:e2e      # Tests e2e Playwright — build puis playwright test (encapsulé par scripts/e2e.mjs)
npm run build         # Build production — electron-vite build
npm run package       # Installeur Windows NSIS pour Intune — electron-vite build && electron-builder --win nsis
npm run typecheck     # Vérification des types — tsc --noEmit
npm run lint          # Lint check — eslint .
npm run lint:fix      # Lint fix auto — eslint . --fix
npm run format        # Formatter — prettier --write .
npm run format:check  # Vérification du formatage, sans écriture — prettier --check .
```

---

## Code Conventions

- **Langue du code** : FR — commentaires, messages d'erreur internes et vocabulaire métier en français (sans accents dans les identifiants : `beneficiaire`, `evenement`, `rejet`). Les termes techniques imposés par l'écosystème restent en anglais (`services`, `adapters`, `hooks`, `handler`).
- **Langue de l'interface** : FR
- **Nommage** : camelCase pour les variables et fonctions, PascalCase pour les types et composants React, SCREAMING_SNAKE_CASE pour les constantes, kebab-case pour les fichiers hors composants, canaux IPC au format `module:action`. Pas de préfixes hongrois hérités de Lazarus (`s_`, `i_`, `b_`).
- **Style** : ESLint (flat config, typescript-eslint, react-hooks, react-refresh) + Prettier (`semi`, `singleQuote`, `trailingComma: all`, `printWidth: 100`), TypeScript strict
- **Principes** : KISS, DRY, YAGNI, SOLID, parité fonctionnelle avec Lazarus en v1.0 (toute divergence de comportement est explicite et validée)

---

## Modules / Domaine

Liste des modules ou entités principales du projet :

- `Veos` : lancement du workflow d'export vers MSP dans VEOS (saisie des identifiants personnels, pilotage de la page cachée, détection des échecs de connexion).
- `Iga` : liste des fichiers AC056 sur le FTP IGA, avertissement si le fichier n'est pas du jour, téléchargement vers le dossier IN.
- `Msp` : dépôt de l'AC056 dans le dossier de dépôt avec listing de vérification, liste et téléchargement des fichiers de rejet vers le dossier OUT.
- `Ac056` : chargement d'un fichier, issu de VEOS (UTF-8) ou de rejet (ANSI). Navigation par évènement, bénéficiaire, garantie et entité, avec contrôle, marquage des erreurs, modification et enregistrement si le fichier ne contient plus d'erreur. Rejets rattachés : message par ligne et explication `ERRxxx`. S'appuie sur le domaine pur `shared/domain/ac056` (entités 000 à 800, lecteur, écrivain, règles de contrôle).
- `Journal` : écriture du journal de session dans le stockage partagé (une entrée d'index par session, avec date et utilisateur Windows), consultation de l'historique.
- `Parametres` : mode actif, dossiers de travail (surcharge de `config.json`, enregistrée dans `%APPDATA%\Flussi\` : `%ProgramData%\Flussi\config.json` reste en lecture seule), saisie et mise à jour des secrets dans `safeStorage`.

---

## Design

### Cas 2 — Design produit

- **État** : produit. Tokens matérialisés via `/design-system-adapt`, références dans `DESIGN.md`, `design/handoff/` et `design/patterns/`.
- **Charte** : mode clair uniquement, ton sobre et corporate. Bleu clair de la marque (C100 M30 J0 N5) pour les actions, bleu foncé (C100 M80 J0 N45) pour l'identité, violet réservé à l'environnement Recette. Polices IBM Plex Sans et IBM Plex Mono.
- **Plan restant** : au cas par cas, `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les écrans sur-mesure qui sortent des patterns standards.

---

## Agents à inclure

- [x] `test` — tests unitaires et d'intégration. Indispensable pour la parité AC056 (lecteur, écrivain, contrôles, encodages).
- [ ] `migration` — non pertinent : pas de base de données dans la Stack.
- [x] `audit` — audit de cohérence transversale entre couches (renderer, preload, IPC, services, adapters, domaine partagé).
- [x] `component` — composants UI génériques partagés (fiche de champs d'entité, grille, marquage d'erreur, drapeau sur l'onglet) au-dessus de shadcn/ui.
- [x] `feature` — implémentation d'une feature de bout en bout, pour chacun des six modules.

---

## Agents additionnels

- `ac056-agent` : spécialiste du format AC056 et de la parité avec Lazarus. Ses références : le cahier des charges IGA (`Interface - AC056 - APIVIA - Cahier des charges IGA - 1.27.docx`) et le code Lazarus (`uac056.pas`, `utypes.pas`, `ucontrole.pas`, `urejetsdescription.pas`). Il porte ou vérifie les entités en largeur fixe (positions, longueurs, valeurs autorisées), les règles de contrôle et les codes de rejet dans `shared/domain/ac056`, avec leurs tests de non-régression.

---

## Notes

- **Usage** : un seul utilisateur à la fois, deux lancements par jour (matin et soir), toujours par le service administratif.
- **Arrêt de Lazarus** : Lazarus est stockée sur `P:` et n'est installée sur aucun poste. Après validation de Flussi par les utilisateurs, son dossier est renommé (`flussi_old`) et conservé quelques semaines comme solution de repli, puis supprimé.
- **Date de bascule** : hors de la période du 15 décembre au 31 janvier (pic des renouvellements et des mouvements au 1er janvier). Soit avant le 15 décembre, soit à partir de février.
- **Contrôle de conformité AC056** : conditions de la bascule.
  - Tout fichier AC056 écrit par Flussi est rechargé dans Lazarus avec sa fonction de chargement, et doit passer ses contrôles sans erreur.
  - Un fichier VEOS chargé puis enregistré sans modification par Flussi doit être identique à l'original, octet par octet.
