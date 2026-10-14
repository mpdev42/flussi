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

**Statut** : À faire
**Pattern** : aucun

**Description** — Adapter `config` : mode `recette`/`prod`, refus de démarrer sur une configuration invalide, instance unique, séquence de démarrage et cadre de l'application (en-tête, navigation, bandeau Recette, titre, version). Fusion des items 1, 2 et 8 de la roadmap, plus une partie de l'item 9 (version dans l'en-tête).

**Pourquoi** : savoir à tout moment dans quel mode tourne Flussi, et rendre impossible un test sur la production par erreur.

**Décisions techniques — sources de la configuration** :

- **Application installée** : valeurs par défaut du mode dans le code, puis `%ProgramData%\Flussi\config.json` (déployé par Intune, en lecture seule pour les utilisateurs). `config.json` est obligatoire. Le `.env` n'est jamais lu.
- **Dev** (`!app.isPackaged`, y compris les tests e2e qui lancent `out/`) : valeurs par défaut du mode, puis variables d'environnement du processus, complétées par le `.env` (lu par `process.loadEnvFile` de Node, sans dépendance ajoutée). **`%ProgramData%\Flussi\config.json` n'est jamais lu en dev** : sur un poste qui porte aussi Flussi installé, une clé absente du `.env` serait sinon reprise en silence de la production.
- **En dev, le mode `prod` est refusé** : l'application refuse de démarrer si `FLUSSI_ENV=prod`. Le travail réel en production se fait avec Flussi installé.
- **Le mode n'est pas modifiable dans l'interface** : il vient seulement de `config.json` ou du `.env`. Pas de surcharge dans `%APPDATA%\Flussi\` (ni pour le mode, ni pour les dossiers).
- Valeurs par défaut de `prod` : racine de travail `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts` (dossiers `IN`, `OUT`, `Journal` dérivés, voir item 3). **Aucun dossier par défaut en `recette`** : ils sont obligatoires dans le `.env` (dev) ou dans `config.json`. Les valeurs par défaut des services VEOS, IGA et MSP arrivent avec leurs versions (v0.4.0, v0.5.0).
- Format de `config.json` : clés à plat, mêmes noms que les variables (`{ "FLUSSI_ENV": "prod", "STOCKAGE_DOSSIER_IN": "…" }`). BOM UTF-8 accepté (PowerShell 5.1 en écrit un).
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

---

### 3. Adapter `stockage` et `P:` instable

**Statut** : À faire
**Pattern** : aucun

**Description** — Emplacements logiques `in`, `out`, `journal` vers des dossiers configurables, et comportement sûr quand `P:` est indisponible ou instable (non monté, déconnecté, verrou OneDrive `EBUSY`/`EPERM`, copies de conflit). Jamais d'échec silencieux ni d'écrasement. Fusion des items 3 et 4 de la roadmap.

**Pourquoi** : indispensable pour conserver les fichiers.

**Décisions techniques** :

- `STOCKAGE_DOSSIER_TRAVAIL` est la racine : `IN`, `OUT` et `Journal` valent par défaut `{TRAVAIL}\IN`, `{TRAVAIL}\OUT`, `{TRAVAIL}\Journal`, chacun surchargeable séparément (`STOCKAGE_DOSSIER_IN`…) dans `config.json` ou le `.env`.
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

---

### 4. Module `Journal` : fichier de session et historique

**Statut** : À faire
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

---

### 5. Premier installeur NSIS, testé par Intune sur le poste pilote

**Statut** : À faire
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
- `config.json` **de recette** : `FLUSSI_ENV=recette`, dossiers `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts\RECETTE\IN`, `OUT` et `Journal` (à créer). Le vrai `Transferts\Journal` n'est pas pollué avant l'archivage de la v1.0.0.

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
