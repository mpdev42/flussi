# Version 0.2.0 — Socle applicatif

**Objectif** : poser le socle de l'application avant les modules métier : configuration et modes `recette`/`prod`, stockage sur `P:`, journal de session, écran Paramètres, secrets techniques, et premier installeur testé par Intune sur un vrai poste. Le risque principal visé est l'erreur de mode (faire un test sur la production) : les deux mondes, dev et application installée, sont strictement séparés.

**Cadrage** (2026-10-14) : les 11 items de la roadmap sont regroupés en 7 (voir « Items retirés (YAGNI) »).

**Écarts avec `CLAUDE.md` décidés au cadrage**, à reporter dans `CLAUDE.md` à la fin de l'item concerné :

| # | Écart | Item |
|---|---|---|
| 1 | Plus de surcharge dans `%APPDATA%\Flussi\` : la configuration de l'application installée vient du code et de `config.json` seulement | 2 |
| 2 | Titre de la fenêtre : « Flussi — Recette » en recette, « Flussi » seul en production | 2 |
| 3 | En dev, `%ProgramData%\Flussi\config.json` n'est jamais lu, et le mode `prod` est refusé | 2 |
| 4 | Écran Paramètres en lecture seule (mode, dossiers, version), plus la section administrateur des secrets | 6, 7 |
| 5 | Procédure « traite les PR Dependabot » décrite dans `CLAUDE.md` | 1 |

---

### 1. Dependabot encadré

**Statut** : Terminé
**Pattern** : aucun

**Description** — `.github/dependabot.yml` : pas de mises à jour de version, seulement les mises à jour de sécurité, regroupées en une seule PR. Règles `ignore` par plage de versions qui écartent toute montée contraire aux contraintes de `CLAUDE.md`. Traitement des alertes ouvertes.

**Décisions techniques** :

- Écosystème `npm` seul (le dépôt n'a pas de workflow GitHub Actions).
- `open-pull-requests-limit: 0` : coupe les mises à jour de version, les mises à jour de sécurité restent actives.
- Un groupe `applies-to: security-updates` : une seule PR.
- Règles `ignore` par `versions` (pas `update-types`, ignoré pour la sécurité) : `tailwindcss` ≥ 4, `vite` ≥ 8, `@vitejs/plugin-react` ≥ 6, `tailwind-merge` ≥ 3, `typescript` ≥ 6.1.
- **Electron n'est jamais ignoré** : il embarque Chromium et Node dans l'application livrée, ses correctifs de sécurité sont prioritaires.
- Vérifier dans les réglages du dépôt que les alertes Dependabot et les mises à jour de sécurité sont activées.
- Procédure « traite les PR Dependabot » ajoutée dans `CLAUDE.md` (vérification des contraintes de versions, tests, build, puis fusion ou fermeture expliquée), pour qu'elle s'applique dans toute session.

**Alertes ouvertes** (constatées le 2026-10-14, toutes en dépendances de build, absentes de l'installeur qui ne contient que `out/**`) :

| Alerte | Gravité | Origine | Décision |
|---|---|---|---|
| `postcss-selector-parser` 6.1.4 | moyenne | `tailwindcss` 3.4, `postcss-nested` | Correctif 7.1.6 seulement (majeure), incompatible avec Tailwind 3.4 qui exige la 6.x. Alerte classée « risque toléré » : outil de build, absent de l'application livrée. Réglée par le passage à Tailwind 4, après la v1.0. Pas d'`overrides`. |
| `http-cache-semantics` 4.2.0 | haute | `electron-builder` → `@electron/get` → `got` | Aucun correctif publié : alerte laissée ouverte, Dependabot proposera la PR à la sortie du correctif. |
| `sprintf-js` 1.1.3 | moyenne | `electron-builder` → `@electron/get` → `global-agent` | Idem. |

**Fichiers impactés** : `.github/dependabot.yml` (nouveau), `CLAUDE.md`. Aucun changement de dépendance prévu.

**Décisions d'implémentation** (2026-10-14) :

- Réglages du dépôt constatés : alertes Dependabot et mises à jour de sécurité déjà activées, aucune PR Dependabot ouverte jusqu'ici. Rien à changer.
- `schedule.interval: weekly` : clé obligatoire même sans mises à jour de version, sans effet avec `open-pull-requests-limit: 0`.
- Plages `ignore` écrites en plages npm (`>=8.0.0`, `>=6.1.0`…). Un commentaire dans `dependabot.yml` relie chaque règle à sa contrainte de `CLAUDE.md` ; `CLAUDE.md` rappelle que les deux se modifient ensemble.
- Alerte n° 3 (`postcss-selector-parser`) classée sur GitHub en `tolerable_risk`, avec commentaire (outil de build, correctif incompatible avec Tailwind 3.4, réglé par Tailwind 4 après la v1.0). Alertes n° 2 et n° 4 laissées ouvertes (aucun correctif publié).
- Procédure de `CLAUDE.md`, corrigée après la revue d'item : alertes filtrées par `?state=open`, `npm ci` sans demande (autorisé dans `.claude/settings.json`), fusion par `gh pr merge --squash --delete-branch` (le squash empêche `git branch -d` de supprimer la branche locale).
- Point non prouvé : la doc GitHub ne dit pas si les règles `ignore` par `versions` s'appliquent aux mises à jour de sécurité (elle ne l'affirme pas, ne l'exclut pas, et ne dit « `update-types` ignoré » que pour `allow`). Couvert par l'étape 2 de la procédure (montée contraire, PR fermée) ; à confirmer à la première PR de sécurité qui toucherait un paquet bloqué (backlog).

**Point d'attention pour l'item 2** : `dependabot.yml` n'est lu par GitHub qu'après le push de `main`. Au démarrage de l'item 2, vérifier dans GitHub (Insights → Dependency graph → Dependabot) que la configuration est lue sans erreur.

---

### 2. Configuration et démarrage de l'application

**Statut** : Terminé
**Pattern** : aucun

**Description** — Adapter `config` : mode `recette`/`prod`, refus de démarrer sur une configuration invalide, instance unique, séquence de démarrage et cadre de l'application (en-tête, navigation, bandeau Recette, titre, version). Fusion des items 1, 2 et 8 de la roadmap, plus une partie de l'item 9 (version dans l'en-tête).

**Pourquoi** : savoir à tout moment dans quel mode tourne Flussi, et rendre impossible un test sur la production par erreur.

**Décisions techniques — sources de la configuration** :

- **Application installée** : valeurs par défaut du mode dans le code, puis `%ProgramData%\Flussi\config.json` (déployé par Intune, en lecture seule pour les utilisateurs). `config.json` est obligatoire. Le `.env` n'est jamais lu.
- **Dev** (`!app.isPackaged`, y compris les tests e2e qui lancent `out/`) : valeurs par défaut du mode, puis ~~variables d'environnement du processus, complétées par~~ le `.env` seul (lu par `util.parseEnv` de Node, sans dépendance ajoutée ; corrigé à l'implémentation, voir « Décisions d'implémentation »). **`%ProgramData%\Flussi\config.json` n'est jamais lu en dev** : sur un poste qui porte aussi Flussi installé, une clé absente du `.env` serait sinon reprise en silence de la production.
- **En dev, le mode `prod` est refusé** : l'application refuse de démarrer si `FLUSSI_ENV=prod`. Le travail réel en production se fait avec Flussi installé.
- **Le mode n'est pas modifiable dans l'interface** : il vient seulement de `config.json` ou du `.env`. Pas de surcharge dans `%APPDATA%\Flussi\` (ni pour le mode, ni pour les dossiers).
- Valeurs par défaut de `prod` : racine de travail `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts` (dossiers `IN`, `OUT`, `Journal` dérivés, voir item 3). **Aucun dossier par défaut en `recette`** : ils sont obligatoires dans le `.env` (dev) ou dans `config.json`. Les valeurs par défaut des services VEOS, IGA et MSP arrivent avec leurs versions (v0.4.0, v0.5.0).
- Format de `config.json` : clés à plat, mêmes noms que les variables (`{ "FLUSSI_ENV": "prod", "STOCKAGE_DOSSIER_TRAVAIL": "…" }`). BOM UTF-8 accepté (PowerShell 5.1 en écrit un).
- Validation par un schéma zod (`src/shared/schemas/config.ts`). Les secrets n'y figurent jamais (item 7).
- Canal IPC `config:lire` : renvoie la configuration résolue non secrète.

**Cas limites — refus de démarrer** (ancien item 2, jamais de repli sur `prod`) :

- Application installée : `config.json` absent ou illisible (JSON invalide).
- Clé obligatoire sans valeur par défaut manquante (« partiel ») : `FLUSSI_ENV` partout, dossiers de travail en `recette`. Un `config.json` de prod réduit à `FLUSSI_ENV=prod` est valide.
- Clé inconnue (faute de frappe, par exemple `STOCKAGE_DOSIER_IN`) : refus. Ignorée, elle laisserait passer la valeur par défaut en silence.
- Secret placé dans `config.json` : refus avec message explicite (item 7).
- `FLUSSI_ENV` vide ou invalide : seules `recette` et `prod` sont acceptées, sans tolérance de casse (`Prod` et `production` refusés).
- Dev : `FLUSSI_ENV=prod`.
- Affichage : boîte de dialogue Windows native (l'écran n'est pas encore chargé), puis arrêt. Le message donne le fichier, la clé, ce qui est attendu, et « Contactez le service informatique ». Jamais de valeur secrète. Rien au journal (son dossier vient de la configuration).

**Instance unique** (ancien item 8) :

- `app.requestSingleInstanceLock()` pris **en tout premier**, avant la configuration. Verrou système (mutex et fenêtre de messages, nommés d'après le dossier de profil), libéré par Windows à la fin du processus, même sur un plantage : aucun verrou fantôme.
- Second lancement : la première instance reçoit `second-instance`, restaure sa fenêtre si elle est réduite et la remet au premier plan. Le second processus s'arrête aussitôt, sans fichier de session ni écriture au journal. Si la première instance affiche une erreur de démarrage, le second lancement s'arrête sans rien afficher de plus.
- Un verrou par compte Windows (changement rapide d'utilisateur : une instance par compte, accepté).
- **En dev, profil distinct** (`%APPDATA%\Flussi-dev`, par `app.setPath('userData', …)` avant la prise du verrou) : `npm run dev` et Flussi installé tournent côte à côte sur le même poste.
- Test e2e qui lance l'application deux fois. Si Playwright ne s'y prête pas, vérification manuelle tracée dans les décisions d'implémentation.

**Séquence de démarrage** : verrou, configuration, stockage (item 3), journal (item 4), fenêtre.

**Cadre de l'application** :

- Titre de la fenêtre : « Flussi — Recette » en recette, « Flussi » seul en production (pas de version dans le titre).
- Bandeau Recette (`environment-banner.tsx`, existant) en haut de chaque écran. Rien en production.
- En-tête et navigation principale d'après `AppHeader` de `design/patterns/`, avec la version en petit à droite (`Flussi 0.2.0`). Les items 4 et 6 y branchent leurs écrans.
- Version lue par `app.getVersion()` (`package.json`, mis à jour par `/version-finalize`), jamais saisie à la main.
- La page de test actuelle (`App.tsx`) est remplacée ; le smoke-test e2e est adapté.

**Repris du backlog** :

- Compléter `.gitignore` avec `CORPUS-DEV/`, `*.erreurs.txt`, `*.modification.txt`, `Rejets-TEST*`, `*.rtf`, `[uU][cC]onstantes*.pas`. Les variantes `.env.*` sont déjà ignorées (`.env.*`, sauf `.env.example`). Refuser en `deny` dans `.claude/settings.json` la lecture du dossier du corpus et de `.env.local`, `.env.*.local`, `.env.test`, `.env.corpus` (v0.1.0, revue release)

**Tests** : unitaires sur la résolution des sources et chaque cas de refus ; e2e sur le titre et le bandeau en recette, et sur l'instance unique.

**Fichiers impactés** : `src/main/adapters/config/`, `src/main/index.ts`, `src/main/ipc/parametres/`, `src/preload/index.ts`, `src/shared/schemas/config.ts`, `src/shared/types/`, `src/renderer/src/App.tsx` et un composant de cadre, `.env.example`, `.gitignore`, `.claude/settings.json`, `e2e/specs/`, `CLAUDE.md` (écarts 1 à 3).

**Décisions d'implémentation** (2026-10-14) :

- **`.env` lu par `util.parseEnv`**, pas par `process.loadEnvFile` : la détection des clés inconnues exige la liste des clés du fichier (`process.env` contient des centaines de variables étrangères), et les mots de passe de dev ne sont pas versés dans `process.env` (ni hérités par les processus enfants). `.env` lu dans le répertoire courant (`process.cwd()`, la racine avec `npm run dev`).
- **Correctif après la vérification manuelle : en dev, le `.env` seul** (variables du processus ignorées pour la configuration). Constat : avec le réglage utilisateur `"python.terminal.useEnvFile": true`, l'extension VS Code Python Environments injecte le `.env` dans chaque terminal ; la priorité prévue au cadrage (processus avant `.env`) faisait lire une copie figée à la création du terminal (`FLUSSI_ENV` retiré du `.env` mais toujours lu). Corrigé de deux façons : `.vscode/settings.json` fixe `"python.terminal.useEnvFile": false` (le `.env`, mots de passe compris, n'est plus injecté dans les terminaux du projet), et la résolution ne lit plus que le `.env` en dev. Au second lancement, le processus qui s'arrête l'écrit dans le terminal (« Flussi est déjà ouvert… ») : sans cela, une relance qui ne fait que ramener la fenêtre existante passe inaperçue.
- **Dérivation `{TRAVAIL}\IN`, `OUT`, `Journal` avancée de l'item 3 à l'item 2** : le contrôle « dossiers de recette manquants » en dépend. Recette valide avec `STOCKAGE_DOSSIER_TRAVAIL`, ~~ou avec les trois dossiers (`travail: null`)~~ (clés des trois dossiers supprimées à l'item 3). L'item 3 garde l'adapter `stockage` (accès disque).
- **Clés VEOS, IGA et MSP connues mais pas résolues** : acceptées dans `config.json` et le `.env` (pas de refus « clé inconnue » sur un `.env` copié de `.env.example`), valeurs par défaut et validation en v0.4.0 et v0.5.0. Une clé ajoutée à `.env.example` doit l'être aussi dans `src/shared/schemas/config.ts`.
- **Règles de validation** : valeur vide = absente ; chemins de dossier absolus Windows (`X:\…` ou `\\serveur\partage\…`, barres obliques refusées) ; `config.json` en texte seulement (`MSP_SFTP_PORT: 10022` refusé, « texte attendu ») ; seule la valeur de `FLUSSI_ENV` est citée dans les messages. Toutes les erreurs sont affichées d'un coup, sous le chemin du fichier en cause. Exception : tant que `FLUSSI_ENV` est absent ou invalide, l'erreur « dossiers manquants » n'est pas émise (on ne sait pas si le défaut `prod` s'applique) ; un second refus est donc possible après correction du mode.
- **Démarrage** : profil dev (`%APPDATA%\Flussi-dev`), verrou, puis `whenReady` → configuration → handlers IPC → fenêtre. La configuration est lue après `whenReady` pour que les boîtes de dialogue de l'item 3 (« Réessayer » / « Quitter ») suivent le même chemin. Titre fixé par le main, `page-title-updated` bloqué (sinon la balise `<title>` de la page l'écrase).
- **`FLUSSI_PROFIL_DEV`** (variable du processus, dev seulement, jamais dans le `.env`) : profil Electron des e2e, donc verrou d'instance distinct de `npm run dev`. Sans lui, un e2e lancé avec la fenêtre de dev ouverte serait la « seconde instance » et s'arrêterait.
- **Fixture e2e hermétique** : lance la racine du projet (lancé sur `out/main/index.cjs`, Electron ne lit pas `package.json` et `app.getVersion()` renvoie la version d'Electron), avec un répertoire courant temporaire qui porte son propre `.env` (écrit par la fixture), un dossier de travail et un profil temporaires. Le titre de la fenêtre se lit par `app.evaluate` (`page.title()` lit la balise `<title>`). La fenêtre n'est réduite qu'une fois visible (`show: false` jusqu'à `ready-to-show`).
- **Instance unique, test e2e** : second Electron lancé avec le même profil → sortie en code 0, première fenêtre restaurée, toujours une seule fenêtre. Retour de la fenêtre au premier plan devant une autre application vérifié à la main par l'utilisateur (2026-10-14).
- **Cadre** : `src/renderer/src/components/cadre-application.tsx`, piloté par props (navigation fournie par `App.tsx`, une entrée « Accueil » pour l'instant, page active en état local, sans routeur). « Flussi {version} » en `text-xs` `navy-100` à droite de « Environnement : … ». L'en-tête affiche la version de `package.json`, encore 0.1.0 jusqu'à `/version-finalize`. Écran « Accueil » provisoire.
- **Manques design relevés** (non inlinés) : pas de token Tailwind sémantique `bg-header` ni `text-on-brand` (remplacés par `bg-navy-700` et `text-white`, mêmes valeurs) ; `max-w-[1600px]` de la colonne d'écran, `ls-tight` (-0.01em) du `<h1>` et `tracking-[0.01em]` des légendes sans équivalent. À traiter par `/design-system-adapt` si besoin.
- **`.claude/settings.json`** : `Bash(*CORPUS-DEV*)` et `PowerShell(*CORPUS-DEV*)` bloquent aussi un message de commit qui cite ce dossier ; la règle existante `*.env*` bloque toute commande shell qui cite `.env.example`. Règle reportée dans `CLAUDE.md`.
- **Écarts 1 à 3** reportés dans `CLAUDE.md` (sources de la configuration, titre, `config.json` jamais lu en dev et `prod` refusé).
- **Tests** : 99 unitaires (`resolution`, `lecture` dont « variables du processus ignorées en dev », schéma, cadre par `renderToStaticMarkup`), 3 e2e (smoke, cadre en recette, instance unique avec le message « Flussi est déjà ouvert » lu sur la sortie du second processus). Non couverts automatiquement : boîte de refus native (vérifiée à la main le 2026-10-14 : `FLUSSI_ENV=prod` et `FLUSSI_ENV` absent refusés, sortie en code 1), application installée avec un vrai `config.json` (test pilote de l'item 5), titre « Flussi » en production.
- **Revue d'item** (`OK POUR MERGE`, aucun bloquant) :
  - `formaterErreurs` garde un regroupement par fichier alors qu'un seul fichier est lu par lancement depuis le correctif : conservé (juste et sans coût).
  - Caractère de contrôle accepté dans un chemin de dossier : dans un `.env`, une valeur entre guillemets doubles transforme `\n` en saut de ligne (`"C:\Dev\nouveau"`, vérifié avec `util.parseEnv`) ; de même une chaîne JSON `"P:\nouveau"` dans `config.json`. `estCheminDossier` ne contrôle que le début du chemin. Risque faible : le dossier serait signalé absent par l'item 3, avec un chemin trompeur.
  - En `prod`, `dossiers.travail` vaut la racine par défaut même quand `IN`, `OUT` et `Journal` sont tous surchargés.
  - Règle `Read(//p/**/CORPUS-DEV/**)` non vérifiée (format des chemins `P:` dans les règles non confirmé ; l'essayer reviendrait à risquer une lecture de données personnelles). Les règles shell `*CORPUS-DEV*` couvrent le terminal.

**Point d'attention pour l'item 3** : refuser tout caractère de contrôle (`/[\u0000-\u001F]/`) dans `estCheminDossier` (`src/shared/schemas/config.ts`) et déconseiller les guillemets doubles autour des chemins dans `.env.example` (voir « Revue d'item » ci-dessus). L'item 3 touche déjà `src/shared/schemas/config.ts`.

**Point d'attention pour l'item 5** : le premier lancement installé est le premier test réel de la lecture de `%ProgramData%\Flussi\config.json` (BOM de PowerShell 5.1, refus si absent ou invalide) : à vérifier explicitement au déroulé du test pilote.

**Point d'attention pour l'item 6** : ~~en `prod`, `dossiers.travail` vaut la racine par défaut même si les trois dossiers sont surchargés (`src/main/adapters/config/resolution.ts`). À traiter avec l'affichage des origines : `travail` à `null` ou origine « non utilisée ».~~ Sans objet depuis l'item 3 : les trois dossiers sont toujours dérivés de la racine de travail.

---

### 3. Adapter `stockage` et `P:` instable

**Statut** : Terminé
**Pattern** : aucun

**Description** — Emplacements logiques `in`, `out`, `journal` vers des dossiers configurables, et comportement sûr quand `P:` est indisponible ou instable (non monté, déconnecté, verrou OneDrive `EBUSY`/`EPERM`, copies de conflit). Jamais d'échec silencieux ni d'écrasement. Fusion des items 3 et 4 de la roadmap.

**Pourquoi** : indispensable pour conserver les fichiers.

**Décisions techniques** :

- `STOCKAGE_DOSSIER_TRAVAIL` est la racine : `IN`, `OUT` et `Journal` valent ~~par défaut~~ **toujours** `{TRAVAIL}\IN`, `{TRAVAIL}\OUT`, `{TRAVAIL}\Journal`~~, chacun surchargeable séparément (`STOCKAGE_DOSSIER_IN`…) dans `config.json` ou le `.env`~~ (corrigé à l'implémentation, voir « Décisions d'implémentation »).
- **Octets bruts** : l'adapter lit et écrit des octets, jamais du texte décodé (parité AC056 : UTF-8, Windows-1252, CRLF, BOM). Le décodage reste au domaine.
- **Chemins** : les services passent un emplacement logique et un nom relatif (`('journal', '2026/10/20261014-091500-c.mathevon.txt')`). L'adapter refuse les chemins absolus, les `..` et les caractères interdits sous Windows : aucun service ne sort de son dossier.
- **Opérations (YAGNI)** : `lister` (fichiers et sous-dossiers), `lire`, `ajouter` (ajout seul, avec création des sous-dossiers `AAAA\MM` du journal), vérification d'accès. L'écriture d'un fichier entier sans écrasement arrive avec les téléchargements IGA et rejets (v0.4.0, v0.5.0).
- Interface déclarée comme un type TypeScript : une implémentation Microsoft Graph remplacera l'implémentation disque après la v1.0, sans toucher aux services.

**Cas limites** (ancien item 4) :

- **Vérification au démarrage** : `IN`, `OUT` et `Journal` existent et se lisent. Pas de fichier de test écrit (il partirait dans la synchronisation SharePoint, et Windows ne teste pas fiablement le droit d'écriture sans écrire). Le droit d'écriture est vérifié en conditions réelles : dès le démarrage pour `Journal` (création du fichier de session, item 4), à l'écriture pour `IN` et `OUT`, avec une erreur claire.
- **Dossier absent** : `IN`, `OUT` et `Journal` ne sont jamais créés (un chemin mal réglé produirait en silence une arborescence parallèle). Seuls les sous-dossiers `Journal\AAAA\MM` sont créés.
- **Échec au démarrage** : boîte de dialogue Windows native « Réessayer » / « Quitter », avec le dossier en cause (nom logique et chemin) et la cause probable (lecteur `P:` non monté, dossier absent, accès refusé). « Réessayer » sert quand `P:` se monte quelques secondes après l'ouverture de session.
- **Verrou `EBUSY` / `EPERM`** : 3 nouvelles tentatives (après 0,5 s, 1 s, 2 s, environ 3,5 s au total), puis erreur claire, sur chaque opération. Jamais de nouvelle tentative sur une autre erreur.
- **Copies de conflit OneDrive** (`nom-NOMPOSTE.ext`, `nom-NOMPOSTE-2.ext`) : `lister` les marque « copie de conflit probable » quand le nom suit ce motif et que `nom.ext` existe dans le même dossier. Jamais supprimées ni fusionnées automatiquement : le service puis l'écran décident de l'affichage.
- **Déconnexion en cours de session** : erreur typée par opération (code `lecteur-indisponible`, `dossier-absent`, `acces-refuse`, `verrou` ; emplacement logique ; chemin), jamais le contenu d'un fichier. L'échec d'écriture du journal en cours de session relève de l'item 4.

**Tests** : unitaires sur un dossier temporaire (`os.tmpdir()`), sans `P:` : résolution des emplacements, refus des chemins, nouvelles tentatives sur verrou simulé, détection des copies de conflit.

**Fichiers impactés** : `src/main/adapters/stockage/`, `src/shared/schemas/config.ts` (racine de travail), `.env.example` (commentaire de `STOCKAGE_DOSSIER_TRAVAIL`), tests unitaires.

**Décisions d'implémentation** (2026-10-14) :

- **Clés `STOCKAGE_DOSSIER_IN`, `STOCKAGE_DOSSIER_OUT` et `STOCKAGE_DOSSIER_JOURNAL` supprimées** (écart avec le cadrage de l'item 2, décidé par l'utilisateur). Constat à la vérification manuelle : avec les trois clés renseignées, un `STOCKAGE_DOSSIER_TRAVAIL` sur un lecteur inexistant (`Q:\…`) était ignoré en silence et Flussi démarrait. Désormais `IN`, `OUT` et `Journal` sont toujours `{TRAVAIL}\IN`, `{TRAVAIL}\OUT`, `{TRAVAIL}\Journal` (noms fixes, disposition de Lazarus, du défaut `prod` et de la recette du poste pilote) ; `STOCKAGE_DOSSIER_TRAVAIL` est obligatoire en recette ; `dossiers.travail` n'est plus jamais `null`. Une des trois clés encore présente est refusée comme « clé inconnue ». La surcharge par dossier était un vestige de la surcharge locale de l'écran Paramètres, abandonnée au cadrage. `CLAUDE.md` mis à jour.
- **Adapter** `src/main/adapters/stockage/` : `types.ts` (interface `Stockage`, `SystemeFichiers` injectable), `chemins.ts` et `conflits.ts` (purs), `erreurs.ts` (traduction des codes système, texte de la boîte), `disque.ts` (implémentation sur `node:fs/promises`). Résultats en union `{ ok, valeur } | { ok, erreur }` plutôt qu'exceptions, comme `ResultatConfiguration`. Types côté main pour l'instant.
- **Codes d'erreur** : les quatre du cadrage, plus `introuvable` (fichier ou sous-dossier absent dans un emplacement présent), `chemin-refuse` (nom relatif refusé, sans accès disque) et `erreur-systeme` (tout autre code, cité). `EPERM` encore présent après les 3 nouvelles tentatives donne `acces-refuse`, avec un message qui cite aussi un verrou OneDrive (Windows renvoie `EPERM` dans les deux cas) : un vrai refus de droits attend donc environ 3,5 s par dossier avant la boîte de démarrage.
- **Diagnostic d'un `ENOENT`** : `stat` de la racine de l'emplacement, puis de la racine du lecteur (`P:\` ou `\\serveur\partage\`). Tout échec sur la racine du lecteur, quel que soit le code, donne `lecteur-indisponible` (corrigé à la relecture : un code `UNKNOWN` sur un partage injoignable donnait « dossier absent »). Constat sous Windows : un chemin qui traverse un fichier (`fichier.txt\x`) renvoie `ENOENT`, pas `ENOTDIR` ; le diagnostic conclut correctement `introuvable`.
- **Nouvelles tentatives** sur l'opération entière (le plafond de ~3,5 s tient pour `ajouter`, qui crée les sous-dossiers puis ajoute).
- **`ajouter`** : sous-dossiers créés niveau par niveau par `mkdir` non récursif, jamais la racine (un `mkdir` récursif recréerait `Journal` disparu).
- **`lister`** : une entrée ni fichier ni dossier pour le `Dirent` est classée par `stat` (les fichiers OneDrive « à la demande » sont des points d'analyse, que libuv présente comme liens symboliques).
- **Noms relatifs refusés** : vide, absolu, segment vide, `.` et `..`, `< > : " | ? *`, caractères de contrôle, point ou espace final, `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9` (avec ou sans extension).
- **Copies de conflit** : `base-SUITE.ext` à côté de `base.ext`, SUITE = `POSTE` ou `POSTE-n`, POSTE en lettres, chiffres et tirets, au moins une lettre, 15 caractères au plus (corrigé à la relecture : sans la lettre obligatoire, `Rejets-20261014.txt` à côté de `Rejets.txt` était marqué).
- **Configuration** (point d'attention de l'item 2) : `estCheminDossier` refuse tout caractère U+0000 à U+001F ; message dédié selon le contexte (pas de guillemets doubles dans le `.env`, barres obliques inverses doublées dans `config.json`). `.env.example` le déconseille et rappelle que `IN`, `OUT` et `Journal` doivent exister.
- **Démarrage** : `verifierAcces` après la configuration, boucle sur la boîte native « Réessayer » / « Quitter » (`app.exit(1)`). Fixture e2e : crée `IN`, `OUT` et `Journal`. Vérifié à la main par l'utilisateur (2026-10-14) : lecteur `Q:` absent, dossier absent, « Réessayer », « Quitter ».
- **Tests** : 2 098 unitaires (158 pour l'adapter : faux `SystemeFichiers` qui délègue au disque temporaire et injecte des erreurs, `attendre` simulé, octets exacts, racine jamais créée, confidentialité), 3 e2e. Non couverts automatiquement : la boîte native, un vrai verrou OneDrive et de vraies copies de conflit sur `P:`.
- **Revue d'item** (`OK POUR MERGE`, aucun bloquant) :
  - `classerParStat` (`disque.ts`) ignore une entrée sur toute erreur autre qu'un verrou, pas seulement sur `ENOENT` (lien cassé) : une entrée dont le `stat` échoue en `EACCES` ou `ETIMEDOUT` disparaîtrait de la liste sans erreur.
  - `COM0`, `LPT0`, `CONIN$` et `CONOUT$` non refusés par `chemins.ts` (documentation Microsoft récente) ; une jonction ou un lien symbolique dans un emplacement serait suivi par `lister` et `lire`. Sans risque tant que les noms viennent des services.
  - Un compte Windows sans point (`cmathevon`) ferait marquer `20261014-091500-cmathevon.txt` comme copie de conflit à côté d'un journal Lazarus `20261014-091500.txt` de la même seconde (improbable, disparaît avec l'archivage des journaux Lazarus).
  - Message `verrou` « fichier verrouillé » même pour un dossier ; même cause répétée trois fois dans la boîte quand `P:` n'est pas monté.
  - `docs/project-description.md` cite encore les clés retirées : document de cadrage historique, laissé tel quel.

**Point d'attention pour l'item 4** :

- Le journal est le premier à exposer l'adapter par l'IPC (historique, lecture d'un fichier de session) : déplacer dans `src/shared/types/` les types qui traversent l'IPC (`ElementStockage`, `ErreurStockage`, `ResultatStockage`), valider les noms reçus par zod puis par `decouperCheminRelatif`, et ajouter `COM0`, `LPT0`, `CONIN$`, `CONOUT$` aux noms réservés de `src/main/adapters/stockage/chemins.ts`.
- L'historique repose sur `lister` : dans `classerParStat` (`src/main/adapters/stockage/disque.ts`), n'ignorer que `ENOENT` et relancer les autres erreurs, pour qu'une entrée illisible ne disparaisse pas en silence.
- Nommage du fichier de session : la détection des copies de conflit suppose un point dans le compte Windows pour ne pas confondre un journal Flussi avec un journal Lazarus de la même seconde (voir « Revue d'item » ci-dessus) ; le vérifier ou filtrer les noms hors nommage Flussi avant `trouverCopiesConflit`.

**Point d'attention pour l'item 5** : au test pilote sur `P:`, observer un vrai verrou OneDrive (`EBUSY`/`EPERM`) et une vraie copie de conflit, pour confirmer les codes et le motif de nom supposés par l'adapter (`src/main/adapters/stockage/`), et le premier démarrage avec `P:` monté en retard (« Réessayer »).

---

### 4. Module `Journal` : fichier de session et historique

**Statut** : Terminé
**Pattern** : list

**Description** — Arborescence de Lazarus conservée (`Journal\AAAA\MM\`, mois de `01` à `12`), un fichier par session, sans index commun, nommé `AAAAMMJJ-HHMMSS-{compte Windows}.txt` (ex. `20261002-141425-c.mathevon.txt`), écrit en ajout seul. Consultation de l'historique en parcourant les dossiers. La version de l'application est inscrite dans chaque fichier (partie de l'item 9 de la roadmap).

**Pourquoi** : savoir ce qui s'est passé pendant la session d'un utilisateur.

**Constat Lazarus** (`EnregistrerJournal`, `fmain.pas:3335`) : journal écrit en une seule fois à la fin de la session, au format RTF (`rmJournal.Rtf`, couleurs titre, succès, erreur), nommé `AAAAMMJJ-HHMMSS.txt` sans le compte, dans `Journal\AAAA\MM\`, avec une ligne dans un index commun. Rien n'est écrit si la session est vide.

**Divergences validées avec Lazarus** :

| # | Divergence |
|---|---|
| 1 | Écriture au fil de l'eau, en ajout seul (Lazarus écrit tout à la fermeture et perd la session sur un plantage) |
| 2 | Texte UTF-8 sans BOM, CRLF, au lieu du RTF |
| 3 | Pas d'index commun |
| 4 | Nom suffixé du compte Windows |
| 5 | Fichier créé au démarrage, même si la session reste vide (deux fichiers par jour au plus) |

**Décisions techniques** :

- **Format** : une ligne par évènement, champs séparés par des tabulations (`09:15:02	SUCCES	Connexion à IGA réussie`). Niveaux repris des styles Lazarus : `TITRE`, `INFO`, `SUCCES`, `ERREUR`. Lisible dans le Bloc-notes et relu par programme : la v0.5.0 y retrouvera les empreintes SHA-256 des dépôts (anti-doublon).
- **En-tête** : date et heure de début, compte Windows, nom du poste, mode (`recette`/`prod`), version de Flussi. **Fin** : ligne « Fin de session ».
- **Création au démarrage**, juste après les vérifications de configuration et de stockage : c'est aussi le test d'écriture du dossier `Journal`.
- **Échec d'écriture en cours de session** : lignes gardées en mémoire, bandeau d'alerte permanent « Journal non enregistré », nouvelle tentative à chaque ajout. À la fermeture, si l'écriture échoue encore, boîte « Réessayer » / « Quitter quand même » avec le nombre de lignes perdues. Jamais de perte silencieuse.
- **Contenu interdit** : aucun secret, aucun identifiant VEOS, aucune valeur lue dans un fichier AC056 (données personnelles). Noms de fichiers, comptages et messages seulement.
- **Historique** (pattern `list`) : liste construite à partir des seuls noms de fichiers (date, heure, compte), du plus récent au plus ancien, mois par mois, en parcourant `AAAA\MM`. Contenu lu seulement à la sélection (pas de lecture de chaque fichier sur `P:`). Copies de conflit signalées (item 3). La session en cours apparaît en tête.
- **Fichiers hors nommage Flussi ignorés** par l'historique : les journaux RTF de Lazarus et son index, présents dans le même dossier `Transferts\Journal` tant qu'ils ne sont pas archivés, n'y apparaissent pas.
- **Journal en direct dans la fenêtre principale** (panneau `rmJournal` de Lazarus) : reporté au premier module qui produit de vrais évènements (v0.3.0 ou v0.4.0).

**Contraintes** :

- Le dossier `Transferts\Journal` est **commun à Lazarus et à Flussi**. À la première mise en production, les anciens journaux de Lazarus (fichiers RTF et index) seront archivés dans un autre dossier pour laisser `Transferts\Journal` à Flussi (inscrit au backlog, v1.0.0).

**Tests** : unitaires (nommage, format des lignes, en-tête, tampon en cas d'échec, filtrage des fichiers hors nommage, ordre de l'historique) ; e2e de l'écran d'historique.

**Fichiers impactés** : `src/main/services/journal/`, `src/main/ipc/journal/`, `src/preload/index.ts`, `src/shared/schemas/journal.ts`, `src/renderer/src/services/journal.ts`, `src/renderer/src/hooks/`, `src/renderer/src/pages/` (historique), tests unitaires et e2e.

**Décisions d'implémentation** (2026-10-14) :

- **Écran Historique** (précisions de l'utilisateur au check-point) : choix de la période par **boutons**, pas de liste déroulante (plus direct). Un bouton par dossier `AAAA` du journal, plus l'année en cours, du plus ancien au plus récent ; 12 boutons de mois toujours affichés (« Janv. » … « Déc. », nom complet pour les lecteurs d'écran) ; année et mois en cours sélectionnés par défaut ; changer d'année garde le mois. Tableau **Date | Heure | Compte | Statut**, jamais le nom de fichier ; ni calendrier ni arborescence (pattern `list`). Statut : « En cours » (session de ce lancement, toujours en tête), « Copie de conflit » (avertissement). Une ligne ouvre le détail dans une vue séparée (« Retour à l'historique » retrouve la même période).
- **Détail d'une session** : tableau Heure | Niveau | Message, ligne non conforme affichée en brut. Ajout proposé et gardé : avertissement « Pas de ligne « Fin de session » » sur une session qui n'est pas en cours (plantage, arrêt du poste, ou session encore ouverte sur un autre poste).
- **Format** : en-tête en lignes d'évènement (`TITRE Début de session le JJ/MM/AAAA à HH:MM:SS`, puis `INFO` compte Windows, poste, mode, version de Flussi), fin `TITRE Fin de session`. `\r`, `\n` et tabulations d'un message remplacés par une espace. Compte : `os.userInfo().username` (repli `USERNAME`, puis `inconnu`), nettoyé pour le nom de fichier seulement (caractères interdits remplacés par `_`, points et espaces de fin retirés) ; poste : `os.hostname()`.
- **Session** (`src/main/services/journal/session.ts`) : écritures en file pour garder l'ordre ; tout le tampon est écrit en un seul ajout. L'en-tête passe par le tampon : « Réessayer » au démarrage ne le duplique pas et garde le même nom. `terminer()` n'ajoute « Fin de session » qu'une fois ; tout `ajouter` après une fin réussie est ignoré. L'état n'est « non enregistré » qu'après un échec (pas de clignotement du bandeau à chaque ligne) ; les abonnés ne sont notifiés qu'au changement.
- **Fermeture** : l'évènement `close` de la fenêtre est retenu le temps d'écrire « Fin de session » ; en échec, boîte modale « Réessayer » / « Quitter quand même » avec le nombre de lignes perdues. `app.close()` de Playwright passe par ce chemin sans blocage (vérifié par l'e2e).
- **Historique** (`historique.ts`) : seuls les fichiers au format Flussi sont gardés (journaux Lazarus RTF `AAAAMMJJ-HHMMSS.txt` et index ignorés) ; les copies de conflit sont recalculées sur ces seuls noms (point d'attention de l'item 3 : `…-cmathevon.txt` n'est plus pris pour une copie du journal Lazarus de la même seconde) ; dossier de mois absent = liste vide. Expression régulière du nom de session unique, dans `src/shared/schemas/journal.ts` (schéma zod de `journal:lire` et service).
- **IPC** : `journal:annees`, `journal:sessions` (`{ annee, mois }`), `journal:lire` (`AAAA/MM/nom`), `journal:etat`, entrées validées par zod (entrée invalide = appel rejeté), erreurs de stockage renvoyées typées ; `journal:etat-change` du main vers l'écran (`window.api.journal.surEtat`).
- **Points d'attention de l'item 3 traités** : types qui traversent l'IPC déplacés dans `src/shared/types/stockage.ts` (réexportés par l'adapter) ; noms réservés étendus (`COM0`–`COM9`, `LPT0`–`LPT9`, `COM¹²³`, `LPT¹²³`, `CONIN$`, `CONOUT$`) ; `classerParStat` n'ignore plus que `ENOENT`.
- **Cadre** : nouvelle prop `alerte` de `CadreApplication` (entre l'en-tête et l'écran, hors défilement) pour le bandeau « Journal non enregistré ».
- **Manques design relevés** (non inlinés) : `StatusBadge` n'accepte ni ton ni icône libres (badge local `Pastille` dans `pages/journal/`, candidat à un composant partagé) ; `Alert` sans variantes `warning` ni `error` (surcharges locales par tokens) ; `AlertTitle` rend un `h5` (saut de niveau après le `h1`) ; toujours pas de largeur maximale de colonne d'écran (1600 px). À traiter par `/design-system-adapt` ou `component-agent` si besoin.
- **Tests** : 2 418 unitaires (format, session, historique, IPC, schémas, stockage, composants de l'écran par `renderToStaticMarkup`), 5 e2e (historique avec journal Lazarus, copie de conflit et année vide ; fichier de session à la fermeture : sans BOM, CRLF, « Fin de session » ; un seul fichier de session après un second lancement). Non couverts automatiquement : boîtes natives (création impossible au démarrage, « Fin de session » impossible à la fermeture), bandeau en conditions réelles (aucun module n'écrit en cours de session avant l'item 7), fermeture de la session Windows avec Flussi ouvert (« Fin de session » peut manquer). L'e2e de l'historique peut échouer s'il tourne exactement au changement de mois.
- **Vérification manuelle** : tests validés par l'utilisateur (2026-10-14).
- **Revue d'item** (`OK POUR MERGE`, aucun bloquant) :
  - Si seule la lecture des années échoue, l'alerte d'erreur remplace le tableau du mois pourtant chargé (`src/renderer/src/hooks/use-historique-journal.ts`) ; `analyserNomSession` appelée deux fois par fichier (`src/main/services/journal/historique.ts`).
  - `Pastille` (`src/renderer/src/pages/journal/elements-tableau.tsx`) duplique la recette de `StatusBadge` ; `AlertTitle` rend un `h5` ; explication de « Copie de conflit » en `title`, inaccessible au clavier et aux lecteurs d'écran ; ligne `<tr>` cliquable non annoncée comme interactive (conforme au pattern `list`).
  - Non testés unitairement : replis de `identite.ts` ; hooks `use-chargement-stockage` (réponse périmée) et `use-etat-journal` (aucun environnement DOM de test, couverts par l'e2e).
  - Écriture partielle possible si un ajout est interrompu (coupure réseau pendant un `appendFile`) : les lignes du tampon sont alors réécrites, en double.
  - `terminer()` sans délai maximal : sur un partage qui ne répond plus, la fermeture attend le délai système sans retour visible.
  - Une entrée illisible (`stat` en erreur autre que `ENOENT`) rend tout le mois (ou la liste des années) indisponible : conséquence voulue de l'item 3 (pas de disparition silencieuse).
  - Session ouverte le dernier jour du mois et restée ouverte après minuit : rangée dans le mois de son démarrage, l'écran rouvert affiche le nouveau mois sans « En cours ».

**Point d'attention pour l'item 5** : au test pilote sur `P:`, observer la durée de fermeture (écriture de « Fin de session », `terminer()` sans délai maximal) et l'écran Journal sur le vrai dossier (une entrée OneDrive « à la demande » dont le `stat` échoue rendrait le mois indisponible). Voir « Revue d'item » ci-dessus.

**Point d'attention pour l'item 7** : premier module qui écrit en cours de session (« Mot de passe … remplacé ») : le service `parametres` reçoit la session du journal (`SessionEcriture.ajouter`, `src/main/services/journal/session.ts`, instance créée dans `src/main/index.ts`). Vérifier alors en conditions réelles le bandeau « Journal non enregistré » (dossier `Journal` rendu inaccessible pendant la session).

---

### 5. Premier installeur NSIS, testé par Intune sur le poste pilote

**Statut** : Terminé
**Pattern** : aucun

**Description** — Premier installeur NSIS, emballé en `.intunewin` et déployé par Intune sur un poste pilote avec un compte standard : installation, premier lancement, mise à jour, désinstallation. Question à lever : l'installeur non signé est-il bloqué par Defender, une règle ASR ou SmartScreen ? En cas de blocage, aucun achat : installation manuelle sur les postes, en confirmant l'alerte SmartScreen éventuelle.

**Pourquoi** : Flussi sera déployé par Intune ; le tester au plus tôt fixe le mode de déploiement de la v1.0.0.

**Décisions techniques** :

- Point de départ : `electron-builder.yml` déjà réglé (`perMachine`, `oneClick`, `/S`, `publish: null`).
- L'installeur crée `%ProgramData%\Flussi\` avec les droits de l'item 7 (administrateurs en écriture, utilisateurs en lecture), par un script NSIS (`build/installer.nsh`).
- L'installeur ne contient ni `config.json` (déployé à part par Intune) ni aucun secret.
- La désinstallation **conserve** `config.json` et `secrets.bin` : une mise à jour ou une réinstallation n'oblige pas à ressaisir les secrets.
- **Icône** : l'icône existante (`Transferts\Flussi\Flussi.ico` sur le partage SharePoint) est examinée, redessinée en vectoriel (SVG) aux couleurs de la charte (bleu foncé `#13295B`), puis convertie en `build/icon.ico` multi-tailles (16 à 256 px). Rendu validé par l'utilisateur avant la production de l'installeur.

**Poste pilote** :

- Poste de l'utilisateur, avec son compte utilisateur standard. L'emballage, le déploiement Intune et la saisie des secrets se font avec son compte administrateur dédié (il est le service informatique).
- `config.json` **de recette** : `FLUSSI_ENV=recette`, `STOCKAGE_DOSSIER_TRAVAIL=P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts\RECETTE`, avec ses dossiers `IN`, `OUT` et `Journal` (à créer). Le vrai `Transferts\Journal` n'est pas pollué avant l'archivage de la v1.0.0.

**Déroulé du test pilote** (résultats tracés dans les décisions d'implémentation) :

1. Emballer l'installeur en `.intunewin` (application Win32) : commande d'installation `/S`, commande de désinstallation, règle de détection.
2. Déployer sur le poste pilote ; noter toute réaction de Defender, d'une règle ASR ou de SmartScreen.
3. Premier lancement : titre, bandeau, configuration, `P:`, création du fichier de session.
4. Mise à jour : déployer un second build de version supérieure (`0.2.1-pilote`, version surchargée au build, sans toucher à `package.json`) ; vérifier que `config.json` est conservé. La conservation des secrets à la mise à jour est vérifiée à l'item 7.
5. Désinstallation : `config.json` conservé.
6. En cas de blocage : procédure d'installation manuelle documentée.

**Contraintes** :

- Un poste de développeur peut avoir des réglages plus souples (exclusions Defender, outils installés) : un test sans blocage ne garantit pas le même résultat chez les collègues. **Confirmer le déploiement sur le poste d'un collègue lors de la recette de la v0.6.0** (à reporter au backlog par `/item-finish`).

**Fichiers impactés** : `electron-builder.yml`, `build/installer.nsh`, `build/icon.ico` (et sa source SVG), éventuellement une documentation de déploiement dans `docs/`.

**Décisions d'implémentation** (2026-10-15) :

- **Icône** :
  - L'ancienne icône n'a qu'une taille (32 px) : « Flus » manuscrit blanc sur un carré bleu ciel, avec le « si » coupé.
  - La nouvelle (`build/icon.svg`) montre deux flèches pleines sur un carré arrondi `navy-700` : une blanche vers la droite (envoi chez MSP), une `blue-500` vers la gauche (retour des rejets). Pas de texte. Les coordonnées sont alignées sur une grille de 16 unités, pour des bords nets à 16 px.
  - Validée par l'utilisateur telle quelle : `blue-500` est conservé malgré un contraste d'environ 3:1 sur le fond.
  - `scripts/icone.mjs` (`node scripts/icone.mjs`, sans dépendance) relance l'Electron du projet, dessine le SVG dans un `<canvas>` à chaque taille (16 à 256 px) et écrit `build/icon.ico` : entrée 256 en PNG, autres tailles en BMP 32 bits. Le résultat est déterministe : même SHA-256 d'une exécution à l'autre.
- **`build/installer.nsh`** (macro `customInstall`, appelée après la copie des fichiers) :
  - crée `%ProgramData%\Flussi`, puis `icacls /reset` et `icacls /inheritance:r /grant:r` par SID (SYSTEM et Administrateurs en contrôle total, Utilisateurs en lecture) ;
  - en cas d'échec : code de sortie 10 à 13 par `SetErrorLevel` puis `Quit`, le chemin d'electron-builder, au lieu d'`Abort` prévu au plan. L'application reste alors installée, mais Intune voit l'échec, et une réinstallation rejoue la macro ;
  - compilation validée par le `makensis` 3.0.4.1 du cache d'electron-builder ; exécution non testée sur le poste de développement.
- **Version du pilote** : surchargée au build (`-c.extraMetadata.version=0.2.0-pilote`, puis `0.2.1-pilote`), sans toucher à `package.json`. Sous PowerShell 5.1, l'argument doit être entre guillemets, sinon il est coupé au point (`-c .extraMetadata…`) et electron-builder cherche un fichier de configuration de ce nom.
- **Premier packaging** (2026-10-15, PowerShell administrateur) : `release\Flussi-0.2.0-pilote-setup.exe` (113 Mo) produit sans erreur, `nsis.include` pris en compte. Les lignes « signing with signtool.exe » du journal n'impliquent aucune signature : l'installeur et `Flussi.exe` sont non signés (`Get-AuthenticodeSignature` : `NotSigned`). L'avertissement « author is missed in the package.json » laisse vides l'éditeur dans « Applications installées » et la société dans les propriétés des fichiers ; sans effet sur le fonctionnement.
- **Détection Intune** : clé `HKLM\…\Uninstall\f4fbc099-6400-53e0-b346-884096add07f` (UUID v5 de l'`appId`, fixe), valeur `DisplayVersion`.
- **Dépôt de `config.json`** :
  - par une seconde application Win32 « Flussi — configuration recette », qui dépend de l'application Flussi, avec `copy` et `del` par `cmd.exe` ;
  - mécanisme pérenne : en v1.0.0, une application « configuration production » remplace celle de recette par le remplacement Intune (supersedence) ;
  - paquet versionné dans `deploiement/intune/config-recette/`, validé par `src/main/adapters/config/deploiement.test.ts` (ajout au plan : une clé mal tapée est refusée avant le déploiement) ;
  - **à reporter au backlog (v1.0.0)** : la détection par présence du fichier ne redéploie pas un `config.json` modifié. Il faudra une détection par empreinte SHA-256.
- **Solution de sécurité du poste** :
  - son contrôle des applications (règle « Block rare and unknown files in Temp folder ») a bloqué l'exécution de l'installeur NSIS d'essai, lancé depuis un dossier temporaire (2026-10-15) ;
  - l'installation par Intune part de `C:\Windows\IMECache`, hors dossier temporaire ;
  - mais la mise à jour lance l'ancien désinstalleur depuis `$PLUGINSDIR` (dossier temporaire, avec repli sur place par electron-builder si le lancement échoue), et la désinstallation recopie le désinstalleur dans le dossier temporaire ;
  - ces trois moments sont ajoutés à la liste de contrôle du pilote.
- **Préparation du pilote** (2026-10-15) :
  - dossiers `RECETTE\IN`, `RECETTE\OUT` et `RECETTE\Journal` créés sur `P:` ;
  - outil `IntuneWinAppUtil.exe` téléchargé depuis le dépôt GitHub de Microsoft dans `C:\Intune\outil\` (signature Microsoft valide) ;
  - paquets `C:\Intune\paquets\Flussi-0.2.0-pilote-setup.intunewin` et `config.intunewin` produits.
- **Première installation par Intune** (2026-10-15, 12h44, journal `AppWorkload.log`) :
  - installeur lancé sous SYSTEM depuis `C:\WINDOWS\IMECache\…`, terminé en 24 s avec le code de sortie 0 ;
  - **aucun blocage** du contrôle des applications, de Defender ni d'ASR ;
  - droits de `C:\ProgramData\Flussi` conformes (`icacls` : Utilisateurs `(OI)(CI)(RX)`, Administrateurs et Système `(OI)(CI)(F)`, aucune entrée héritée) ;
  - clé de désinstallation conforme (`DisplayVersion` `0.2.0-pilote`, `QuietUninstallString` `"C:\Program Files\Flussi\Uninstall Flussi.exe" /allusers /S`, identique à la commande de désinstallation prévue).
  - Intune a pourtant signalé un **échec** : la valeur de la règle de détection commençait par une tabulation (`DetectionValue: \t0.2.0-pilote`), reprise par copier-coller depuis un tableau. La comparaison « Égal à » échouait donc. Leçon reportée dans la procédure : saisir les valeurs à la main dans le portail Intune.
- **Configuration déployée par Intune** (2026-10-15, après correction de la règle) :
  - `C:\ProgramData\Flussi\config.json` est identique au fichier du dépôt (même SHA-256) ;
  - droits hérités `(I)` conformes ;
  - écriture refusée au compte standard, que ce soit la création d'un fichier ou l'ajout à `config.json` ;
  - raccourcis « Flussi » créés dans le menu Démarrer commun et sur le bureau public.
- **Premier lancement installé** (2026-10-15, compte standard), conforme et sans réaction de la solution de sécurité :
  - titre « Flussi — Recette », bandeau Recette, « Flussi 0.2.0-pilote » dans l'en-tête, nouvelle icône ;
  - écran Journal avec la session en cours en tête ;
  - fermeture en une fraction de seconde ;
  - fichier de session `RECETTE\Journal\2026\10\20261015-125603-c.mathevon.txt` : UTF-8 sans BOM, CRLF, en-tête complet (compte, poste, mode `recette`, version `0.2.0-pilote`), ligne « Fin de session » présente.
- **Tests de `config.json` sur l'application installée** (2026-10-15, point d'attention de l'item 2), tous conformes :
  - fichier réenregistré par PowerShell 5.1 avec BOM (`EF BB BF` vérifié) : démarrage normal ;
  - fichier absent : refus « fichier introuvable, il est obligatoire » ;
  - JSON invalide : refus « JSON invalide » ;
  - fichier rétabli : démarrage normal ;
  - un fichier de session pour chacun des deux démarrages, aucun pour les refus.
- **Mise à jour par Intune vers `0.2.1-pilote`** (2026-10-15, Flussi ouvert) :
  - installeur lancé à 13:20:08 et terminé à 13:20:45 avec le code 0, nouvelle version détectée ;
  - aucune alerte de la solution de sécurité, y compris pour le désinstalleur de l'ancienne version, copié dans le dossier temporaire ;
  - `C:\Program Files\Flussi` ne contient que les fichiers de la nouvelle version ;
  - `config.json` est conservé (non modifié depuis 13:01) et les droits du dossier sont inchangés.
  - Comme prévu, **Flussi ouvert a été coupé par l'installeur** : la session de 13:19:40 n'a pas de ligne « Fin de session ».
  - **À reporter au backlog, avant la v0.5.0 (premiers dépôts MSP)** : une mise à jour poussée pendant un dépôt couperait l'opération en cours. Piste : macro NSIS `customCheckAppRunning` qui sort avec le code 1618 (« une autre installation est en cours », que Intune retente plus tard) si Flussi est ouvert, au lieu de le fermer de force.
- **Relance après mise à jour** : en-tête et fichier de session en `0.2.1-pilote`.
- **Désinstallation, premier essai** (2026-10-15, 13:34) : les affectations ont été inversées, la configuration est passée en « Désinstaller » et Flussi est resté « Obligatoire ». La commande de désinstallation de la configuration (`cmd.exe /c del …`) a donc supprimé `config.json`, comme prévu pour cette commande. La procédure le signale désormais.
- **Désinstallation de Flussi par Intune** (2026-10-15, 13:39) :
  - désinstalleur lancé avec le code de sortie 0 (il rend la main aussitôt, après s'être recopié dans le dossier temporaire), puis Flussi n'est plus détecté 16 s plus tard : statut Intune correct ;
  - aucune alerte de la solution de sécurité ;
  - `C:\Program Files\Flussi`, les deux raccourcis et la clé de désinstallation sont supprimés ;
  - `C:\ProgramData\Flussi` est conservé, avec ses droits. `config.json` n'y était plus à cause du premier essai.
- **Désinstallation, essai final** (2026-10-15, vers 13:55) :
  - une affectation contradictoire (configuration « Obligatoire », Flussi « Désinstaller ») a d'abord fait réinstaller Flussi par la dépendance (installation automatique), puis recopier `config.json` ;
  - après retrait de l'affectation de la configuration, Flussi a été désinstallé : dossier, raccourcis et clé de registre supprimés ;
  - **`config.json` conservé**, identique au fichier du dépôt (même SHA-256).
  - À retenir pour la v1.0.0 : la dépendance avec installation automatique l'emporte sur une affectation « Désinstaller » de Flussi. Pour retirer Flussi d'un poste, retirer d'abord l'affectation de la configuration.
- **Non observés pendant le pilote** : `P:` monté en retard, vrai verrou OneDrive et vraie copie de conflit (points d'attention de l'item 3), à observer quand l'occasion se présente.
- **Procédure et liste de contrôle** : `docs/deploiement-intune.md`. Retour d'expérience réutilisable hors du projet : `docs/guide-intune-win32.md`. `CLAUDE.md` mis à jour (structure de `build/`, `deploiement/`, `scripts/icone.mjs`, documents de déploiement ; distribution).
- **Tests** : 2 421 unitaires (dont `deploiement.test.ts`).
- **Revue d'item** (`OK POUR MERGE`, aucun bloquant) :
  - Échec d'`icacls` (codes 12, 13) : `customInstall` est appelée après l'écriture de la clé de désinstallation. Intune voit l'échec, puis détecte `DisplayVersion` à la vérification suivante, considère Flussi installé et ne rejoue plus l'installeur. Le dossier garde alors les droits par défaut de `ProgramData`, où les utilisateurs peuvent écrire. Risque moyen (échec improbable), mais l'item 7 repose sur ces droits.
  - `icacls /reset` sans `/T` : un fichier déjà présent avec des droits explicites les conserve.
  - `deploiement.test.ts` recopie la lecture de `chargerInstallee` (BOM, `JSON.parse`, objet attendu) au lieu de la partager, et sa regex contient un BOM littéral invisible (`lecture.ts` écrit `\uFEFF`).
  - `scripts/icone.mjs` laisse son profil jetable `%TEMP%\flussi-icone`.
  - `author` absent de `package.json` : éditeur vide dans « Applications installées » et dans les propriétés des fichiers.

**Point d'attention pour l'item 7** :

- **Droits de `%ProgramData%\Flussi`, dont dépend `secrets.bin`** (`build/installer.nsh`, fichier impacté par l'item 7) :
  - en cas d'échec de la pose des droits, supprimer la clé de désinstallation dans la macro `flussiEchecInstallation` (`DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"`), pour qu'Intune ne détecte rien et retente l'installation ;
  - évaluer `/T` sur `icacls /reset`.
- **Lecture de `config.json`** (`src/main/adapters/config/`, touché par l'item 7) : extraire de `lecture.ts` une fonction pure d'analyse du texte (BOM, JSON, objet attendu), utilisée par `chargerInstallee` et par `deploiement.test.ts`, et remplacer le BOM littéral de la regex du test par `\uFEFF`.
- **Test sur le poste pilote** :
  - les deux applications Intune sont aujourd'hui retirées du poste (Flussi en « Désinstaller », configuration sans affectation) : repasser Flussi puis la configuration en « Obligatoire » avant la saisie des secrets ;
  - pour retirer Flussi plus tard, toujours retirer d'abord l'affectation de la configuration (`docs/deploiement-intune.md`, § 6) ;
  - `C:\ProgramData\Flussi\config.json` est resté sur le poste après le pilote.

---

### 6. Écran Paramètres, en lecture seule

**Statut** : À faire
**Pattern** : custom

**Description** — Écran de diagnostic : mode actif, dossiers de travail et version, en lecture seule. Il accueille aussi la section administrateur des secrets (item 7) et, en v0.6.0, le bouton « Tester les connexions ».

**Pourquoi** : savoir d'un coup d'œil où Flussi lit et écrit, et dans quelle version il tourne. La surcharge des dossiers par l'utilisateur, prévue à l'origine, est abandonnée : le chemin de production est commun au service et se corrige une fois dans `config.json`. Une surcharge locale enverrait en silence le journal et les fichiers d'un poste ailleurs, alors que le journal partagé fonde l'anti-doublon de la v0.5.0.

**Écran sur-mesure** : lancer `/design-screen-prompt` **avant** `/item-start` de cet item. **Une seule maquette** couvre l'écran Paramètres complet, section administrateur des secrets de l'item 7 comprise. `/item-start` bloque tant que l'écran n'a pas été produit.

**Décisions techniques** :

- Contenu : mode ; racine de travail et chemins `IN`, `OUT`, `Journal` ; version (partie de l'item 9 de la roadmap).
- Pour chaque valeur, **son origine** : valeur par défaut du code, `config.json` ou `.env`.
- Bouton « Ouvrir dans l'Explorateur » à côté de chaque dossier (`shell.openPath`, appelé par le main).
- Pas d'état des dossiers : un dossier inaccessible empêche le démarrage (item 3). Le test à la demande arrive en v0.6.0 (« Tester les connexions »).

**Tests** : unitaires sur la configuration résolue avec ses origines ; e2e de l'écran.

**Fichiers impactés** : `src/main/services/parametres/`, `src/main/ipc/parametres/`, `src/preload/index.ts`, `src/renderer/src/services/parametres.ts`, `src/renderer/src/hooks/`, `src/renderer/src/pages/` (Paramètres), `design/handoff/` (maquette), tests unitaires et e2e, `CLAUDE.md` (écart 4).

---

### 7. Secrets techniques : saisie par l'administrateur, chiffrement pour tout le poste

**Statut** : À faire
**Pattern** : custom

**Description** — Secrets techniques jamais saisis par les utilisateurs : l'administrateur les renseigne une fois après le déploiement (mots de passe FTP IGA et SFTP MSP au clavier, clé `.ppk` FileZilla importée par un sélecteur de fichier, convertie avec PuTTYgen si elle est au format PPK v3). Stockage chiffré, jamais affiché, utilisable par tous les comptes du poste. Pas de procédure de rotation.

**Pourquoi** : question de sécurité importante.

**Écran** : section administrateur de l'écran Paramètres, sur la maquette commune produite avant l'item 6.

**Décisions techniques** :

- **DPAPI au niveau de la machine** (pas `safeStorage` d'Electron, qui chiffre pour un seul compte Windows : un secret saisi par l'administrateur serait illisible des utilisateurs). Fichier `%ProgramData%\Flussi\secrets.bin`, à côté de `config.json`. Tout compte du poste peut déchiffrer ; le fichier copié sur une autre machine est illisible. Limite assumée : une personne qui exécute du code sur le poste peut lire les secrets, que les utilisateurs du poste ont de toute façon le droit d'utiliser.
- **Mise en œuvre de DPAPI** choisie à l'implémentation : petit module natif ou PowerShell (`ProtectedData`, portée `LocalMachine`). Vérifier que la solution fonctionne sur un poste géré par Intune (restrictions possibles de PowerShell) et avec Electron 44.
- **Droits** : `%ProgramData%\Flussi\` posé par l'installeur (item 5), administrateurs en écriture, utilisateurs en lecture. L'administrateur lance Flussi « en tant qu'administrateur » pour saisir les secrets. Sans ces droits, la section est en lecture seule, avec l'explication.
- **Secrets stockés** : mot de passe FTP IGA, mot de passe SFTP MSP, **contenu** de la clé privée MSP (pas son chemin). Les comptes (`IGA_FTP_USER`, `MSP_SFTP_USER`) restent dans `config.json`. Un secret placé dans `config.json` est refusé (item 2).
- **Les secrets ne vont jamais vers l'écran** : mot de passe envoyé de l'écran vers le main en écriture seule, champ vidé après l'enregistrement, aucun canal de relecture. Clé choisie dans un sélecteur ouvert par le main, qui lit le fichier lui-même. L'écran n'affiche que « Renseigné le JJ/MM/AAAA » ou « Non renseigné ». Remplacer un secret, c'est le saisir à nouveau.
- **Format de la clé** : PPK v2 et OpenSSH acceptés. PPK v3 refusée avec la marche à suivre dans PuTTYgen. Clé chiffrée par une phrase secrète refusée avec un message clair (en-tête PPK `Encryption` différent de `none`) : la clé FileZilla n'en a vraisemblablement pas, pas de quatrième secret (YAGNI). Contrôle sur l'en-tête du fichier, sans ajouter `ssh2` (la connexion arrive en v0.5.0).
- **Dev** : secrets lus dans le `.env` (`IGA_FTP_PASSWORD`, `MSP_SFTP_PASSWORD`, `MSP_SFTP_CLE_PRIVEE_CHEMIN`), jamais dans `secrets.bin`. L'application installée ne lit jamais le `.env`.
- **Secret manquant** : l'application démarre, Paramètres signale « Non renseigné ». Le refus intervient au moment de se connecter (v0.4.0, v0.5.0).
- **Journal** : chaque remplacement est tracé, sans la valeur (« Mot de passe SFTP MSP remplacé »).
- Le chiffrement étant par machine, les secrets de production sont saisis sur chaque poste, y compris celui de l'utilisateur.

**Test sur le poste pilote** : déployer une mise à jour par Intune après la saisie des secrets, et vérifier qu'ils sont conservés et toujours lisibles par le compte utilisateur standard.

**Tests** : unitaires (refus des formats de clé, absence de secret dans les réponses IPC et dans le journal) ; e2e de la section en lecture seule sans droits administrateur.

**Fichiers impactés** : `src/main/adapters/config/` (lecture et écriture des secrets), `src/main/services/parametres/`, `src/main/ipc/parametres/`, `src/preload/index.ts`, `src/shared/schemas/`, section administrateur de la page Paramètres, `build/installer.nsh` (droits), tests unitaires et e2e.

---

## Items retirés (YAGNI)

Aucun item retiré. Les 11 items de la roadmap sont regroupés en 7 :

- « `config.json` absent, partiel ou illisible, ou `FLUSSI_ENV` vide ou invalide : refus de démarrer » fusionné dans l'item 2 (configuration) : même adapter, même validation zod, seul le cas d'erreur change.
- « Instance unique » fusionné dans l'item 2 : une quinzaine de lignes au cœur de la séquence de démarrage.
- « `P:` indisponible ou instable » fusionné dans l'item 3 (stockage) : ce sont les cas d'erreur du même adapter.
- « Version de l'application visible » réparti : en-tête de la fenêtre (item 2), en-tête de chaque fichier de session (item 4), écran Paramètres (item 6).
- « Module `Parametres` » réduit à un écran en lecture seule : la surcharge des dossiers de travail dans `%APPDATA%\Flussi\` est abandonnée (risque de journal éclaté entre postes, correction unique dans `config.json`).

## Ordre de réalisation

| # | Item | Pattern | Justification |
|---|------|---------|---------------|
| 1 | Dependabot encadré | aucun | Indépendant et rapide. Règle tout de suite les alertes ouvertes et protège le dépôt pendant toute la suite. |
| 2 | Configuration et démarrage de l'application | aucun | Socle : chaque item lit la configuration. Pose la séquence de démarrage et le cadre des écrans. Risque n° 1 : un test sur la production par erreur. |
| 3 | Adapter `stockage` et `P:` instable | aucun | Dépend de 2 (chemins). Le journal ne peut pas écrire sans lui. Les erreurs de `P:` sont le second risque de terrain. |
| 4 | Module `Journal` : fichier de session et historique | list | Dépend de 2 (mode, version) et de 3 (ajout seul, liste). Premier écran, qui valide le cadre de l'application. |
| 5 | Premier installeur NSIS, testé par Intune sur le poste pilote | aucun | Avant Paramètres et Secrets, pour savoir au plus tôt si Defender, une règle ASR ou SmartScreen bloquent. Le premier lancement vérifie déjà configuration, `P:` et journal. Crée `%ProgramData%\Flussi\` avec les bons droits. |
| 6 | Écran Paramètres, en lecture seule | custom | `/design-screen-prompt` avant l'item, maquette commune avec l'item 7. Dépend de 2 (configuration résolue et origines). |
| 7 | Secrets techniques | custom | S'appuie sur la section administrateur de l'écran 6 et les droits posés par l'installeur (5). Seul point technique incertain (DPAPI machine sur un poste Intune), vérifié par une mise à jour Intune sur le poste pilote. |
