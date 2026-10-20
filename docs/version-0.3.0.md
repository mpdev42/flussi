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

**Statut** : Terminé
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

**Constat Lazarus corrigé** (exploration de `fmain.lfm` et `fmain.pas`, 2026-10-19) : l'organisation ci-dessus est inexacte, la maquette aussi.

- Onglets de l'évènement (`pcEvenements`) : Évènements (grille) | Bénéficiaires | 001 | 100 | 110 | 115 | 120 | Coordonnées | 130 | 135 | 155 | 180. L'onglet 001 n'est jamais affiché ; les onglets des entités absentes sont masqués ; Coordonnées = grille des 125 puis fiche 125.
- Onglets du bénéficiaire (`pcBeneficiaires`) : Bénéficiaires (grille) | Garanties (grille des 700 puis fiche 700) | 400 | 405 | 410 | 411 (vide) | Critères (grille des 485 puis fiche) | Variables souscription (grille des 490 puis fiche) | 800. Garanties, Critères, Variables et 800 dépendent du bénéficiaire.
- Grille des évènements : N° dossier, N° évènement, N° contrat, Evènement (code brut). Les listes et dates sont toujours en lecture seule ; les 23 champs modifiables sont tous des champs texte.
- Sortie de champ (`OnExit`) : `ControlerEvenement` vide toutes les erreurs de l'évènement et ne rejoue que les règles de la donnée, sans rafraîchir l'écran. Le `Hint` d'erreur n'est jamais visible (`ShowHint` absent).

**Décisions du démarrage de l'item** (2026-10-19, `/item-start`, validées « comme tu conseilles ») :

