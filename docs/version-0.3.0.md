# Version 0.3.0 — Écran AC056

**Objectif** : le service peut charger, contrôler et corriger un fichier AC056 local. C'est l'écran qui décidera de l'acceptation, face à la grille de Lazarus. Le risque principal visé est la divergence silencieuse de la parité AC056 (pre-mortem, échec le plus dangereux) : l'écran s'appuie sur le domaine de la v0.1.0 et ne réécrit jamais un fichier sans que la différence soit visible.

**Cadrage** (2026-10-16) : les 5 items de la roadmap sont conservés. Ils partagent un seul écran : une maquette unique `design/handoff/ac056.tsx`, produite par `/design-screen-prompt` **avant l'item 1**, couvre l'écran complet (variantes fichier VEOS et fichier de rejet, navigation, liste récapitulative des erreurs, panneau du journal en direct). Les items 2 à 5 la reprennent sans nouveau prompt d'écran.

**Écarts avec `CLAUDE.md` décidés au cadrage**, à reporter dans `CLAUDE.md` à la fin de l'item concerné :

| # | Écart | Item |
|---|---|---|
| 1 | Écran AC056 en pattern `custom`, et non `list+form` : navigation sur quatre niveaux, liste des erreurs et journal en direct sur le même écran. `list+form` reste la référence visuelle des éléments de base | 1 |
| 2 | Enregistrement possible même si le fichier contient encore des erreurs ; le blocage se fait au dépôt MSP (v0.5.0). `CLAUDE.md` dit « enregistrement si le fichier ne contient plus d'erreur » | 3 |
| 3 | Adapter `stockage` : écriture par remplacement (fichier temporaire puis renommage) en plus de l'ajout seul, et création d'un sous-dossier de copies des originaux dans `IN` (aujourd'hui, seuls les sous-dossiers `Journal\AAAA\MM` sont créés) | 3 |
| 4 | Codes `ERR028` et suivants, propres à Flussi, au-delà de la table de Lazarus | 4 |

---

### 1. Chargement d'un fichier AC056, VEOS ou rejet

**Statut** : Terminé
**Pattern** : custom

**Description** — Écran AC056 : liste des fichiers des dossiers `IN` et `OUT`, ouverture d'un fichier issu de VEOS (UTF-8) ou d'un fichier de rejet MSP (ANSI), lecture et contrôle par le domaine AC056, trace au journal et panneau du journal en direct dans la fenêtre principale.

**Pourquoi** : il faut pouvoir lire le contenu des deux types de fichiers.

**Préalable** : `/design-screen-prompt` pour l'écran AC056 complet (voir « Cadrage »). `/item-start` bloque tant que `design/handoff/ac056.tsx` n'existe pas.

**Constat Lazarus** (`fmain.pas:1375-1400`, `ChargerFichierAc056` `fmain.pas:2697-2766`) :

- Boîte Windows « Ouvrir » qui démarre dans le dossier `Transferts`, filtre `*.txt`, n'importe quel emplacement.
- Fichier de rejet reconnu au préfixe du nom `AC056COUR_REJ_`, pas au contenu.
- Un rejet n'est pas contrôlé ; un fichier VEOS est entièrement contrôlé au chargement.
- Le titre de la fenêtre affiche le chemin du fichier ouvert.
- Journal : « Charger » (titre), « Le fichier … a été correctement chargé. » (succès), exception en erreur.
- Fichier contenant des lignes vierges : réenregistré aussitôt, « Le fichier originel contenait des lignes vierges. Elles ont été supprimées. »

**Décisions techniques** :

- **Choix du fichier par une liste intégrée** des fichiers de `IN` et de `OUT`, lue par l'adapter `stockage` (`lister`, `lire`). Aucun chemin Windows ne circule vers l'écran : l'écran envoie un emplacement logique et un nom, validés par zod. La solution reste valable au passage à SharePoint. Pas de boîte « Ouvrir » (divergence).
- **Fichier de rejet reconnu au préfixe `AC056COUR_REJ_`** (parité), quel que soit le dossier. Tout autre fichier est un fichier VEOS. La provenance est passée au domaine (`lireAc056(octets, provenance)`), qui ne lit pas de nom de fichier.
- **Autre fichier alors que des modifications ne sont pas enregistrées** : confirmation « Abandonner les modifications ? » (divergence : Lazarus ne demande rien).
- **Taille** : fichiers courants autour de 600 Ko ; un fichier de 4 Mo a été constaté il y a plusieurs années (environ 5 500 lignes). L'écran reste fluide jusqu'à 4 Mo : listes affichées par morceaux, jamais 5 500 lignes rendues d'un coup. La lecture d'un fichier synthétique de 3,8 Mo prend environ 0,5 s (mesure de la v0.1.0).
- **Journal** : chargement tracé (nom du fichier, résultat, nombre d'erreurs), jamais de valeur AC056. Panneau du journal en direct dans la fenêtre principale (« important que l'utilisateur voie ce qui se passe »).

**Décisions du démarrage de l'item** (2026-10-19, `/item-start`) :

- **Journal de la session : 4e panneau**, colonne à droite du cadre de l'application, visible sur tous les écrans, comme le panneau `rmJournal` de Lazarus quelle que soit l'opération qui l'alimente (VEOS, IGA, MSP, AC056). Composant commun (`component-agent`), largeur 288 px. Divergence avec la maquette `ac056.tsx` (barre repliable en bas de l'écran AC056).
- **Lecture, contrôle et trace dans le main** : l'écran reçoit le fichier analysé (fichier et anomalies, sans chemin Windows) et le garde pour le contrôle à la sortie d'un champ de l'item 2. Pas de canal par lequel l'écran écrirait lui-même au journal.
- **Ctrl-Z (0x1A)** : vérifié dans FPC, `CtrlZMarksEOF = true` sous Windows (`rtl/win/syswinh.inc`) ; `ReadLn` s'arrête au premier 0x1A et `EOF` devient vrai. Un ou plusieurs 0x1A en fin de fichier : ignorés, anomalie non bloquante « Caractère de fin de fichier (Ctrl-Z) : il sera supprimé à l'enregistrement » pour un fichier VEOS, ignorés en silence dans un rejet. Un 0x1A suivi d'autres octets reste une anomalie bloquante (divergence : Lazarus tronque le fichier en silence au premier 0x1A).
- **Titre de la fenêtre inchangé** (« Flussi — Recette » / « Flussi ») : le nom du fichier n'apparaît que dans la barre de fichier (divergence : Lazarus ajoute le chemin au titre).
- **Confirmation « Abandonner les modifications ? » reportée à l'item 3** : aucune modification n'est possible avant.
- **Tokens de design ajoutés de façon ciblée** par `component-agent` (`tailwind.config.js`, `utils.ts`), sans `/design-system-adapt` (pas de mode ciblé, n'écrit ni `utils.ts` ni `DESIGN.md`) ; `DESIGN.md` inchangé.
- **Après ouverture**, l'item 1 affiche la barre de fichier et les alertes ; les trois colonnes de la maquette arrivent aux items 2 et 5.

**Repris du backlog** :

- Au démarrage de la version, avant de coder : créer `ac056-agent` (format AC056 et parité Lazarus, prévu au cadrage, jamais créé) — `.claude/agents/`, `docs/project-description.md` (v0.1.0, audit de finalisation)
- Aucune écriture au chargement : les lignes vides restent signalées (anomalie non bloquante) et sont supprimées à l'enregistrement. Divergence 2 de la v0.1.0 confirmée — `src/shared/domain/ac056/lecteur.ts` (v0.1.0, item 3)
- Ctrl-Z (0x1A) en fin de fichier : vérifier sur le corpus et dans la RTL FPC (`ReadLn`), puis l'ignorer en fin de fichier comme Lazarus (pas de ligne bloquante, pas de recopie à l'enregistrement). Critère : le fichier doit pouvoir être traité par MSP comme celui de Lazarus — `src/shared/domain/ac056/decoupage.ts` (v0.1.0, revue release)
- Journal en direct dans la fenêtre principale (panneau `rmJournal` de Lazarus) : l'écran AC056 est le premier module qui produit de vrais évènements — `src/renderer/src/pages/`, `src/main/services/journal/` (v0.2.0, item 4)
- Garde-fou ESLint sur la pureté du domaine (`no-restricted-imports` sur `node:*`, `electron`, `vitest`, `@shared/test/*` ; `no-restricted-globals` sur `Buffer` et `process`), à poser avant de toucher au domaine — `eslint.config.js` (v0.1.0, revue release)
- Tokens de design manquants, par `/design-system-adapt`, avant de construire l'écran : couleurs sémantiques `bg-header` et `text-on-brand`, largeur maximale d'écran 1600 px, `ls-tight` (-0.01em) des titres, `tracking-[0.01em]` des légendes — `tailwind.config.js`, `DESIGN.md`, `src/renderer/src/lib/utils.ts` (v0.2.0, item 2)
- Niveau de titre réglable pour `AlertTitle` (`h5` aujourd'hui, saut de niveau après le `h1`), par `component-agent` — `src/renderer/src/components/ui/alert.tsx` (v0.2.0, item 4)
- Cadre des écrans : défilement de `<main>` conservé d'un écran à l'autre, focus perdu aux changements de vue, navigation active pendant « Enregistrement… », deux champs au même nom accessible « Nouveau mot de passe », ligne `<tr>` cliquable sans rôle — `src/renderer/src/components/cadre-application.tsx`, `src/renderer/src/pages/` (v0.2.0, revue release)
- Textes : `accueil.tsx` cite encore le journal parmi les fonctions à venir (à mettre à jour aussi pour l'arrivée de l'écran AC056) ; `AIDE_CLE` ne mentionne ni PEM ni la limite RSA/DSA — `src/renderer/src/pages/accueil.tsx`, `src/renderer/src/pages/parametres/textes-secrets.ts` (v0.2.0, revue release)

**Fichiers impactés** : `src/main/ipc/ac056/`, `src/main/services/ac056/`, `src/main/services/journal/`, `src/preload/index.ts`, `src/shared/schemas/`, `src/shared/types/`, `src/shared/domain/ac056/decoupage.ts`, `src/renderer/src/pages/ac056/` (nouveau), `src/renderer/src/hooks/`, `src/renderer/src/services/ac056.ts` (nouveau), `src/renderer/src/components/cadre-application.tsx`, `src/renderer/src/components/ui/alert.tsx`, `src/renderer/src/pages/accueil.tsx`, `src/renderer/src/pages/parametres/textes-secrets.ts`, `tailwind.config.js`, `src/renderer/src/lib/utils.ts`, `eslint.config.js`, `.claude/agents/ac056-agent.md` (nouveau), `e2e/specs/`.

**Décisions de l'implémentation** (2026-10-19) :

- **Domaine** : `provenanceDepuisNom` et `PREFIXE_FICHIER_REJET` (`provenance.ts`, préfixe sensible à la casse comme `StartsWith`) ; `analyserAc056` (`analyse.ts`) = lecture et contrôle, anomalies triées, comptes `erreurs`, `nonBloquantes`, `structure`, `lignesRejetees`, résultat clonable pour l'IPC ; anomalie non bloquante `ctrl-z-final` ; `CODES_STRUCTURE` dans `structure.ts`. Corpus : aucun fichier ne contient 0x1A (IN 9, OUT 3, PIEGES 1, MODIFIES 3) : la règle n'est couverte que par des fichiers synthétiques.
- **Garde-fou ESLint du domaine** : tous les modules Node (`builtinModules` et `node:*`), `electron`, `vitest`, `@shared/test/*`, `koffi` et `@primno/dpapi` (liste `MODULES_NATIFS_MAIN` partagée avec le bloc renderer/preload), import dynamique, globales `Buffer` et `process`. Les `*.test.ts` du domaine en sont exclus.
- **Stockage** : `lister(emplacement, sousDossier?, { avecInfos })` ; taille et date (ISO) seulement avec l'option, utilisée par le seul service Ac056 (sinon un `stat` par journal Lazarus à la racine de `Journal` sur `P:`). Un `stat` en échec donne taille et date `null` sans faire échouer la liste.
- **Service Ac056** (`ac056:lister`, `ac056:ouvrir`) : liste filtrée par le schéma du nom (tout fichier listé peut être ouvert ; règle `..` retirée du schéma, inutile sans séparateur), triée du plus récent au plus ancien ; erreurs renvoyées `{ code, message }` sans chemin (message fabriqué d'après le code). Journal non attendu (`void`) : la réponse à l'écran ne dépend pas de l'écriture sur `P:` ; l'ordre est garanti par la session. Messages : `TITRE` « Charger » ; `SUCCES` « Fichier NOM chargé : aucune erreur / N erreurs[, M anomalies non bloquantes] » ou « … N lignes rejetées » ; `ERREUR` « Fichier NOM mal formé : relancez l'export VEOS » ; `ERREUR` « Fichier NOM illisible : fichier vide » (seule ligne pour un fichier vide) ; `ERREUR` « Fichier NOM non chargé : {cause} ».
- **Journal en direct** : la session garde ses lignes (`LigneJournalSession`, avec un rang) ; canaux `journal:lignes-session` et `journal:ligne-ajoutee` (main vers écran) ; hook `useJournalSession` (fusion par rang) ; panneau `JournalSession` dans la colonne `journal` du cadre. Libellés des niveaux « Titre, Info, Succès, Erreur » (module commun avec l'écran Journal, `lib/niveaux-journal.ts`) et une icône par niveau, contrairement à la maquette (majuscules, icônes sur Succès et Erreur seulement).
- **Cadre** : colonne du journal, verrou de navigation `useVerrouNavigation` (utilisé pendant « Enregistrement… » des secrets), défilement remis en haut et focus sur le `h1` visible au changement d'écran.
- **Écran AC056** : monté à la première visite puis gardé monté sous `hidden` (fichier conservé, aucune lecture de `P:` au lancement) ; liste relue à chaque retour sur le choix du fichier ; par tranches de 100 fichiers.
- **`AlertTitle`** : prop `as` (`h1` à `h6`, `p`), `h5` par défaut, chaque usage au bon niveau.
- **Tokens** : `bg-header`, `text-on-brand`, `max-w-content`, `tracking-heading`, `tracking-caption`, `w-panel-log`.

**Point d'attention pour l'item 2** : la colonne du journal (288 px) réduit la place des trois colonnes de l'écran AC056. La colonne centrale (détail de l'évènement) garderait environ 320 px à 1280 px de large, 490 px à 1536 px (1920×1080 à 125 %) et 800 px à 1920 px. Formulaire sur une colonne sous 1440 px ; à vérifier à 1280 px sans défilement horizontal.

**Point d'attention pour l'item 2** (revue de code de l'item 1) :

- `useJournalSession` est appelé dans `App` : chaque ligne du journal re-rend toute l'application, dont l'écran AC056 gardé monté. À isoler (composant qui appelle lui-même le hook, passé en `journal={…}`) avant d'afficher la navigation sur 5 500 lignes — `src/renderer/src/App.tsx`.
- Marge droite de l'écran AC056 (`pl-10 pr-0`, prévue pour l'écart avec la colonne du journal) : 16 px contre 56 px sur les autres écrans tant qu'il n'y a pas de colonnes. À fixer avec les colonnes — `pages/ac056/choix-fichier.tsx`, `ac056.tsx`, `barre-fichier.tsx`.
- Analyse synchrone dans le main (0,3 à 0,5 s pour 4 Mo) et sérialisation IPC d'environ 10 Mo : mesurer de bout en bout le chargement d'un fichier de 4 Mo avec l'affichage des évènements — `src/main/services/ac056/index.ts`.

**Point d'attention pour l'item 3** : la confirmation « Abandonner les modifications ? » au changement de fichier, décidée à l'item 1, est à construire ici (reportée : aucune modification possible avant l'item 3).

**Point d'attention pour l'item 3** (revue de code de l'item 1) : la condition de bascule « un fichier VEOS chargé puis enregistré sans modification est identique à l'original, octet par octet » (`CLAUDE.md`) a désormais deux exceptions décidées : les lignes vides (divergence 2 de la v0.1.0) et les 0x1A finaux. Les écrire dans `CLAUDE.md` et dans le tableau des écarts, avec validation de l'utilisateur, au moment de l'enregistrement.

**Point d'attention pour l'item 5** (revue de code de l'item 1) : les anomalies non bloquantes (lignes vides, Ctrl-Z final, BOM, fins de ligne) ne sont pas affichées à l'item 1 : un fichier qui n'a que celles-là montre « Aucune erreur » et « Le fichier ne contient aucune erreur. » sans dire qu'elles seront supprimées à l'enregistrement. La liste de l'item 5 doit les montrer, et le message « aucune erreur » doit les mentionner.

---

### 2. Navigation dans le fichier, contrôle à la sortie d'un champ et marquage des erreurs

**Statut** : À faire
**Pattern** : custom

**Description** — Navigation par évènement, bénéficiaire, garantie et entité ; affichage des champs de chaque entité ; contrôle à la sortie d'un champ et marquage des erreurs à chaque niveau.

**Pourquoi** : sélectionner un enregistrement et en voir le détail.

**Constat Lazarus** (`ChargerEvenementSelectionne`, `MarquerControleErreur`, `VerrouillerComposants`, onglets de `fmain.pas`) :

- Grille des évènements : dossier, n° d'évènement, contrat, code d'évènement.
- Sous l'évènement choisi : onglets d'entités 001, 100, 110, 115, 120, 125, 130, 135, 155, 180 ; Coordonnées ; Bénéficiaires (liste, puis onglets 400, 405, 410, 411) ; Garanties (liste, puis onglets 700, 800) ; Critères (485) ; Variables de souscription (490). Les onglets des entités absentes sont désactivés.
- Champ en erreur : couleur de fond, message au survol seulement ; drapeau sur l'onglet qui le contient.
- Saisie selon le champ : zone de texte, liste déroulante, sélecteur de date.

**Décisions techniques** :

- **Organisation et ordre de Lazarus** conservés (habitudes du service), présentation retouchée dans la maquette.
- **Marquage d'un champ** : bordure rouge et message affiché sous le champ, sans survol (divergence).
- **Compteur d'erreurs à chaque niveau** : ligne de l'évènement dans la liste, onglet, bénéficiaire, garantie (divergence : Lazarus ne marque que l'onglet).
- **Contrôle à la sortie du champ** (Tab, clic ailleurs), pas à chaque frappe (parité).
- **Types de saisie de Lazarus** : texte, liste déroulante avec les libellés, date au format JJ/MM/AAAA.
- Contrôle en direct côté écran par le domaine partagé (`@shared/domain/ac056`), sans aller-retour IPC.

**Repris du backlog** :

- Description des entités : figer `affiche` par un test pour tous les champs, et vérifier les listes courtes (100, 120, 125, 130, 180, 400) contre `fmain.lfm` — `src/shared/domain/ac056/entites/` (v0.1.0, item 2)
- `texteDepuisOctets` retire un BOM en tête de valeur : passer `ignoreBOM: true` avant l'affichage — `src/shared/domain/ac056/octets.ts` (v0.1.0, item 3)
- Sortie de champ : ne remplacer que les anomalies du champ modifié, par `controlerChamp` (divergence : Lazarus vide les erreurs de tout l'évènement, défaut d'écran) — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Libellés réels des champs, dans les messages d'anomalie et à l'écran (aujourd'hui « le champ {nom} (octets X à Y) ») ; repris par la liste de l'item 5 — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Messages d'anomalie à préciser : « rang non numérique » sans dire quel rang, message de la divergence 5 inexploitable, messages de structure trompeurs (« 990 en double » pour une 990 hors dossier), `encodage-incoherent` sans numéro de ligne — `src/shared/domain/ac056/controle.ts`, `src/shared/domain/ac056/structure.ts`, `src/shared/domain/ac056/lecteur.ts` (v0.1.0, revue release)
- Second fichier piégé dans `PIEGES\` pour les messages Lazarus non couverts (120, 405, 800, `ENFANT`, 490 `REDAN`) et la divergence 5. Claude prépare la liste précise des erreurs à glisser ; l'utilisateur fabrique le fichier et copie le relevé de Lazarus — `src/shared/domain/ac056/controle.corpus.test.ts` (v0.1.0, item 5)
- Tests corpus : messages d'échec qui peuvent recopier du texte libre (relevé, clé de note), `testTimeout` élevé en mode corpus, `reduce` sans valeur initiale, minimum de fichiers attendu — `src/shared/domain/ac056/controle.corpus.test.ts`, `src/shared/domain/ac056/modification.corpus.test.ts`, `src/shared/domain/ac056/lecteur-ecrivain.corpus.test.ts`, `vitest.config.ts` (v0.1.0, revue release)
- Geler `ENTITES`, `RANG_MODIFIABLE` et `PAYS` en profondeur (l'écran lit ces tables) — `src/shared/domain/ac056/entites/` (v0.1.0, revue release)
- Aides des tests `*.lazarus.test.ts` regroupées dans `src/shared/test/source-lazarus.ts` (`valeurLitteral`, `lireSource`, `nomMecanique`), avant d'ajouter le test contre `fmain.lfm` (v0.1.0, revue release)

**Fichiers impactés** : `src/renderer/src/pages/ac056/`, `src/renderer/src/hooks/`, `src/shared/domain/ac056/` (`entites/`, `octets.ts`, `controle.ts`, `structure.ts`, `lecteur.ts`, tests corpus), `src/shared/test/source-lazarus.ts` (nouveau), `vitest.config.ts`.

---

### 3. Modification des champs en erreur et enregistrement du fichier, même incomplet

**Statut** : À faire
**Pattern** : custom

**Description** — Modification des champs en erreur et enregistrement du fichier, possible même s'il reste des erreurs, avec copie de l'original et compteur des erreurs restantes. Le dépôt chez MSP d'un fichier qui contient encore une erreur sera refusé (v0.5.0).

**Pourquoi** : il est plus simple de corriger l'erreur dans le fichier AC056 et dans VEOS : VEOS ne peut pas générer un nouvel évènement qui remplacerait l'évènement erroné du fichier.

**Constat Lazarus** (`btnEnregistrerClick` `fmain.pas:1461`, `EnregistrerFichierAc056` `fmain.pas:3449`) : au clic, recontrôle complet ; s'il reste une erreur, « Veuillez corriger les erreurs détectées pour pouvoir enregistrer le fichier AC056 » ; sinon, le fichier d'origine est écrasé à sa place, sans copie.

**Décisions techniques** :

- **Enregistrement toujours possible, même avec des erreurs** (divergence validée) : l'utilisateur peut sauvegarder son travail pour y revenir plus tard. Un compteur indique le nombre d'erreurs restantes.
- **Fichier encore en erreur** : message non bloquant « Fichier enregistré avec N erreurs : il ne pourra pas être déposé chez MSP tant qu'elles ne sont pas corrigées ».
- **Fichier en anomalie de structure** : enregistrement refusé (la correction de champs ne le répare pas), consigne « relancer l'export VEOS ».
- **Le fichier corrigé garde le même nom au même endroit** : c'est lui qui partira chez MSP.
- **Copie de l'original** avant écrasement, au premier enregistrement seulement (par exemple `IN\Originaux\NOM.txt`, nom à fixer à l'item) ; elle n'est jamais écrasée ensuite : on garde toujours la version reçue de VEOS (divergence).
- **Écriture sûre** : fichier temporaire puis renommage. Si `P:` décroche pendant l'enregistrement, le fichier ne reste jamais à moitié écrit. Nouvelle capacité de l'adapter `stockage` (aujourd'hui ajout seul).
- **Journal** : « Fichier NOM enregistré : N champs modifiés », jamais de valeur, ni avant ni après.
- **Pas d'annulation de saisie** (parité) : recharger le fichier sans enregistrer, avec la confirmation « Abandonner les modifications ? » de l'item 1.
- Le domaine fixe le format écrit (`ecrireAc056`) : un fichier VEOS chargé puis enregistré sans modification reste identique à l'octet près (condition de bascule).

**Repris du backlog** :

- Rang saisi sur un seul chiffre : parité Lazarus conservée (« 1 » devient « 10 », `AddCharR`), ni contrôle ni complément à la saisie (v0.1.0, item 3)
- Réécriture silencieuse : signaler une anomalie non bloquante quand une ligne non modifiée, régénérée avec le `Trim` et le bourrage de Lazarus, diffère de l'origine (par exemple un `rangNaissance` à blanc qui sort en `00`) — `src/shared/domain/ac056/ecrivain.ts`, `fpc.ts` (v0.1.0, revue release)
- Modification réservée aux champs en erreur (parité Lazarus `VerrouillerComposants`, `MarquerControleErreur`), `maxLength` appliqué à la saisie — `src/shared/domain/ac056/modification.ts` (v0.1.0, item 3)
- Fichier en anomalie de structure : refuser l'enregistrement et afficher la consigne « relancer l'export VEOS » — `src/shared/domain/ac056/structure.ts` (v0.1.0, item 4)
- `ecrireAc056` lève des `Error` sans code : une classe ou un `code` d'erreur distingue « rejet en lecture seule » d'un invariant violé, pour un message précis à l'écran — `src/shared/domain/ac056/ecrivain.ts` (v0.1.0, revue release)

**Fichiers impactés** : `src/main/adapters/stockage/` (écriture par remplacement, sous-dossier des originaux), `src/main/services/ac056/`, `src/main/ipc/ac056/`, `src/shared/domain/ac056/` (`ecrivain.ts`, `modification.ts`, `structure.ts`), `src/renderer/src/pages/ac056/`, `CLAUDE.md` (écarts 2 et 3).

---

### 4. Consultation d'un fichier de rejet : message MSP et explication `ERRxxx` par ligne

**Statut** : À faire
**Pattern** : custom

**Description** — Un fichier de rejet MSP s'ouvre dans le même écran qu'un fichier VEOS, en lecture seule : chaque ligne rejetée montre le message de MSP et l'explication `ERRxxx`. Bilan des rejets de 2026 et ajout des codes manquants.

**Pourquoi** : comprendre pourquoi l'évènement a été rejeté.

**Constat** : les codes `ERR001` à `ERR027` sont propres à Lazarus (`uRejetsDescription.pas`), pas à MSP, qui n'envoie qu'un message en texte libre. Le code est retrouvé par correspondance exacte du message (`codes-rejet.ts`). Message sans code : « Erreur inconnue. Contactez le service informatique. » (divergence 10 de la v0.1.0). 13 messages sur 29 du corpus `OUT\` n'ont pas de code.

**Décisions techniques** :

- **Même écran, en lecture seule**, sans « Enregistrer » ni « Déposer » (parité).
- **Affichage** : encadré en haut de l'entité concernée, avec le message de MSP et son explication. Les lignes rejetées sont repérées dans la navigation avec le même compteur que les erreurs de l'item 2 (évènement, bénéficiaire, garantie).
- **Bilan des rejets de 2026** : fichiers `AC056COUR_REJ_*` de 2026 du dossier `OUT` de production (`P:\…\Transferts\OUT`). Tableau : message, nombre d'occurrences, code existant ou « aucun ». Aucune valeur AC056 ; un message qui cite lui-même une valeur (numéro, nom) est généralisé (« Le contrat … est inconnu ») dans le bilan comme dans le code. Rangé dans `docs/` après vérification qu'il ne contient aucune donnée personnelle. Peut être lancé dès le début de la version, pour laisser le temps de valider les textes.
- **Nouveaux codes** `ERR028`, `ERR029`… : Claude rédige un brouillon d'explication pour chacun, à partir du message et des règles AC056 ; l'utilisateur ou le service valide les textes avant l'ajout (divergence validée). Les explications existantes ne sont pas réécrites.

**Repris du backlog** :

- Ajouter les codes `ERRxxx` manquants : bilan des messages de rejet de 2026, puis ajout des codes absents (divergence avec Lazarus validée) — `src/shared/domain/ac056/codes-rejet.ts` (v0.1.0, item 6)
- Rejet : navigation comme dans un fichier VEOS, message et explication de chaque ligne, sans Enregistrer ni Dépôt — `src/shared/domain/ac056/rejet.ts` (v0.1.0, item 6)
- Ne jamais appeler `ecrireAc056` sur un rejet (qui lève une erreur) : l'enregistrement d'un rejet est rendu impossible en amont, à l'écran et dans le main — `src/shared/domain/ac056/ecrivain.ts` (v0.1.0, item 6)
- Une 700 sans 400 dans un rejet : bénéficiaire implicite (`e400: number | null`), comme Lazarus (`uac056.pas:736-757`), navigation VEOS conservée ; corriger le texte de la divergence 11 — `src/shared/domain/ac056/hierarchie.ts`, `src/shared/domain/ac056/structure.ts` (v0.1.0, revue release)
- Afficher les valeurs d'un rejet décodées en Windows-1252 : exporter le décodage de `index.ts` (sinon un accent donne U+FFFD) — `src/shared/domain/ac056/index.ts` (v0.1.0, revue release)

**Fichiers impactés** : `src/shared/domain/ac056/` (`codes-rejet.ts`, `rejet.ts`, `hierarchie.ts`, `structure.ts`, `index.ts`), `src/renderer/src/pages/ac056/`, `docs/` (bilan), `docs/archives/version-0.1.0.md` (texte de la divergence 11, si le tableau des divergences y est la référence).

---

### 5. Liste récapitulative des erreurs et passage rapide d'une erreur à l'autre

**Statut** : À faire
**Pattern** : custom

**Description** — Panneau de l'écran AC056, à côté de la navigation : liste de toutes les erreurs du fichier. Un clic ouvre directement le champ concerné ; deux boutons passent à l'erreur précédente ou suivante.

**Pourquoi** : l'utilisateur doit pouvoir corriger les erreurs le plus facilement possible.

**Décisions techniques** :

- **Une ligne par erreur**, dans l'ordre du fichier : n° de ligne, entité, libellé du champ, message. Pour un rejet : une ligne par ligne rejetée, avec le message MSP et le code `ERRxxx`.
- **Mise à jour à chaque sortie de champ** (une erreur corrigée disparaît), nombre d'erreurs restantes en tête.
- **Anomalies sans champ** (structure, lignes vides, encodage) : présentes dans la liste ; un clic ouvre la ligne concernée. Anomalies non bloquantes présentées à part, en style plus discret.
- **Boutons « ‹ Précédente » et « Suivante › »**, à la souris.
- **Pas de raccourci clavier** : les utilisateurs sont habitués à la souris (divergence avec la roadmap, validée).
- **Pas d'enchaînement automatique** vers l'erreur suivante après une correction.
- **Pas de mesure chronométrée** : l'objectif « corriger quinze erreurs au moins aussi vite que dans Lazarus » est retiré de l'item ; le jugement viendra de l'usage, à la recette de la v0.6.0.

**Fichiers impactés** : `src/renderer/src/pages/ac056/`, `src/renderer/src/hooks/`.

---

## Items retirés (YAGNI)

Aucun item retiré.

## Points du backlog abandonnés

- Réécrire les explications `ERRxxx` avec le service administratif ? Les textes actuels sont repris mot pour mot de Lazarus, provisoires — `src/shared/domain/ac056/codes-rejet.ts` (v0.1.0, item 5) — **Raison** : inutile, les utilisateurs ne se sont jamais plaints des textes de Lazarus.

## Ordre de réalisation

| # | Item | Pattern | Justification |
|---|------|---------|---------------|
| 1 | Chargement d'un fichier AC056, VEOS ou rejet | custom | Fondation : écran AC056, liste `IN`/`OUT`, lecture par le domaine. Préalables groupés ici : `ac056-agent`, garde-fou ESLint, tokens de design, `AlertTitle`, cadre, journal en direct. `/design-screen-prompt` une seule fois avant, pour l'écran complet. |
| 2 | Navigation dans le fichier, contrôle à la sortie d'un champ et marquage des erreurs | custom | Dépend de 1. Cœur de la parité : champs affichés contre `fmain.lfm`, libellés, messages, second fichier piégé. Plus gros item, le plus exposé au risque n° 1 du pre-mortem. |
| 3 | Modification des champs en erreur et enregistrement du fichier, même incomplet | custom | Dépend de 2 (champs et contrôle). Risque le plus fort sur les données : écriture sur `P:`, copie de l'original, octet par octet. Traité tôt pour avoir le temps de le vérifier. |
| 4 | Consultation d'un fichier de rejet : message MSP et explication `ERRxxx` par ligne | custom | Dépend de 1 et 2 (même navigation). Le bilan des rejets de 2026 peut être lancé dès le début de la version : il faut le temps de faire valider les textes des nouveaux codes. |
| 5 | Liste récapitulative des erreurs et passage rapide d'une erreur à l'autre | custom | Dépend de 2 (erreurs) et 4 (lignes rejetées). En dernier, elle couvre d'emblée les deux types de fichiers. |
