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

- **Conformité AC056** : tout fichier AC056 écrit par Flussi est rechargé dans Lazarus avec sa fonction de chargement et doit passer ses contrôles sans erreur. Un fichier VEOS chargé puis enregistré sans modification par Flussi doit être identique à l'original, octet par octet, à deux exceptions près, validées (v0.3.0, item 3) : les lignes vides et les 0x1A finaux sont supprimés. Un fichier corrigé ne change qu'aux octets des champs corrigés (écrits comme `AddCharR` de Lazarus) ; tout le reste est recopié depuis l'original.
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

**Modules natifs** (épinglés en version exacte, jamais une version de moins de deux semaines) :

- `@primno/dpapi` 2.0.1 (DPAPI, secrets techniques), importé seulement par `src/main/adapters/config/dpapi.ts`. À chaque montée, contrôler le contenu installé (binaires `prebuilds/win32-{x64,arm64}/`, aucun dossier `build/`) et l'intégrité dans `package-lock.json` (des paquets malveillants à nom proche existent).
- `koffi` 3.3.2 (appels à l'API Windows `ShellExecuteExW` pour l'élévation), binaire précompilé dans `@koromix/koffi-win32-x64` (seule plateforme installée), importé seulement par `src/main/adapters/config/api-windows.ts`, à l'appel. Même contrôle à chaque montée.
- Règle ESLint `no-restricted-imports` : ni l'un ni l'autre dans le renderer, le preload ou le domaine AC056 (liste `MODULES_NATIFS_MAIN` de `eslint.config.js`).
- Garde-fou de pureté du domaine (`src/shared/domain/**`, hors `*.test.ts`) : aucun module Node (`builtinModules` et `node:*`), ni `electron`, `vitest`, `@shared/test/*`, ni import dynamique, ni globales `Buffer` et `process`.
- `npmRebuild: false` dans `electron-builder.yml` : `@electron/rebuild` ne reconnaît pas les binaires précompilés de `@primno/dpapi` et lancerait une compilation `node-gyp`. À revoir avant toute nouvelle dépendance native (`ssh2` en v0.5.0).

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
- **Adapter `stockage`** : les services ne manipulent que des emplacements logiques (`in`, `out`, `journal`), jamais des chemins Windows. En v1.0, l'implémentation pointe vers des dossiers configurables (`P:`). Une implémentation Graph/SharePoint la remplacera plus tard. `lister(emplacement, sousDossier?, { avecInfos })` : taille et date seulement avec l'option (un `stat` par fichier sur `P:`), utilisée par le seul module Ac056. `ecrire(emplacement, chemin, octets, 'remplacer' | 'creer')` : temporaire `NOM.{uuid}.tmp` dans le dossier cible, `sync`, relecture, puis renommage (seuls le renommage et la suppression du temporaire sont rejoués sur EBUSY/EPERM) ; `creer` répond `deja-present` sans rien écrire si la cible existe. `ajouter` reste l'ajout seul du journal.
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
- **Dossiers de travail** : `STOCKAGE_DOSSIER_TRAVAIL` seul, chemin absolu Windows. `IN`, `OUT` et `Journal` en sont toujours dérivés (`{TRAVAIL}\IN`…, noms fixes, disposition de Lazarus) et doivent exister : Flussi ne les crée jamais (seuls les sous-dossiers `Journal\AAAA\MM` et `Originaux`, copies des fichiers AC056 avant leur premier enregistrement), et refuse de démarrer (« Réessayer » / « Quitter ») si l'un d'eux est inaccessible. Défaut en `prod` : `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts`. Aucun défaut en `recette`.
- Résolution : `src/main/adapters/config/` (`resolution.ts` pur, `lecture.ts` pour les fichiers), schéma et listes de clés dans `src/shared/schemas/config.ts`. Une clé ajoutée au `.env.example` doit l'être aussi dans ces listes, sinon elle est refusée comme « clé inconnue ».
- **Application installée, secrets** (mots de passe FTP IGA et SFTP MSP, contenu de la clé privée MSP) : saisis une fois par poste dans Paramètres, Flussi lancé normalement (jamais « en tant qu'administrateur » : le compte administrateur ne voit pas `P:`, un `subst` de la session de l'utilisateur), procédure dans `docs/deploiement-intune.md` § 7. Chiffrés par DPAPI au niveau de la machine (`@primno/dpapi`, portée `LocalMachine`, entropie applicative fixe à ne jamais changer) dans `%ProgramData%\Flussi\secrets.bin` (JSON `{ format: 1, secrets }` chiffré) : utilisables par tous les comptes du poste, illisibles sur un autre poste. Écriture : Flussi chiffre lui-même le fichier en mémoire, puis se relance élevé par `ShellExecuteExW` « runas » (`koffi`, `src/main/adapters/config/api-windows.ts`, `elevation.ts`), une seule invite UAC. Le Flussi élevé (`--flussi-ecrire-secrets=<canal>`, mode écriture traité tout en haut de `src/main/index.ts` : ni fenêtre, ni configuration, ni verrou, ni journal) reçoit le blob par un canal nommé, vérifie qu'il se déchiffre, l'écrit dans `%ProgramData%\Flussi` (temporaire puis renommage, droits hérités) et sort avec un code (`ecriture-secrets.ts`). Flussi relit ensuite le fichier pour vérifier. Les droits du dossier ne changent pas : l'invite UAC est l'authentification de l'administrateur. **Jamais de PowerShell ni de `cmd.exe` pour cela** : la première version (PowerShell `Start-Process -Verb RunAs` + `cmd /c copy … move … del`) a déclenché une alerte HIGH de l'EDR du poste. Jamais saisis par les utilisateurs, jamais relus ni affichés (l'écran ne reçoit que « Renseigné le … » ou « Non renseigné »), jamais intégrés au paquet. Clé acceptée : PPK version 2 RSA ou DSA, OpenSSH ou PEM, sans phrase secrète (`ssh2` ne lit ni les PPK ed25519 ni le PKCS#8) ; le reste est refusé avec la marche à suivre PuTTYgen. En dev : `secrets.bin` n'est jamais lu ni écrit, seule la présence des secrets du `.env` sort de la résolution (`secretsEnv`, booléens), section en lecture seule.
- **Cible à terme** : Azure Key Vault, au moment de la bascule Graph/SharePoint.

Les identifiants VEOS sont personnels et saisis à chaque lancement : ils ne figurent pas ici.

---

## Structure des dossiers

```
src/
  main/
    index.ts                    séquence de démarrage (profil dev, instance unique, configuration, fenêtre, menu retiré si installé), handler de smoke-test app:ping
    fermeture.ts                séquence de fermeture de la fenêtre (attente de l'enregistrement, confirmation « Abandonner les modifications ? », fin de session), dépendances injectées
    ipc/{veos,iga,msp,ac056,journal,parametres}/          handlers IPC par module
    services/{veos,iga,msp,ac056,journal,parametres}/     services métier par module
    adapters/{stockage,ftp-iga,sftp-msp,veos,config}/     entrées-sorties techniques
  preload/
    index.ts                    contextBridge + export type Api
  renderer/
    index.html
    src/
      components/ui/            composants shadcn (installés à la demande) et stubs de la charte
      components/cadre-application.tsx   cadre de tous les écrans : bandeau Recette, en-tête, navigation, version, colonne du journal à droite, focus sur le h1 au changement d'écran
      components/journal-session.tsx     panneau « Journal de la session » (lignes en direct), dans la colonne du cadre sur tous les écrans ; `JournalSessionEnDirect` s'abonne lui-même (une ligne du journal ne re-rend pas `App`)
      components/verrou-navigation.ts    useVerrouNavigation(actif) : désactive la navigation pendant une opération à ne pas quitter
      hooks/                    état d'écran, appels asynchrones
      pages/                    écrans
        accueil.tsx             écran d'accueil (fonctions disponibles et à venir)
        ac056/                  écran « Fichier AC056 » : choix du fichier IN/OUT, barre de fichier, alertes (monté à la première visite, puis gardé monté sous `hidden` dans un conteneur `h-full`, jamais de classe d'affichage) ; navigation (`fichier-ouvert`, `colonne-evenements`, `colonne-detail`, `liste-elements`, `fiche-entite`, `champ-ac056`), réducteur `navigation-ac056`, `organisation-ecran` (onglets de Lazarus), `presentation-champ`, `resumes-ac056`, `sortie-champ` (saisie appliquée au relâchement du pointeur, écouteurs installés une fois, rien appliqué quand la fenêtre perd le focus pendant la frappe) ; enregistrement (`barre-fichier`, `alertes-fichier`, `bouton-changer-fichier` partagé avec la barrière d'erreur `barriere-fichier`)
        journal/                historique des sessions, détail d'une session, bandeau « Journal non enregistré »
        parametres/             vue des paramètres, section Secrets techniques
      services/                 façade typée sur window.api, un fichier par module (veos.ts, iga.ts…)
      lib/utils.ts              helper cn (shadcn)
      lib/dates.ts              formaterDate (AAAA-MM-JJ → JJ/MM/AAAA)
      lib/pluralize.ts          pluriel français d'un libellé (0 et 1 au singulier)
      lib/niveaux-journal.ts    libellés et présentation des niveaux du journal (écran Journal et panneau)
      test/dom.ts               aides des tests jsdom (montage, saisie, clic, sortie de champ `quitter`, pointeur `appuyerPointeur`/`relacherPointeur`/`annulerPointeur`, fenêtre active `fenetreActive` : `monter` force `document.hasFocus()` à vrai), jamais importées hors tests
      test/ac056.ts             fabriques de données de l'écran AC056 pour les tests (dont des analyses réelles de fichiers synthétiques)
      styles/index.css          Tailwind + variables shadcn, `--panel-nav-width`, utilitaire `scrollbar-fin`
      App.tsx
      main.tsx
      env.d.ts                  types Vite côté client (vite/client)
  shared/
    domain/ac056/               domaine pur AC056 (22 entités 000 à 999, lecteur, écrivain, structure et hiérarchie, contrôles, modification, rejets, ERRxxx, provenance d'après le nom, analyse complète `analyserAc056` et `bilanAnalyse` ; libellés et fiches de l'écran Lazarus `entites/fiches.ts`, tables gelées en profondeur ; rattachement des lignes `index-lignes`, compteurs `compteurs`, correction en mémoire `saisie`, affichage des valeurs `affichage` ; enregistrement `enregistrement` : `correctionsAc056`, `preparerEnregistrement`)
    schemas/                    schémas zod (configuration, échanges IPC)
    test/                       helpers de test, jamais importés hors tests
      corpus.ts                 accès au corpus AC056 de référence (P:), écarts sans valeur
      comparaison-ac056.ts      comparaisons de parité par SHA-256 sur le corpus (`sansCtrlZFinal`, `sansLignesVides`)
      modifies-ac056.ts         lecture des notes de `MODIFIES\` ; `CAS_REFUS_RANG_INCOMPLET` (cas attendu en refus, D1 de la v0.3.0)
      releve-lazarus.ts         lecture du relevé Lazarus NOM.erreurs.txt (PIEGES\)
      ac056-synthetique.ts      fabrique de fichiers AC056 fictifs, indépendante du lecteur
      controle-ac056.ts         aides des tests de contrôle (rattachements-, codes-anomalies-ac056.ts)
      source-lazarus.ts         lecture des sources Lazarus de référence et analyseur de `fmain.lfm` (`lireLfm`), pour les tests `*.lazarus.test.ts`
    types/
      index.ts                  types métier partagés (réexporte stockage.ts, journal.ts, parametres.ts et ac056.ts)
      ac056.ts                  fichiers listés, résultat d'ouverture, erreur sans chemin du module Ac056
      stockage.ts               résultats et erreurs de l'adapter stockage qui traversent l'IPC
      journal.ts                sessions, lignes et état du journal
      parametres.ts             origines de la configuration, dossiers de travail, résultat d'ouverture
      window.d.ts               augmentation globale Window.api
e2e/
  specs/                        specs Playwright versionnés (smoke, demarrage, journal, parametres, secrets, ac056, ac056-enregistrement)
  aides/ac056.ts                aides partagées des specs AC056 (dépôt de fichiers, ouverture, saisie, journal de session)
  fixtures/electron.ts          lancement hermétique de l'app buildée (racine du projet, répertoire courant, profil et dossier de travail temporaires ; `preparerTravail` dépose des fichiers avant le lancement ; `fermer()` répond « Quitter sans enregistrer » à la seule boîte « Abandonner les modifications ? »)
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
  installer.nsh                 crée %ProgramData%\Flussi et ses droits (SYSTEM et Administrateurs : écriture, Utilisateurs : lecture ; /reset /T, clé de désinstallation supprimée en cas d'échec)
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
- Tests de hooks et de formulaires : environnement jsdom par le commentaire `// @vitest-environment jsdom` en tête de fichier, aides `src/renderer/src/test/dom.ts` (`react-dom/client` et `act`, sans `@testing-library`). DPAPI réel testé sous Windows seulement (`describe.runIf`). La fixture e2e accepte des lignes `.env` en plus (`launchApp({ lignesEnv })`). Tests corpus : délai de 120 s en mode corpus (`vitest.config.ts`), nombre minimal de fichiers par sous-dossier (`MINIMUM_FICHIERS_CORPUS`, `@shared/test/corpus` ; `MODIFIES` abaissé à 2 tant qu'un seul cas ordinaire s'ajoute au cas attendu en refus).
- **Jamais d'élévation réelle en test** (incident du 2026-10-16 : une dizaine de vraies invites UAC ouvertes par des tests) : tout effet visible du poste (invite UAC, fenêtre système) est une dépendance obligatoire, sans valeur par défaut, branchée seulement dans `src/main/index.ts`. L'API Windows réelle (`creerApiElevationWindows`, `src/main/adapters/config/api-windows.ts`) refuse de lancer quoi que ce soit sous Vitest. La vraie invite ne se vérifie qu'à la main, sur l'application installée.
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
- `Ac056` : chargement d'un fichier, issu de VEOS (UTF-8) ou de rejet (ANSI). Navigation par évènement, bénéficiaire, garantie et entité, avec contrôle, marquage des erreurs, modification et enregistrement, même s'il reste des erreurs (le dépôt MSP les refusera, v0.5.0). Rejets rattachés : message par ligne et explication `ERRxxx`. S'appuie sur le domaine pur `shared/domain/ac056` (entités 000 à 999, lecteur, écrivain, structure et hiérarchie, règles de contrôle, modification de champ). Depuis v0.3.0 (item 1) : écran « Fichier AC056 », liste intégrée des fichiers `.txt` de `IN` et `OUT` (pas de boîte « Ouvrir »), rejet reconnu au préfixe `AC056COUR_REJ_` (`provenanceDepuisNom`), lecture et contrôle dans le main (`analyserAc056`), aucune écriture au chargement. Canaux `ac056:lister` (sans entrée) et `ac056:ouvrir` (`{ emplacement: 'in' | 'out', nom }`, validé par zod, même règle de nom que la liste) ; erreurs `{ code, message }` sans chemin. Journal (non attendu par le service) : `Charger`, `Fichier NOM chargé : …`, `… mal formé : relancez l'export VEOS`, `… illisible : fichier vide`, `… non chargé : {cause}`. Un 0x1A final est retiré à la lecture (anomalie non bloquante `ctrl-z-final`, parité `CtrlZMarksEOF` de FPC). Depuis v0.3.0 (item 2) : navigation sur deux colonnes (évènements à gauche, avec la sous-liste des bénéficiaires ; au centre, onglets dans l'organisation de Lazarus : évènement = Bénéficiaires, 100, 110, 115, 120, Coordonnées, 130, 135, 155, 180 ; bénéficiaire = Garanties, 400, 405, 410, 411, Critères, Variables souscription, 800 ; pas d'onglet 001 ; entité absente = onglet désactivé), sélection par position, première fiche en erreur ouverte au clic sur un évènement en erreur. Compteur d'erreurs à chaque niveau (`compterAnomalies`), alerte de fichier toujours présente. Champs en lecture seule (listes « CODE - Libellé », dates JJ/MM/AAAA), sauf les champs modifiables en erreur ou déjà corrigés : correction en mémoire à la sortie du champ (`saisirChamp`, parité `Modified` : seulement après une frappe ; appliquée au relâchement du pointeur à la souris), recontrôle de la ligne, aucune écriture sur `P:` ni trace au journal avant l'enregistrement (item 3). Texte sous le champ = `consigne` de l'anomalie ; erreurs non corrigeables (485/490, fichier mal formé) suivies de « À corriger dans VEOS. ». Confirmation « Abandonner les modifications ? » au changement de fichier. Depuis v0.3.0 (item 3) : bouton « Enregistrer » (fichier VEOS seulement, désactivé avec « Fichier mal formé » pour une anomalie de structure, jamais `disabled` sinon : `aria-busy` pendant l'opération, contenu `inert`, navigation verrouillée), badge « Modifié ». L'écran envoie les champs corrigés (`correctionsAc056`, dérivés de `champsModifies`) avec l'empreinte SHA-256 reçue à l'ouverture ; le main relit l'original, vérifie l'empreinte (`fichier-modifie` sinon), rejoue les corrections (`preparerEnregistrement`, pur), copie l'original dans `{emplacement}\Originaux\NOM.txt` au premier enregistrement (jamais écrasée), remplace le fichier (`Stockage.ecrire`) et renvoie l'analyse du fichier écrit, que l'écran adopte (`champsModifies` reportés : un champ corrigé reste modifiable jusqu'au changement de fichier). Fichier identique : rien n'est écrit (« déjà à jour »). Retours affichés dans l'alerte du fichier (« Fichier enregistré », « … avec N erreurs : il ne pourra pas être déposé chez MSP… », « déjà à jour ») ; échec et « Réessayer » dans une alerte séparée, gardée jusqu'au prochain enregistrement ; `interrompu` si la réponse IPC est perdue. Garde-fous du domaine : `saisirChamp` refuse `fichier-mal-forme` et `champ-verrouille` (règle `peutCorriger`) ; rangs en chiffres seuls occupant tout le champ (« Saisissez 2 chiffres, par exemple 05. », divergence : Lazarus écrit « 50 » pour « 5 ») ; saisie rognée (`Trim`) pour les champs trimés à la lecture ; seuls les octets des champs corrigés changent (divergence : Lazarus régénère chaque ligne). Canaux `ac056:enregistrer` (`{ emplacement, nom, empreinte, corrections }`, zod, émetteur contrôlé) et `ac056:modifications` (écran vers main, fichier modifié ou `null`, pour la fermeture). Journal : `Enregistrer`, `Original de NOM copié dans IN\Originaux`, `Fichier NOM : N lignes vides supprimées`, `Fichier NOM enregistré : N champs modifiés[, M erreurs restantes]`, `Fichier NOM déjà à jour : rien à enregistrer`, `Fichier NOM non enregistré : {cause}`. Fermeture de la fenêtre (`src/main/fermeture.ts`) : attente de l'enregistrement en cours, boîte native « Abandonner les modifications ? » (« Annuler », « Quitter sans enregistrer ») si un fichier est modifié, puis « Fin de session » ; menu d'Electron retiré dans l'application installée (`app.isPackaged` : Ctrl+R, Ctrl+W et outils de développement inactifs).
- `Journal` : écriture du journal de session dans le stockage partagé (un fichier par session, `Journal\AAAA\MM\AAAAMMJJ-HHMMSS-{compte Windows}.txt`, sans index commun), consultation de l'historique. Fichier créé au démarrage (test d'écriture du dossier, « Réessayer » / « Quitter »), écrit au fil de l'eau en ajout seul : UTF-8 sans BOM, CRLF, une ligne par évènement `HH:MM:SS<TAB>NIVEAU<TAB>message` (`TITRE`, `INFO`, `SUCCES`, `ERREUR`), en-tête (début, compte, poste, mode, version) et ligne « Fin de session » écrite à la fermeture de la fenêtre. Échec d'écriture : lignes gardées en mémoire, bandeau « Journal non enregistré », jamais de perte silencieuse. Jamais de secret, d'identifiant VEOS ni de valeur AC056 dans le journal. Historique : seuls les noms au format Flussi sont lus (journaux Lazarus ignorés), contenu lu à la sélection. Canaux `journal:annees`, `journal:sessions`, `journal:lire`, `journal:etat`, `journal:lignes-session`, `journal:etat-change` et `journal:ligne-ajoutee` (ces deux derniers du main vers l'écran). Journal de la session en direct (panneau `rmJournal` de Lazarus) : colonne à droite du cadre, sur tous les écrans ; la session garde ses lignes (`LigneJournalSession`, avec un rang), `ajouter` les enregistre au moment de l'appel (rang, heure, ordre), avant toute écriture ; hook `useJournalSession` (fusion par rang), appelé par `JournalSessionEnDirect` seul. Trace chaque dépôt MSP avec l'empreinte SHA-256 du fichier déposé (v0.5.0).
- `Parametres` : écran en lecture seule. Il affiche le mode actif, la racine de travail, `IN`, `OUT`, `Journal` et la version, issus de la configuration (aucune surcharge locale : `%ProgramData%\Flussi\config.json` fait seul référence). Le mode et la racine indiquent leur origine (`config` pour `config.json`, `env` pour le `.env`, `defaut` pour la valeur par défaut du code), avec le chemin du fichier lu. Les trois sous-dossiers sont toujours dérivés de la racine. Chaque dossier a un bouton « Ouvrir dans l'Explorateur ». Canaux : `config:lire` (configuration et origines) et `config:ouvrir-dossier`. Pour ce dernier, l'écran envoie un nom de dossier (`travail`, `in`, `out`, `journal`), validé par zod, jamais un chemin ; le main appelle `shell.openPath`. Section « Secrets techniques » (item 7 de la v0.2.0) : statut des trois secrets (« Renseigné le JJ/MM/AAAA », « Renseigné dans le .env », « Non renseigné »), un seul bouton « Modifier les secrets » qui déverrouille tous les champs (mots de passe, choix de la clé par un sélecteur ouvert par le main, qui lit et contrôle le fichier lui-même), puis un seul « Enregistrer » (une seule invite UAC) ; lecture seule en dev. Canaux `secrets:etat`, `secrets:preparer-cle` (sans entrée : la clé contrôlée reste en mémoire dans le main, l'écran ne reçoit que son format), `secrets:abandonner-cle` et `secrets:enregistrer` (écriture seule `{ motsDePasse, cle }`, validée par zod, erreur générique sans le détail) ; aucun canal de relecture. Chaque enregistrement ou refus est tracé au journal : « Secret renseigné : … » et « Secret remplacé : … » (SUCCES), « Secret refusé : … » (clé privée refusée à l'analyse), « Secrets non enregistrés : … » (ERREUR : écriture, lecture ou DPAPI en échec) et « Fichier des secrets illisible sur ce poste : il est recréé… » (INFO). Jamais la valeur, le contenu ni le chemin de la clé. S'appuie sur l'adapter `config` (`secrets.ts`, `dpapi.ts`, `cle-privee.ts`, `secrets-format.ts`).

---

## Design

- **État** : produit. Tokens matérialisés via `/design-system-adapt`, références dans `DESIGN.md`, `design/handoff/` et `design/patterns/`.
- **Charte** : mode clair uniquement, ton sobre et corporate. Bleu clair de la marque (C100 M30 J0 N5, `blue-500` `#0077BD`) pour les actions, bleu foncé (C100 M80 J0 N45, `navy-700` `#13295B`) pour l'identité. Violet réservé à l'environnement Recette. Polices IBM Plex Sans et IBM Plex Mono (paquets `@fontsource`, importés dans `index.css`).
- **Plan restant** : au cas par cas, écrans sur-mesure `design/handoff/{ecran}.tsx` via `/design-screen-prompt` pour les items marqués `Pattern: custom` dans `version-{X}.md`.
- **Écran AC056** : pattern `custom` (maquette `design/handoff/ac056.tsx`), et non `list+form` : navigation sur quatre niveaux, liste des erreurs et journal sur le même écran ; `list+form` reste la référence des éléments de base. Écarts avec la maquette : le journal de la session est une colonne du cadre (sur tous les écrans), pas une barre repliable en bas de l'écran ; onglets dans l'organisation de Lazarus (485, 490, 700 et 800 sous le bénéficiaire, pas d'onglet 001) ; deux colonnes jusqu'à l'item 5 (colonne des erreurs non réservée).

**Sources de référence** :

- `DESIGN.md` : source de vérité des tokens (couleurs, typographie, espacements, ombres, mouvement) et des règles d'usage (marquage des erreurs, bandeau Recette, badges, boutons). Ne pas le modifier depuis l'adaptation.
- `design/handoff/` : composants atomiques au format `.tsx` avec classes `.fl-*`, et maquettes d'écrans sur-mesure (`parametres.tsx`). Référence visuelle uniquement, jamais importés par l'application.
- `design/patterns/` : patterns d'écran `list`, `form` et `list+form` au format `.tsx` self-contained (composition complète previewable, instanciée par `feature-agent`). `list+form` en priorité pour l'écran AC056.

**Composants de l'application** (`src/renderer/src/components/ui/`) :

- Installés par la CLI shadcn : `button`, `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `card`, `dialog`, `alert-dialog`, `alert`, `badge`, `tooltip`, `skeleton`.
- Stubs maison de la charte : `field` (render prop câblant id, aide et erreur vers le contrôle), `select` (`<select>` natif), `spinner`, `operation-progress`, `status-badge` (`StatusBadge`, `EnvironmentBadge`, `CountBadge`, `ToneBadge` à ton et icône libres), `environment-banner`, `data-list`, `confirm-dialog`, `tab-bar` (`TabBar` : tablist accessible avec compteurs, onglets désactivés sautés ; identifiants par `idOngletTabBar` de `tab-bar-ids.ts`), `text-input` (`TextInput` : `<input>` de la charte, `className` sur le conteneur, reste blanc en erreur même en lecture seule).
- Les composants shadcn gardent leurs valeurs par défaut (par exemple hauteur de bouton `h-9` au lieu de `h-control-md`, pas de style d'erreur sur `aria-invalid`). Écart accepté et validé. Ne pas les corriger sans demande.
- `alert` : variantes ajoutées `info`, `success`, `warning`, `error` (jetons de la charte), à utiliser plutôt que des surcharges de couleur ; `role="alert"` par défaut, remplaçable (`status`, `note`). `AlertTitle` : prop `as` (`h1` à `h6` ou `p`, `h5` par défaut), à régler à chaque usage selon la hiérarchie des titres de l'écran.
- `CardTitle` rend un `div` (backlog) : écrire un vrai titre (`h2`…) dans la carte en attendant.
- Tokens ajoutés hors `/design-system-adapt` (v0.3.0, item 1) : `bg-header`, `text-on-brand`, `max-w-content` (1600 px), `tracking-heading` (-0.01em, `h1`), `tracking-caption` (0.01em, légendes), `w-panel-log` (288 px, colonne du journal) ; v0.3.0, item 2 : `grid-cols-ac056` et `w-panel-nav` (variable `--panel-nav-width`, 328 px, 344 px à partir de 1440 px), utilitaire `scrollbar-fin`. `DESIGN.md` inchangé.
- `src/renderer/src/lib/utils.ts` : `cn` s'appuie sur `extendTailwindMerge`. Tout nouveau token Tailwind de tailles de police, d'ombres, de hauteurs, de largeurs, d'espacement des lettres, de z-index, de durées ou de courbes doit y être déclaré, sinon `tailwind-merge` supprime la classe sans prévenir.

---

## Autonomie et permissions de Claude Code

Les règles sont dans `.claude/settings.json` (versionné), en double `Bash(...)` et `PowerShell(...)` : les règles d'un outil ne s'appliquent pas à l'autre. Les agents héritent des règles `allow` et `deny`.

- **Sans demande** : modifications de fichiers du projet (mode `acceptEdits`), scripts de qualité (`npm test`, `npm run test:e2e`, `build`, `typecheck`, `lint`, `format`, `format:check`), git local (`status`, `diff`, `log`, `add`, `commit`, création de branche), lecture GitHub, listage de fichiers.
- **Avec demande** : `npm install`, `npm run dev`, `npm run package`, `git push`, toute suppression, toute commande mentionnant `.ssh`, et tout ce qui n'est pas listé.
- **Refusé** : lecture ou modification de `.env` (outil ou shell), lecture de ses variantes locales (`.env.local`, `.env.*.local`, `.env.test`, `.env.corpus`) et du corpus `CORPUS-DEV` (outil ou shell), lecture des clés privées `*.ppk` (outil, et toute commande shell qui cite `.ppk`), `npm publish`, `npx playwright test` en direct, `git push --force`, `gh repo delete` et `gh repo edit`.
- **Habitudes** : une commande simple par appel (pas de script PowerShell sur une ligne avec variables ou boucles), les outils Read, Grep et Glob plutôt que le shell pour lire des fichiers, les scripts npm plutôt que les outils appelés directement. Ne jamais citer `.env` (ni `.env.example`), `CORPUS-DEV` ni `.ppk` dans une commande shell, même dans un message de commit.
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