1. **Onglets selon Lazarus** : évènement = Bénéficiaires, 100, 110, 115, 120, Coordonnées, 130, 135, 155, 180 ; bénéficiaire = Garanties, 400, 405, 410, 411, Critères, Variables souscription, 800. Pas d'onglet 001. Onglet d'entité absente visible mais désactivé (divergence : Lazarus le masque).
2. **Clic sur un évènement** : s'il est en erreur, ouverture de la première fiche en erreur ; sinon l'onglet courant est gardé s'il existe, ou la fiche 100 (divergence : Lazarus revient à la liste).
3. **Correction en mémoire dès l'item 2** : champs modifiables en erreur corrigeables, rien n'est écrit sur `P:` ; un champ corrigé reste modifiable pendant la session ; `maxLength` à la frappe ; valeur inchangée = rien (parité `Modified`). Confirmation « Abandonner les modifications ? » avancée de l'item 3 à l'item 2. Enregistrement, copie de l'original et trace au journal restent à l'item 3 ; les corrections en mémoire ne sont pas tracées.
4. **Erreurs non corrigeables à l'écran** (code et valeur des 485/490, divergence 5 sur un champ non modifiable, fichier en anomalie de structure) : champ rouge, en lecture seule, consigne « À corriger dans VEOS. » (texte raccourci par l'utilisateur à la revue de code, 2026-10-20). Fichier mal formé navigable, entièrement en lecture seule (divergence : Lazarus déverrouille les 485/490 puis jette la saisie).
5. **Texte sous le champ** : ce qui ne va pas et ce qui est attendu (`DESIGN.md` §9.2), propriété `consigne` des anomalies. Le `message` Lazarus reste inchangé (journal, item 5, comparaison au relevé).
6. **Listes et dates en lecture seule, affichées comme du texte** : « CODE - Libellé » ; code inconnu = code brut « (absent de la liste) » (Lazarus : vide) ; date JJ/MM/AAAA ; date vide = vide (Lazarus : 30/12/1899) ; date invalide = valeur brute « (date invalide) ».
7. **Libellés de Lazarus sans « : »**, coquilles corrigées (« Code de l'offre », « Évènement ») ; « Valeur » au lieu de « Code assureur » pour les 485/490 ; titre « Garantie » pour la fiche 700.
8. **Erreurs hors fiche** : 990 dans un encadré au-dessus des onglets de l'évènement ; 000, 001, 995, 999 et lignes perdues dans les alertes du fichier (« N erreurs hors des évènements ») ; détail à l'item 5.
9. **Répartition** : onglets (`TabBar`) et champ de saisie de la charte (`TextInput`) en composants partagés (`component-agent`).

**Décisions de l'implémentation** (2026-10-19) :

- **Domaine** :
  - `indexerLignes` rattache chaque ligne à son évènement, son bénéficiaire et son rang dans une liste ; il est construit une fois par fichier.
  - `compterAnomalies` et `compterParLigne` comptent les anomalies bloquantes, chaque ancêtre agrégeant ses descendants.
  - `bilanAnalyse` recompte une analyse ; une table code → famille (`lecture`, `structure`, `controle`) est vérifiée par le compilateur.
  - `saisirChamp` modifie un champ, recontrôle sa ligne et remplace les seules anomalies de contrôle de cette ligne. Il est égal à l'analyse recalculée en entier sur 582 saisies du corpus.
  - Mesure sur 3,9 Mo (5 510 lignes) : 61,5 ms (médiane) par sortie de champ, d'où pas de contrôle limité à la ligne. Il pourra être branché dans `saisie.ts` sans changer l'API.
- **Saisie** (parité `Modified`) : l'écran n'appelle `saisirChamp` qu'après une frappe, même si le texte final est identique. Le raccourci « texte identique » ne vaut que pour un champ sans erreur, ce qui corrige le cas d'une tabulation retirée à la lecture.
  - `maxLength` est contrôlé en caractères.
  - Nouveau refus `caractere-illisible` : U+FFFD n'est jamais réécrit.
- **Affichage des valeurs** : `valeurAffichee`, `entreeListe` (parité `SetComboIndex`, premier doublon), `texteEntree` (« CODE - Libellé »).
  - Une date n'est reconnue que sur 8 chiffres formant une vraie date. Divergence : le `StrToDate` de Lazarus est plus tolérant ; la valeur s'affiche brute avec « (date invalide) ».
- **Libellés et fiches** : `DescriptionChamp.libelle` sur les 93 champs affichés ; `FICHES` (titre et ordre de l'écran) et `champsAffiches`. Ils sont vérifiés contre `fmain.lfm` par `entites/fiches.lazarus.test.ts` (93 contrôles, Caption, MaxLength, Items, type, ordre `Top`, titres, `OnExit`).
  - Corrections en plus de la décision 7 : « Échéance principale », « Code civilité ».
  - Titre de la 411 : « Attestation ACS de l’assuré » (onglet vide dans Lazarus).
- **Tables gelées en profondeur** : `ENTITES` (déplacé dans `entites/registre.ts`), `RANG_*`, listes de valeurs et `FICHES`. `texteDepuisOctets` décode avec `ignoreBOM: true`.
- **Consignes** (`AnomalieAc056.consigne`, sur les seules anomalies de contrôle) : une par jeu de caractères, code postal, rang (seuil propre au type d'assuré), valeur imposée des 485/490 et divergence 5.
  - Les champs non modifiables finissent par `CONSIGNE_VEOS`.
  - Dans un fichier mal formé, la consigne d'un champ modifiable est complétée par `CONSIGNE_VEOS`.
- **Messages propres à Flussi précisés**, messages Lazarus inchangés :
  - divergence 4 : « rang de bénéficiaire / de personne non numérique » ;
  - divergence 5 : « caractère interdit dans le champ « Libellé », octet N » ;
  - 990 ou 995 après un niveau déjà fermé : `entite-mal-placee` au lieu de « en double » ;
  - `encodage-incoherent` cite et porte la première ligne concernée ;
  - `modifierChamp` cite les libellés.
- **Tests** : aides `src/shared/test/source-lazarus.ts` (dont l'analyseur `lireLfm`), `testTimeout` de 120 s en mode corpus, `MINIMUM_FICHIERS_CORPUS` (PIEGES passera à 2), messages d'échec sans texte libre.
- **Partagé** :
  - `JournalSessionEnDirect` : le journal ne re-rend plus `App`.
  - Conteneur caché en `h-full`.
  - Tokens `w-panel-nav` (328 px, 344 px à partir de 1440 px), `grid-cols-ac056` et `scrollbar-fin`.
  - `TabBar` : tablist accessible, flèches, onglets désactivés sautés, compteur annoncé.
  - `TextInput` : champ de la charte ; en erreur, il reste blanc même en lecture seule (§9.2).
- **Écran** :
  - Deux colonnes : évènements à gauche, avec la sous-liste des bénéficiaires sous l'évènement choisi quand l'onglet Bénéficiaires est actif ; au centre, fil d'Ariane, onglets, listes 125/700/485/490 et fiche.
  - Réducteur pur `navigation-ac056.ts`, sélection par position.
  - En-têtes de la liste des évènements repris de la maquette (« Dossier / N° / Contrat / Code », libellés complets pour les lecteurs d'écran), car ceux de Lazarus ne tiennent pas en 328 px. Nom et prénom des bénéficiaires dans une même colonne.
  - Suffixes « (absent de la liste) » et « (date invalide) » dans la valeur du champ.
  - Encadrés de la 990 et « Autres erreurs de la ligne N » en `role="note"`.
  - Confirmation « Abandonner les modifications ? » sur « Changer de fichier ».
- **Sortie de champ à la souris** (revue de code) : la saisie n'est appliquée qu'au relâchement du pointeur (`pages/ac056/sortie-champ.ts`, écouteurs `pointerdown`/`pointerup`/`pointercancel`/`keydown` en capture sur `document`), une fois la cible du clic fixée. Au clavier, elle est appliquée tout de suite. Sans cela, l'écran bouge entre l'appui et le relâchement (onglet dont le compteur disparaît, alerte de fichier, barre, liste 125) et le clic de navigation est perdu. Saisie liée à l'index de son fichier : jamais appliquée à un autre fichier. Alerte de fichier toujours présente, de hauteur constante ; noms tronqués sur une ligne dans la sous-liste des bénéficiaires, le fil d'Ariane et la valeur des 125.
- **Mesures de bout en bout** (e2e, 5 510 lignes, 3,7 Mo, prises dans la page) :
  - clic sur le fichier → premier évènement affiché : 437 à 452 ms ;
  - sortie d'un champ corrigé → barre à jour : 25 à 27 ms ;
  - clic sur un évènement → détail : 2 à 3 ms.

  Le point d'attention de l'item 1 sur la performance est levé.
- **Reporté dans `CLAUDE.md`** à `/item-finish` (2026-10-20) :
  - module Ac056 (navigation, saisie en mémoire, confirmation) ;
  - composants `tab-bar` et `text-input` ;
  - tokens `w-panel-nav`, `grid-cols-ac056` et `scrollbar-fin` ;
  - `JournalSessionEnDirect` ;
  - nouveaux fichiers du domaine et `source-lazarus.ts`.

Décisions techniques : bénéficiaires et éléments de liste sélectionnés par position (Lazarus cherche par contenu : toujours le premier homonyme) ; contrôle limité à une ligne seulement si la mesure le justifie (plus de 100 ms par sortie de champ sur 4 Mo) ; marges `pl-10` gardées ; colonne des erreurs non réservée ; fichier de rejet inchangé jusqu'à l'item 4.

**Second fichier piégé** (`PIEGES\`, à fabriquer par l'utilisateur ; l'item ne l'attend pas). Copie d'un fichier de `IN\`, une erreur par évènement autant que possible :

- **120** : `#` dans le complément géographique, `*` dans le numéro de voie, libellé de voie en minuscules, `_` dans le lieu-dit, code postal `7500`, code postal `75O01` (lettre O), localité `SAINT-ÉTIENNE`.
- **405** (bénéficiaire `CONJOI`) : `!` dans le nom, `@` dans le prénom, une espace dans le n° INSEE, `,` dans le nom de jeune fille, rang `25`.
- **800** (sur un `ASSPRI` ou un `CONJOI`) : rang `22` et rang de personne `30`.
- **ENFANT** : rang `40` sur 400, 405, 410 et 700. Témoins sans erreur attendue : rangs `39` et `25` sur un autre `ENFANT`.
- **490** : `REDAN` avec la valeur `OUI` ; code `REDAX`. **485** : valeur `SEUL`.
- **Divergence 5** : tabulation dans le code d'offre de la 100 ; `é` dans la référence externe de la 800 ; `é` dans le nom de la 115.
- **Témoin** : un `ASCEND` de rang `99` (aucune erreur attendue).
- **Contraintes** : 700 octets par ligne (pour chaque caractère sur 2 octets, retirer une espace de bourrage du même champ) ; jamais de rang non numérique sur un `ASSPRI`, `CONJOI` ou `ENFANT` (Lazarus plante) ; n° de dossier et n° d'évènement intacts ; UTF-8 sans BOM, CRLF. Puis charger le fichier dans Lazarus et copier son journal dans `NOM.erreurs.txt`.

**Revue de code** (trois passes, 2026-10-20) : deux bloquants à la première passe (clic perdu à la dernière correction, trois 990/995 de suite), un à la deuxième (onglets qui glissent quand leur compteur disparaît), tous corrigés (saisie appliquée au relâchement du pointeur) ; verdict final « OK pour merge ».

**Point d'attention pour l'item 3** (revue de code de l'item 2) :

- **Rang saisi sur un seul chiffre** : « 5 » passe le contrôle à la sortie du champ, mais sera écrit « 50 » (bourrage à droite, parité `AddCharR` reprise du backlog de l'item 3). Relu, le fichier aura une erreur (enfant à partir de 40) ou un rang changé sans signal (ascendant). Décision à reprendre avant l'enregistrement : refuser un seul chiffre, compléter à gauche, ou contrôler la valeur telle qu'elle sera écrite (`addCharR`), avec un test saisie → écriture → relecture — `src/shared/domain/ac056/modification.ts`, `entites/entete.ts`, `ecrivain.ts`.
- **Corrections perdues sans confirmation** à la fermeture de la fenêtre, par Ctrl+R ou Ctrl+W : le menu par défaut d'Electron reste actif (outils de développement compris, Ctrl+Maj+I) ; aucun `beforeunload` — `src/main/index.ts`.
- **Badge « Modifié »** de la maquette : rien ne signale les corrections non enregistrées, hormis la confirmation — `pages/ac056/barre-fichier.tsx`.
- **Garde-fous seulement à l'écran** : `saisirChamp` accepte une saisie sur un fichier mal formé ou sur un champ sans erreur ; refuser aussi dans le domaine ou au main avant l'écriture — `src/shared/domain/ac056/saisie.ts`.
- **Barrière d'erreur** (ErrorBoundary) autour de `FichierOuvert`, avec un message et « Changer de fichier » ; `try/catch` dans `lancer` de `sortie-champ.ts` (exception au démontage = écran blanc) — `pages/ac056/`.
- **`encodage-incoherent`** garde sa « première ligne concernée » d'origine après une correction : recalculer l'analyse depuis les octets écrits à l'enregistrement ? — `src/shared/domain/ac056/lecteur.ts`.
- **Rang de la 400 modifié sans ceux de ses filles** (405, 410, 700…) : parité Lazarus ; une consigne ? — `src/shared/domain/ac056/controle.ts`.
- **Sortie de champ** :
  - toute touche vaut relâchement, y compris la répétition de Maj ou Ctrl tenue (Maj+clic) : ignorer `repeat` et les touches de modification ;
  - `pointer-events-none` sur les icônes et compteurs des boutons (un élément qui disparaît entre `pointerup` et `click` annule le clic) ;
  - écouteurs installés une fois au lieu d'être retirés à chaque changement de fiche ;
  - appliquer aussi à la perte de focus de la fenêtre (relâchement perdu) et à Alt+Tab pendant la frappe (aujourd'hui saisie partielle appliquée, ce que l'`OnExit` de Lazarus ne fait pas) ;
  - `index` obligatoire dans `saisir`, commentaire de la garde `precedent === actuel` à corriger (« garde défensive ») — `pages/ac056/sortie-champ.ts`, `hooks/use-fichier-ac056.ts`.
- **Navigation** : un clic sur l'évènement déjà sélectionné relance la règle de sélection et peut changer d'onglet ; ne rien faire dans ce cas ? Refus de saisie non annoncé au lecteur d'écran — `pages/ac056/navigation-ac056.ts`, `champ-ac056.tsx`.
- **Tests de la sortie de champ** : compter les appels de `saisirChamp` dans « une seule fois » et « démontage puis relâchement », précondition du test « touche pressée », commentaire « comme un clic de souris » trompeur, refus après application différée, test unitaire de `sortie-champ.ts`, homonymie `appuyer` (pointeur) et `appuyer` (clavier) — `fichier-ouvert.dom.test.tsx`, `test/dom.ts`.

**Point d'attention pour l'item 5** (revue de code de l'item 2) :

- La tranche affichée de la liste des évènements ne mémorise pas son extension : après un saut vers un évènement lointain, la liste se raccourcit et le défilement saute ; focus sur `body` quand la dernière tranche est affichée — `pages/ac056/colonne-evenements.tsx`.
- La colonne des erreurs réduira la colonne centrale (environ 304 px à 1280 px) : la barre d'onglets de l'évènement est déjà au seuil du passage à la ligne à 1280 px, et le badge de la barre du fichier peut passer à la ligne sous environ 1 030 px.
- « Erreur(s) de la ligne N » : pour une divergence 5 sur un champ non affiché, la consigne ne nomme pas le champ (le message, si) ; `CONSIGNE_VEOS` répétée à chaque puce ; « à corriger » affiché aussi quand les erreurs restantes ne se corrigent pas dans Flussi — `pages/ac056/fiche-entite.tsx`, `alertes-fichier.tsx`.
- Dates « 00000000 » : si le corpus en contient, elles s'affichent « 00000000 (date invalide) » (Lazarus : vide) — `src/shared/domain/ac056/affichage.ts`.

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
