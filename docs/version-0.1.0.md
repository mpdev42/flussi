# Version 0.1.0 — Domaine AC056

**Objectif** : le domaine pur `src/shared/domain/ac056` lit, contrôle et réécrit les fichiers AC056 à l'identique de Lazarus. C'est le risque le plus dangereux du projet (divergence silencieuse, pre-mortem mode n° 2), et tout le reste en dépend. Aucune interface en v0.1.0 : l'écran AC056 (`list+form`) arrive en v0.3.0.

**Référence d'implémentation** : le code Lazarus (`docs/reference/lazarus/`). Le cahier des charges IGA 1.32 fait référence fonctionnelle mais n'est pas analysé : il est archivé dans `docs/reference/iga/` et consulté seulement sur un point bloquant. La roadmap cite encore la version 1.27.

**Divergences validées avec Lazarus** (toute autre divergence est interdite) :

| # | Divergence | Item |
|---|---|---|
| 1 | Valeur plus longue que son champ : refus avec erreur (Lazarus décale la ligne) | 3 |
| 2 | Lignes vides : signalées, supprimées à la réécriture, aucune écriture au chargement | 3 |
| 3 | Ordre des lignes d'origine conservé (Lazarus réécrit dans un ordre canonique) | 3 |
| 4 | Rang non numérique : erreur « Entité NNN : rang non numérique » (Lazarus plante) | 5 |
| 5 | Octet non ASCII ou caractère de contrôle signalé dans tout champ (Lazarus ne contrôle que certains champs) | 5 |
| 6 | Aucune ligne perdue : une ligne en anomalie est conservée et réécrite à l'identique (Lazarus la perd) | 4 |
| 7 | Rejets : pas de lignes 000/001 fabriquées | 6 |
| 8 | Format d'origine conservé : fins de ligne (CRLF, LF, CR), BOM, saut de ligne final (Lazarus réécrit tout en CRLF, sans BOM, avec un CRLF après la dernière ligne) | 3 |
| 9 | Zone non décrite (fin de ligne non lue par Lazarus) réécrite telle quelle (Lazarus la réécrit en espaces) | 3 |
| 10 | Rejet non reconnu : explication « Erreur inconnue. Contactez le service informatique. » (Lazarus affiche une explication vide, par bug) | 5 |
| 11 | Rejets : message conservé sur toutes les lignes (Lazarus perd celui des 411, 990 et 995, et celui d'une fille de 400 sans 400) | 6 |

---

### 1. Corpus de référence AC056 (hors dépôt)

**Statut** : Terminé
**Pattern** : aucun

**Description** — Jeu de fichiers AC056 réels servant de référence de parité avec Lazarus, rangé sur `P:` et jamais dans le dépôt. Mise en place de l'accès depuis les tests et copie des sources Lazarus de référence dans le dépôt.

**Dossier du corpus** : `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts\CORPUS-DEV\`

- `IN\` : 9 fichiers VEOS de 2026, de 4 Ko à 387 Ko, ASCII pur, sans BOM, CRLF, lignes de 700 caractères, **sans saut de ligne après la dernière ligne** (constaté le 2026-10-13). Les fichiers corrigés dans Lazarus (écrasés à l'enregistrement) se distinguent des originaux par le CRLF final que Lazarus ajoute toujours.
- `OUT\` : 3 rejets MSP (09/09, 17/09, 23/09), Windows-1252, CRLF, lignes de 817 à 829 caractères, chacun rattaché à un fichier de `IN`.
- `PIEGES\` : créé par l'utilisateur le moment voulu (avant l'item 5). Copies de fichiers du corpus avec erreurs volontaires, accompagnées du relevé manuel des messages affichés par Lazarus. Lazarus n'enregistre pas un fichier en erreur.
- `MODIFIES\` : fichiers modifiés par Lazarus, référence de l'écrivain (item 3). 3 cas créés le 2026-10-13, convention dans les décisions d'implémentation de l'item 3.
- Couverture des entités 000 à 999 : vérifiée plus tard, si nécessaire. Les cas absents du corpus (BOM, LF, accents, fichiers mal formés) sont couverts par des fichiers synthétiques.

**Décisions techniques** :

- Pas de manifeste. Convention de nommage dans `PIEGES\` : `NOM.txt` (fichier) et `NOM.erreurs.txt` (relevé manuel).
- Variable `AC056_CORPUS_DIR` déclarée dans `.env.example`. Les tests sur le corpus sont ignorés (`skip`) si elle est absente : `npm test` reste vert sans accès à `P:`. Un script `npm run test:corpus` les rend obligatoires.
- Copies dans le dépôt, à partir de `C:\Users\c.mathevon\OneDrive - GIE MATH-PREVARIS\Documents\Lazarus\Flussi\` (racine, pas `backup\`) :
  - `docs/reference/lazarus/` : `uac056.pas`, `utypes.pas`, `ucontrole.pas`, `urejetsdescription.pas`, `fmain.pas` (lecture vers la l. 2711, écriture vers la l. 3473), `fmain.lfm` (écrans, `MaxLength`, listes de valeurs), `Rejets - Explications.txt`.
  - `docs/reference/iga/` : `Interface - AC056 - APIVIA - Cahier des charges IGA - 1.32.docx` (depuis le partage `Siege\IGA-VEOS2 MATH\Projets\Interfaces\AC056\`), archive seule, ni convertie ni analysée.
  - `docs/` est déjà ignoré par ESLint et Prettier.

**Contraintes** :

- **`uconstantes.pas` n'entre jamais dans le dépôt** : il contient en clair les mots de passe du FTP IGA et du FTP APIVIA. Les jeux de caractères qu'il définit (l. 70 à 74) sont reportés dans le code, sans copier le fichier.
- Exclus aussi : `backup\`, `lib\`, `Journal\`, binaires, fichiers de données réelles (`MATH_*.txt`, `Rejets-TEST - Copie.txt`), fichiers Excel.
- Données personnelles : le corpus n'est pas anonymisé et ne quitte pas `P:`. Aucun extrait dans le dépôt (ni fixture, ni snapshot). En cas d'échec, un test corpus affiche le fichier, la ligne et la position, jamais la valeur. Les tests du dépôt utilisent des fichiers synthétiques.

**Fichiers impactés** : `docs/reference/**`, `.env.example`, `package.json` (script `test:corpus`), `vitest.config.ts` si nécessaire, helper de test d'accès au corpus.

**Décisions d'implémentation** (2026-10-12) :

- `vitest.config.ts` charge uniquement les variables `AC056_*` du `.env` (`loadEnv` filtré, jamais les secrets). Mode `corpus` (`npm run test:corpus`) : seuls les `*.corpus.test.ts` sont lancés, `passWithNoTests: false`, corpus obligatoire.
- Helper `src/shared/test/corpus.ts` : `resoudreCorpus` (disponible si `IN\` et `OUT\` existent), `decrireCorpus` (skip si indisponible), `listerCorpus`, `lireCorpus` (octets bruts), `localiserEcart` et `decrireEcart` (fichier, ligne, octet, jamais la valeur).
- `docs/reference/** -text` dans `.gitattributes` : copies conformes à l'original à l'octet près (CRLF, encodage), vérifiées par comparaison binaire.
- Garde-fous `.gitignore` : `uconstantes*.pas`, `MATH_*.txt`, `AC056COUR_REJ_*`.
- Les tests du domaine et du corpus portent `// @vitest-environment node` (environnement global `jsdom`). À trancher à l'item 2 : environnement par dossier ou docblock par fichier.
- Non bloquant, reporté : `listerCorpus`, `lireCorpus` et `decrireCorpus` ne sont testés que sur le vrai corpus, pas sur un dossier temporaire.

---

### 2. Description des entités AC056 (000 à 999)

**Statut** : Terminé
**Pattern** : aucun

**Description** — Description déclarative de tous les enregistrements AC056 en largeur fixe : positions, longueurs, types, bourrage, champs affichés et modifiables, valeurs autorisées.

**Constat Lazarus** :

- 22 types d'entité (`utypes.pas`, `TEntite`) : `000, 001, 100, 110, 115, 120, 125, 130, 135, 155, 180, 400, 405, 410, 411, 485, 490, 700, 800, 990, 995, 999`. `000`, `990`, `995` et `999` sont conservées comme ligne brute.
- Hiérarchie : fichier `000` (pied `999`) > dossier `001` (pied `995`) > évènement `100` (`110`, `115`, `120`, `130`, `135`, `155`, `180`, n × `125`, n × `400`, pied `990`) > bénéficiaire `400` (`405`, `410`, `411`, `800`, n × `485`, n × `490`, n × `700`).
- Code d'entité : octets 23 à 25. Lignes de 700 caractères.
- Positions : `Copy(ligne, position, longueur)` dans `uac056.pas`, avec `Trim` sur certains champs. Bourrage : `AddCharR` (espaces ou `0`, toujours à droite, sans troncature).
- Écrans (`fmain.lfm`) : un onglet par entité, une partie seulement des champs affichée, 59 `MaxLength`, valeurs autorisées dans les listes des `TComboBox`.
- 23 champs modifiables (`TDonneeModifiable`).

**Décisions techniques** :

- Une table par entité dans `src/shared/domain/ac056/entites/`, couvrant **tous** les champs, même non affichés. Pour chaque champ : position (octet, base 1), longueur, type (alphanumérique, numérique, date, d'après les suffixes `_n` et `_d`), bourrage, `Trim` à la lecture, affiché, modifiable, `MaxLength`, valeurs autorisées.
- Priorité : la largeur vient de `uac056.pas`. Le `MaxLength` n'est qu'une limite de saisie. En cas d'écart, les deux sont conservés, sans correction.
- Nommage camelCase sans préfixe ni suffixe hongrois (`s_num_dossier_n` → `numDossier`).

**Tests** : pour chaque entité, champs contigus, sans trou ni chevauchement, sur exactement 700 octets.

**Fichiers impactés** : `src/shared/domain/ac056/entites/*.ts` et leurs tests.

**Décisions d'implémentation** (2026-10-12) :

- Modèle : `DescriptionChamp` et `DescriptionEntite` (`entites/types.ts`), aides `alpha`, `num`, `date` (une ligne par champ, calquée sur le `Copy` de Lazarus), registre `ENTITES` (`entites/index.ts`).
- Nommage mécanique : `s_` et suffixe `_n` ou `_d` retirés, puis camelCase. Les coquilles de Lazarus sont conservées (`echancier`), pour retrouver chaque champ dans la source.
- En-tête commun 1 à 25 pour les 22 entités : `numEmetteur`, `numDossier`, `numEvt`, `rang` (rang du bénéficiaire, `s_rang_n`), `numEntite`.
- Lazarus ne lit pas la fin de ligne (la 100 s'arrête à 364, la 485 à 41) et la réécrit en espaces : dernier champ `zoneNonDecrite` jusqu'à 700. Entités brutes (000, 001, 990, 995, 999) : en-tête puis `donnees` (26 à 700). Pour 000, 990, 995 et 999, Lazarus ne lit que le code d'entité, le reste de l'en-tête est indicatif.
- Écarts de Lazarus conservés sans correction :
  - 4 `MaxLength` différents de la longueur : 120 code postal (5 pour 10), 485 valeur (9 pour 10), 490 valeur (9 pour 20), 700 `appliquerStageCv` (2 pour 1) ;
  - 2 largeurs d'écriture plus courtes que la lecture, sans effet (`AddCharR` ne tronque pas) : 110 monnaie de gestion (1 pour 3), 135 numéro d'évènement (2 pour 3).
- `valeursAutorisees` : listes des `TComboBox` recopiées mot pour mot en `{ code, libelle }`, doublons et coquilles compris. Elles servent à l'affichage uniquement : Lazarus ne les contrôle pas. Listes longues ou partagées dans `entites/valeurs/`.
- Pas de libellé de champ : il sera ajouté par l'item 5 (message « caractère non autorisé dans {champ} ») ou par la v0.3.0.
- Tests ajoutés à ceux prévus :
  - parité automatique avec `uac056.pas` (ordre, positions, longueurs, Trim, bourrage) ;
  - corpus : la zone non décrite des lignes de `IN\` ne contient que des espaces. Vérifié sur le corpus le 2026-10-12 : VEOS n'écrit rien au-delà des champs lus par Lazarus.
- Environnement Vitest (question laissée ouverte à l'item 1) : `node` par défaut. Un test du renderer déclare `// @vitest-environment jsdom`.
- Non bloquant, reporté au plus tard en v0.3.0 (consommation par l'écran), relevé par la revue d'item :
  - `affiche` n'est figé par un test que pour les champs modifiables, avec `maxLength` ou avec liste. Les 93 champs affichés ont été comptés à la main.
  - Les listes courtes recopiées en ligne (100, 120, 125, 130, 180, 400) ne sont pas vérifiées contre `fmain.lfm` par un test. Les 6 listes de `valeurs/` ont été générées par script depuis `fmain.lfm`.

**Point d'attention pour l'item 3** (constaté dans `uac056.pas`, non traité ici) :

- 4 champs combinent Trim et bourrage `'0'` : 100 `echPrinc`, 410 `rangNaissance`, 700 `typeGarantieAssemblee`, 800 `rangPersonne`. Lazarus réécrit un champ blanc en zéros (`'    '` → `'0000'`) et transforme une valeur précédée d'espaces (`' 1'` → `'10'`).
- Champs avec Trim et bourrage `' '` : les espaces de tête disparaissent à la réécriture, la valeur est recalée à gauche dans sa zone.
- Le test SHA-256 sur le corpus dira si VEOS produit ces cas.

---

### 3. Lecteur et écrivain AC056, réécriture identique à l'octet près

**Statut** : Terminé
**Pattern** : aucun

**Description** — Lecture d'un fichier AC056 (octets → structure + anomalies), écriture (structure → octets), modification d'un champ. Un fichier lu puis réécrit sans modification est identique à l'original, octet par octet. Fusion des items 3 et 6 de la roadmap.

**Constat Lazarus** (`ChargerFichierAc056` et `EnregistrerFichierAc056` dans `fmain.pas`) :

- Lecture ligne par ligne (`ReadLn` : CRLF, LF et CR seul), lignes vides ignorées, et fichier aussitôt réenregistré au chargement s'il en contenait. Une ligne faite d'espaces n'est pas vide : elle est traitée comme une entité inconnue.
- Écriture par régénération des lignes à partir des champs, dans un ordre canonique fixe, entités absentes sautées. `AddCharR(' ', ligne, 700)` sauf pour `000` et `001`, écrites brutes. CRLF, y compris après la dernière ligne, sans BOM.

**Décisions techniques** :

- API pure, sans entrée-sortie : `lireAc056(octets)` renvoie la structure (fichier, dossiers, évènements, bénéficiaires) et les anomalies. `ecrireAc056(structure)` renvoie des octets. Chaque enregistrement garde son numéro de ligne d'origine.
- Écriture : régénération à la Lazarus (bourrage à droite, `000` et `001` brutes), mais **dans l'ordre d'origine des lignes, impérativement** (divergence 3). L'ordre est identique pour un fichier VEOS bien formé.
- Format d'origine conservé : CRLF ou LF, BOM, saut de ligne final. Un format différent de CRLF sans BOM est signalé à la lecture comme anomalie non bloquante.
- `modifierChamp` (équivalent de `ModifierDonnee`) dès la v0.1.0, limitée aux 23 champs modifiables.
- Divergence 1 : une valeur plus longue que son champ est refusée avec une erreur.
- Divergence 2 : les lignes vides sont signalées comme anomalie non bloquante et supprimées à la réécriture. Elles ne doivent jamais arriver (jamais constatées), le cas est prévu par sécurité. La décision de réenregistrer au chargement relève de l'écran (v0.3.0).

**Tests** :

- Corpus : relecture puis réécriture = original, par SHA-256, sur chaque fichier de `IN\`. Chaque écart est analysé au cas par cas.
- Fichiers modifiés par Lazarus : la même modification par `modifierChamp` produit les mêmes octets.
- Synthétiques : LF, BOM, absence de saut de ligne final, lignes vides, valeur trop longue.

**Fichiers impactés** : `src/shared/domain/ac056/` (lecteur, écrivain, modèle, modification) et leurs tests.

**Décisions d'implémentation** (2026-10-13) :

- Modèle :
  - valeurs gardées en octets, jamais décodées : type marqué `Octets`, chaîne binaire à un caractère par octet. `TextDecoder('latin1')` est interdit (c'est du windows-1252) ;
  - liste plate `lignes` dans l'ordre d'origine, seule source de l'écrivain, plus une hiérarchie par indices calquée sur `utypes.pas` (`e000`, `dossiers`, `evenements`, `beneficiaires`, `e110`…) ;
  - chaque ligne garde `numero` (base 1, lignes vides comptées), `origine` (octets lus) et sa propre fin de ligne.
- Nature des lignes :
  - ligne décrite : 700 octets d'une entité non brute ;
  - ligne brute, réécrite à l'identique : 000, 001, 990, 995 et 999, plus provisoirement toute ligne de longueur différente de 700 ou de code inconnu, en attendant l'item 4.
  - Le rattachement à la hiérarchie se fait d'après le code, quelle que soit la nature de la ligne. Une entité unique en double : la dernière gagne, comme dans Lazarus, et la précédente reste à sa place sans être rattachée.
- Parité Free Pascal : `trimFpc` retire tout octet inférieur ou égal à `0x20`. `addCharR` bourre à droite sans jamais tronquer.
- Fins de ligne : un CR seul est reconnu comme fin de ligne (parité `ReadLn`).
- Anomalies non bloquantes : BOM, fins de ligne LF ou CR, lignes vides. **L'absence de saut de ligne final n'est pas une anomalie** : c'est le format normal des fichiers VEOS.
- `modifierChamp` :
  - limité aux 23 champs modifiables ; valeur encodée en UTF-8 sans Trim ;
  - refus d'une valeur plus longue que le champ (divergence 1) ou contenant un CR ou un LF. Le `TEdit` de Lazarus est monoligne : ce n'est pas une divergence ;
  - les messages d'erreur ne contiennent jamais la valeur.
- **Règle d'écran reportée en v0.3.0** : dans Lazarus, tous les champs sont verrouillés à l'ouverture (`VerrouillerComposants`). Seuls les champs signalés par les contrôles sont déverrouillés (`MarquerControleErreur`). Le domaine ne l'impose pas : c'est l'écran AC056 qui ne rendra modifiables que les champs en erreur.
- Corpus `MODIFIES\`, deux fichiers par cas :
  - `X.txt` : le fichier enregistré par Lazarus ;
  - `X.modification.txt` : `original=`, `ligne=`, `champ=` (nom Flussi exact), `valeur=` (texte saisi, tel quel).
  - Pour déverrouiller le champ dans Lazarus, on le piège au préalable dans une copie. Le test applique la modification à `IN\<original>` et ajoute un CRLF final si l'original n'en a pas (divergence 8), puis compare par SHA-256.
- Contrôle préalable des 3 cas de `MODIFIES\` le 2026-10-13, par simulation, sur les positions seulement :
  - une seule ligne diffère de l'original, en plus du CRLF final ;
  - la régénération de Lazarus est donc sans effet sur ces 3 fichiers VEOS ;
  - le rang de personne saisi « 1 » est écrit « 10 ».
- Résultats du 2026-10-13 :
  - corpus `IN\` : les 9 fichiers relus puis réécrits sont identiques à l'original par SHA-256, sans aucune anomalie, et chaque ligne est rattachée à la hiérarchie. Le Trim de Lazarus n'a donc aucun effet sur les fichiers VEOS réels ;
  - corpus `MODIFIES\` : les 3 cas reproduisent Lazarus octet par octet, au CRLF final près (divergence 8).
  - Tests : `npm test` (822 tests) et `npm run test:corpus` (17 tests) passent.
- Helpers de test ajoutés :
  - `src/shared/test/ac056-synthetique.ts` : lignes et fichiers synthétiques construits depuis `ENTITES` ;
  - `src/shared/test/comparaison-ac056.ts` : SHA-256 et écart localisé par entité et champ, sans valeur ;
  - `decrireSousDossierCorpus` (dans `src/shared/test/corpus.ts`) : sous-dossier du corpus ignoré s'il est absent ou vide, obligatoire en mode corpus. Il resservira pour `PIEGES\` à l'item 5.
- Non bloquant, reporté (revue d'item du 2026-10-13) :
  - `addCharR` passe par `TextEncoder` pour répéter un caractère ASCII. Le remplacer par une répétition directe dans `octets.ts` au plus tard à l'item 4, qui fixe un critère de performance.
  - `texteDepuisOctets` retire un BOM en tête de valeur : passer `ignoreBOM: true` avant l'affichage en v0.3.0.
  - Le type `FinDeLigne` de la fabrique synthétique a le même nom que celui du domaine, avec un sens différent : à renommer.
  - Le test corpus « sans saut final » vérifie la donnée VEOS, pas le code. Il sert de sentinelle du format.

---

### 4. Fichiers AC056 mal formés

**Statut** : Terminé
**Pattern** : aucun

**Description** — Détection des anomalies de structure, localisées par numéro de ligne, sans jamais perdre de ligne. Le reste du fichier reste consultable.

**Constat Lazarus** (`AjouterEntite` dans `uac056.pas`) : une entité inconnue affiche un message puis la ligne est perdue à l'enregistrement. Une ligne mal placée lève une exception, inscrite au journal, et la ligne est aussi perdue. Une ligne trop courte n'est pas contrôlée : elle est complétée par des espaces sans avertissement. En l'absence de `000`, Lazarus écrit une ligne vide.

**Décisions techniques** :

- Anomalies de structure détectées :
  - fichier vide ;
  - longueur de ligne différente de 700 octets ;
  - code d'entité inconnu (hors des 22) ;
  - ordre inattendu : place non autorisée par la hiérarchie (`405` sans `400`, `100` avant `001`, ligne après `999`…) ;
  - `000` absent ou pas en première ligne, `999` absent ou pas en dernière ligne, `001` sans `995`, `100` sans `990`. Un fichier tronqué est couvert par ces règles.
- Divergence 6 : une ligne en anomalie est conservée brute, à sa place, et réécrite à l'identique.
- Les anomalies de structure sont **bloquantes** : ni enregistrement ni dépôt MSP. Elles ne se corrigent pas dans un champ, la seule issue est de relancer l'export VEOS, et Flussi le dit explicitement. Non bloquants : lignes vides, format LF ou BOM.
- Lecture exhaustive : jamais d'arrêt à la première anomalie.

**Performance** : lecture et contrôle complet en moins d'1 s sur le plus gros fichier du corpus (387 Ko, environ 550 lignes). Mesure indicative, non bloquante, sur un fichier synthétique dix fois plus gros.

**Fichiers impactés** : lecteur (`src/shared/domain/ac056/`), tests synthétiques par cas.

**Point d'attention pour l'item 4** (laissé par l'item 3, voir ses décisions d'implémentation) :

- **Point de départ** : ces cas sont déjà conservés à leur place et réécrits à l'identique (divergence 6 acquise). Il reste à produire les anomalies bloquantes.
  - Toute ligne de longueur différente de 700 octets ou de code inconnu est aujourd'hui une `LigneBrute` (`nature: 'brute'`), sans anomalie. Une ligne d'espaces est brute avec un code `null`.
  - La hiérarchie (`hierarchie.ts`) rattache d'après le code, quelle que soit la nature de la ligne.
  - Une fille sans parent courant n'est pas rattachée.
  - Pour une entité unique en double, la dernière gagne et la précédente reste dans `lignes` sans être rattachée.
- **Repérer ces cas** :
  - lignes non rattachées : comptage des rattachements, comme `compterRattachements` dans `lecteur-ecrivain.corpus.test.ts` ;
  - lignes brutes hors 000, 001, 990, 995 et 999.
- **Modèle** : étendre `CodeAnomalie` (`modele.ts`) et produire les nouvelles anomalies avec `bloquante: true`. Les anomalies de format (`bom`, `fin-de-ligne-lf`, `fin-de-ligne-cr`) et `ligne-vide` restent non bloquantes. L'absence de saut de ligne final n'est pas une anomalie (format VEOS).
- **Performance** : `addCharR` (`fpc.ts`) passe par `TextEncoder` pour répéter un caractère ASCII, environ 45 000 appels sur le plus gros fichier. Le remplacer par une répétition directe dans `octets.ts` (par exemple `repeterOctet(caractere, n)`) avant de mesurer le critère d'1 s.
- **Fabrique** : `src/shared/test/ac056-synthetique.ts` (`ligneSynthetique`, `fichierSynthetique`, `lignesCompletes`) produit les fichiers synthétiques de chaque cas. Son type `FinDeLigne` porte le même nom que celui du domaine avec un sens différent (sans `''`) : à renommer en passant.

**Décisions d'implémentation** (2026-10-13) :

- `controlerStructure` (`structure.ts`) : passe séparée de `construireHierarchie`, qui reste fidèle à Lazarus (le dernier gagne, aucun curseur fermé). `lireAc056` ajoute ses anomalies après celles de format, puis le tri reste le même (niveau fichier, puis numéro de ligne).
- 6 anomalies, toutes bloquantes. Les messages ne contiennent jamais de valeur lue :
  - `fichier-vide` : aucune ligne non vide. Émise seule ;
  - `longueur-ligne` : toute ligne ≠ 700 octets, brutes comprises ;
  - `entite-inconnue` : code inconnu sur une ligne d'au moins 25 octets. En dessous, `longueur-ligne` seule ;
  - `entite-mal-placee` : hors d'un dossier, d'un évènement ou d'un bénéficiaire ; 000 ailleurs qu'en première ligne de code connu ; 999 ailleurs qu'en dernière ;
  - `entite-en-double` : fille unique répétée, ou 990 / 995 répétée (« déjà ligne M », M = première occurrence) ;
  - `entite-absente` : 000 ou 999 absente (niveau fichier), évènement sans 990 (sur la 100), dossier sans 995 (sur la 001).
- Automate piloté par une table `{ parent, rôle }` par code (`ouvre`, `unique`, `multiple`, `ferme`), avec cas particuliers 000, 001 et 999 :
  - une 100 ou une 400 mal placée ouvre quand même son niveau : ses filles ne sont pas signalées en cascade ;
  - la 999 ne ferme rien : une 999 au milieu d'un évènement donne une seule anomalie ;
  - une 001 absente donne une anomalie par 100 du dossier, plus la 995.
- **Plus strict que Lazarus** : la 990 ferme l'évènement et la 995 le dossier. Lazarus accepte une 110 ou une 405 après la 990 et la rattache à l'évènement. Flussi la signale « mal placée », ce qui est conforme à « place non autorisée par la hiérarchie ».
- **Non contrôlé** :
  - ordre entre lignes sœurs (130 avant 110, 110 après une 400) : Lazarus l'accepte, Flussi conserve l'ordre (divergence 3) ;
  - fichier `000 999` sans dossier, dossier `001 995` sans évènement : acceptés.
- **Limites connues** :
  - une 400 absente sur un bénéficiaire qui n'est pas le premier n'est vue que par le doublon d'une fille unique (405, 410, 411, 800). Les 485, 490 et 700 sont rattachées au bénéficiaire précédent sans anomalie ;
  - seule une cohérence de l'en-tête (`numDossier`, `numEvt`, `rang`) le verrait. Lazarus ne la contrôle pas : hors périmètre.
- **Garantie testée** : sans anomalie bloquante, chaque ligne est rattachée exactement une fois, avec la 000 en tête et la 999 en dernier. Vérifiée sur 177 155 suites exhaustives (longueur 5, 11 codes), 5 000 suites aléatoires et toutes les mutations d'une ligne de `lignesCompletes`.
- `ecrireAc056` reste permissif : un fichier mal formé est réécrit à l'identique (divergence 6, testée sur chaque scénario). Le refus d'enregistrer et de déposer appartient aux services et à l'écran.
- Note Lazarus : `AjouterEntite000` vide les dossiers et la 999. Pour deux fichiers concaténés, Lazarus perd le premier sans le dire. Flussi signale la seconde 000 et la première 999.
- `addCharR` passe par `repeterOctet` (`octets.ts`) au lieu de `TextEncoder`. Cela n'agit que sur l'écrivain.
- Helpers de test :
  - `FinDeLigneSynthetique` (renommage) ;
  - `lignesCompletes({ dossiers })` ;
  - `lignesDepuisCodes` ;
  - `compterRattachements` sorti du test corpus vers `src/shared/test/rattachements-ac056.ts`.
- **Performance** (lecture et contrôle de structure, sans les contrôles de l'item 5) :
  - plus gros fichier de `IN\` (386 800 octets, 551 lignes) : médiane de 18,7 ms, test corpus bloquant à 1 s ;
  - fichier synthétique 10× (5 442 lignes, 3,8 Mo) : médiane d'environ 520 ms, garde-fou à 5 s dans `npm test`.
  - À remesurer à l'item 5, avec le contrôle complet.
- Résultats : `npm test` (1 042 tests) et `npm run test:corpus` (18 tests) passent. Aucune anomalie de structure sur les 9 fichiers de `IN\`.
- **Reporté en v0.3.0** : l'écran affiche la consigne d'un fichier en anomalie bloquante. Il ne peut être ni enregistré ni déposé ; relancer l'export VEOS.
- Non bloquant, reporté (revue d'item du 2026-10-13) :
  - `CODES_FORMAT` est déclaré en double (`lecteur.test.ts`, `structure.test.ts`) et typé `string[]`. Le passer en un seul `readonly CodeAnomalie[]` dans `src/shared/test/`.
  - `structure.ts` : deux `code as CodeEntite` dans des helpers déclarés avec `function`. Des fonctions fléchées déclarées après le test `code === null` les rendraient inutiles.
  - `octets.test.ts` contient des caractères NUL littéraux : git le traite comme binaire. Passer à des échappements `'\x00'`.
  - Écart des mesures de performance (18,7 ms pour 551 lignes sur le corpus, environ 520 ms pour 5 442 lignes en synthétique). Aucun terme quadratique trouvé ; la mesure synthétique a probablement été faite en parallèle d'autres tests. À remesurer dans les mêmes conditions à l'item 5.

---

### 5. Règles de contrôle, jeu de caractères et codes de rejet ERRxxx

**Statut** : Terminé
**Pattern** : aucun

**Description** — Portage à l'identique des contrôles de Lazarus, contrôle du jeu de caractères sur tous les champs, table des codes de rejet `ERRxxx` avec leur explication. Fusion des items 4 et 5 de la roadmap.

**Contrôles portés** (`ucontrole.pas`, messages Lazarus mot pour mot, erreur localisée par ligne, entité et champ) :

| Contrôle | Champs |
|---|---|
| `LISTE_1` : `0-9 A-Z espace - ' / .` | nom et prénom 1 (115, 405), nom de jeune fille (405), complément géographique, numéro et libellé de voie, lieu-dit, localité (120) |
| `LISTE_2` : `LISTE_1` + `a-z _ @` | valeur de coordonnée (125) |
| `LISTE_3` : `0-9 A-Z` | numéro INSEE (115, 405) |
| Numérique, longueur 5 | code postal (120) |
| Rang < 21 si `ASSPRI` ou `CONJOI`, < 40 si `ENFANT` (type d'assuré de la `400`) | rang de bénéficiaire (400, 405, 410, 485, 490, 700, 800), rang de personne (400, 800) |
| Valeurs imposées | 485 : code `COEFCO`, valeur `COUPLE` (contrôlés quel que soit le champ). 490 : code `COEFCO` ou `REDAN`, valeur `NON` |

Non contrôlés par Lazarus et non ajoutés : entités `100`, `110`, `130`, `135`, `155`, `180`, prénoms 2 à 4.

**Décisions techniques** :

- Deux modes : contrôle complet, et contrôle d'un seul champ (sortie de champ).
- Jeux de caractères en constantes partagées, reportées depuis `uconstantes.pas` (l. 70 à 74) sans copier le fichier. Le jeu étendu `a-z _ @` est confirmé par Lazarus, ce n'est plus une hypothèse.
- Positions en octets (Lazarus : `{$H+}`, `AnsiString`, `Copy` compte des octets) : découpage sur les octets bruts, puis décodage par champ, jamais la ligne entière avant découpage.
- Divergence 5 : tout octet ≥ `0x80` ou caractère de contrôle, dans tout champ de toute entité, produit « Entité NNN : caractère non autorisé dans {champ} ». Pas de recalage : erreur sur le champ, plus longueur de ligne incorrecte (item 4). Les champs suivants restent lus à leurs positions en octets.
- Divergence 4 : rang non numérique → « Entité NNN : rang non numérique ».
- `ERRxxx` : 27 codes (`ERR001` à `ERR027`), reconnus dans le message MSP par 1 à 3 chaînes (modes début, contenu, fin, égalité). Sinon « Erreur inconnue. Contactez le service informatique. ».
- Les explications de `Rejets - Explications.txt` (sections `[ERRxxx]`) sont intégrées au code du domaine. Le fichier n'a jamais été modifié. Une évolution éventuelle se fera dans le code.

**Tests** :

- Parité avec `CORPUS-DEV\PIEGES\` : mêmes erreurs que le relevé manuel de Lazarus. Les fichiers piégés doivent être créés par l'utilisateur avant cet item.
- Synthétiques : une règle par test. Caractère interdit au début, au milieu et à la fin d'un champ, au premier et au dernier octet de la ligne. Caractères de 2, 3 et 4 octets (`é`, `€`, emoji). Caractère interdit dans un champ non contrôlé par Lazarus et dans une ligne brute (`000`, `990`, `995`, `999`).

**Fichiers impactés** : `src/shared/domain/ac056/` (contrôles, jeux de caractères, `ERRxxx`, explications) et leurs tests.

**Point d'attention pour l'item 5** (laissé par l'item 3) :

- **`PIEGES\`** : `decrireSousDossierCorpus('PIEGES', …)` (`src/shared/test/corpus.ts`) est prêt. Le `describe` est ignoré par `npm test` si le dossier est absent ou vide, et lève une erreur avec `npm run test:corpus`. Exemple d'usage : `modification.corpus.test.ts`, inventaire des paires et notes lues uniquement dans les `it`.
- **Valeurs en octets** : les valeurs lues sont des `Octets` (`octets.ts`), une chaîne binaire à un caractère par octet, jamais décodée. Les contrôles de jeu de caractères et d'octet ≥ `0x80` se font directement dessus (`charCodeAt`, regex ASCII), sans décodage.
  - `Trim` déjà appliqué : les champs `trim` sont lus avec `trimFpc`, qui retire les octets ≤ `0x20` en bordure. Un caractère de contrôle en bordure d'un champ `trim` a donc déjà disparu de la valeur. Pour le signaler (divergence 5), contrôler aussi `origine`, la ligne lue et jamais modifiée.
- **Rang du bénéficiaire** : le type d'assuré de la 400 se trouve par la hiérarchie (`beneficiaires[].e400`, indices dans `fichier.lignes`).
- **Contrôle d'un champ** : à la sortie d'un champ, il s'appliquera à la valeur produite par `modifierChamp` (`modification.ts`).
- **Écarts dans le corpus** : `comparaison-ac056.ts` (`decrireEcartAc056`) les décrit par fichier, ligne, octet, entité et champ, sans valeur.

**Décisions d'implémentation** (2026-10-13) :

- **Constats Lazarus** (`ucontrole.pas`, `fmain.pas`, `utypes.pas`) :
  - `ControlerEvenements` tourne au chargement d'un fichier VEOS et avant l'enregistrement, refusé s'il reste une erreur. Jamais avant le dépôt, jamais sur un rejet.
  - `s_type_assure` des 405, 410, 485, 490, 700 et 800 est celui de la 400 : aucun de ces records n'a ce champ, le `with` imbriqué se résout vers la 400.
  - `StrToInt` n'est évalué que pour les types `ASSPRI`, `CONJOI` et `ENFANT` (évaluation courte). Pour un autre type, un rang n'est jamais contrôlé, même non numérique.
  - Jeux relus dans `uconstantes.pas` (l. 70 à 74), contrôle octet par octet.
- **API** :
  - `controlerAc056(fichier)` : contrôle complet, passe séparée de `lireAc056`. Les rejets de l'item 6 ne sont jamais contrôlés, et l'écran recontrôle après une modification.
  - `controlerChamp(fichier, cible)` : contrôle complet filtré sur une ligne et un champ.
  - Le résultat est une liste d'`AnomalieAc056`, toutes bloquantes, avec le nouveau champ `champ`.
- **Codes d'anomalie** :
  - règles Lazarus : `caractere-non-autorise`, `code-postal-longueur`, `rang-incoherent`, `valeur-imposee` ;
  - divergences : `rang-non-numerique` (4) et `caractere-interdit` (5).
  - Le tri se fait par ligne, puis position du champ, puis ordre des règles de `ControlerEvenement`.
- **Règles Lazarus** : table déclarative `REGLES` (`controle.ts`), parcourue par la hiérarchie.
  - Une ligne brute de code connu (≠ 700 octets) est lue par `lireValeurs` aux positions de Lazarus.
  - Le `s_num_dossier_n <> ''` est porté littéralement, mais il est impossible sur une ligne lue.
- **Divergence 5** :
  - octet < 0x20, 0x7F ou ≥ 0x80, dans tout champ de toute ligne de code connu, entités brutes comprises ;
  - examiné dans `origine`, ce qui signale aussi un octet de contrôle retiré par `trimFpc` en bordure ;
  - pour un champ modifié, c'est la valeur saisie qui est examinée : `LigneDecrite.champsModifies` est posé par `modifierChamp` ;
  - les octets au-delà de 700 sont rattachés au dernier champ ;
  - une ligne de code inconnu n'est pas contrôlée ;
  - un seul message par champ : rien de plus si la règle Lazarus a déjà signalé le champ.
- **Libellés** :
  - formulation Lazarus pour les champs qu'il nomme (« le nom », « le rang de bénéficiaire », « le code »…) ;
  - « le champ {nom} (octets X à Y) » pour tous les autres ;
  - les vrais libellés des champs affichés viendront avec l'écran (v0.3.0).
- **`strToIntFpc`** (`fpc.ts`) : port de `Val` (FPC 3.2). Il accepte les espaces et tabulations de tête, le signe, les préfixes `$ x X % &` et `0x`, et s'arrête sur `#0`. Il échoue sur `''` et sur un espace de fin. Un rang non numérique (divergence 4) donne « Entité NNN : rang non numérique », pour `rang` comme pour `rangPersonne` : c'est le champ qui les distingue.
- **Codes de rejet** (`codes-rejet.ts`) :
  - Table `REJETS` des 27 codes, dans l'ordre Lazarus, avec les modes `debut`, `contenu`, `fin` et `egalite`.
  - `identifierRejet(message)` retient le premier code dont toutes les recherches correspondent. Le message est pris tel quel.
  - Explications « Aide ERRxxx » reprises mot pour mot. Ce sont des textes provisoires, à réécrire dans le code.
  - Un message vide ou non reconnu donne « Erreur inconnue. Contactez le service informatique. » (divergence 10).
  - Chevauchements figés par les tests : ERR010 l'emporte sur ERR027, ERR013 sur ERR014.
- **Tests de parité Lazarus** :
  - `controle.lazarus.test.ts` : les 28 contrôles et messages extraits de `ucontrole.pas` sont vérifiés par le comportement. La réciproque est vérifiée aussi : la table produit exactement ces 28 messages.
  - `codes-rejet.lazarus.test.ts` : les 27 appels de `urejetsdescription.pas` et l'algorithme d'explication sont rejoués.
- **Corpus** (`controle.corpus.test.ts`) :
  - Aucune anomalie de contrôle sur les 9 fichiers de `IN\` ni sur les 3 de `MODIFIES\`, enregistrés par Lazarus.
  - `PIEGES\` : relevé lu par `lireReleveLazarus` (`src/shared/test/releve-lazarus.ts`), au format RTF de WordPad ou en texte. Comparaison en multiensemble (dossier, évènement, message), hors codes de divergence.
  - `MATH_20260923_054813` : 34 erreurs Lazarus, 34 Flussi, aucun écart. Le fichier couvre 22 des 28 messages.
- **Performance** (lecture + contrôle complet, mesures isolées) :
  - plus gros fichier de `IN\` (551 lignes) : 25 à 30 ms, dont 19 à 22 ms de lecture ;
  - synthétique 10× (5 442 lignes) : 270 à 285 ms ;
  - coût linéaire d'environ 37 µs par ligne : le contrôle ajoute environ 30 % à la lecture.
  - L'écart de l'item 4 (18,7 ms contre environ 520 ms) venait de la taille (9,9×) et de la charge des tests lancés en parallèle.
- **Dette de l'item 4 soldée** :
  - `CODES_FORMAT` unique (`src/shared/test/codes-anomalies-ac056.ts`) ;
  - plus de `as CodeEntite` dans `structure.ts` ;
  - NUL de `octets.test.ts` échappés.
- **Fabrique** : `lignesCompletes()` est conforme aux contrôles (code postal, 485 `COEFCO`/`COUPLE`, 490 `COEFCO`/`REDAN` + `NON`, types d'assuré `ASSPRI`/`CONJOI`).
- **Résultats** : `npm test` (1 530 tests) et `npm run test:corpus` (24 tests) passent.
- **Reste à couvrir dans `PIEGES\`**, par un second fichier piégé, non bloquant :
  - 120 : complément géographique, numéro de voie, lieu-dit ;
  - 405 : numéro INSEE, nom de jeune fille ;
  - 800 : rang de personne ;
  - `ENFANT` ≥ 40, et 21 à 39 sans erreur ;
  - 490 `REDAN` ;
  - divergence 5 : tabulation en tête d'un nom, accent dans un champ non contrôlé.
- **Reporté en v0.3.0** (écran) et aux services :
  - Lazarus ne contrôle pas avant le dépôt : l'écart avec Flussi reste à trancher au dépôt MSP.
  - À la sortie d'un champ, Lazarus vide toutes les erreurs de l'évènement et ne recrée que celles du champ et des 485/490 (défaut d'écran). Le domaine ne le reproduit pas : l'écran remplacera seulement les anomalies du champ modifié.
- Non bloquant, reporté (revue d'item du 2026-10-13) :
  - `strToIntFpc` renvoie `null` au-delà de 2^31 - 1 en base 16, 8 ou 2, là où FPC étend le signe (`$FFFFFFFF` → -1). Ce cas est inatteignable : les rangs font 2 octets, et `modifierChamp` refuse une valeur plus longue que le champ. Seul le commentaire, qui annonce « comme `Integer` de FPC », est à préciser.
  - `REJETS` n'est pas gelé en profondeur, alors que les anomalies et le résultat d'`identifierRejet` le sont. À geler avant que l'item 6 ne le consomme.
  - `REGLES`, `Verdict` et `RegleLazarus` sont exportés de `controle.ts` pour les tests de parité seulement (pas par `index.ts`).

---

### 6. Fichiers de rejet MSP (Windows-1252)

**Statut** : Terminé
**Pattern** : aucun

**Description** — Lecture des fichiers de rejet MSP, décodage des messages en Windows-1252, rattachement de chaque message à son code `ERRxxx` et à son explication. **Lecture seule** : un rejet n'est jamais modifié ni redéposé, il sert uniquement à connaître la raison du rejet.

**Constat Lazarus** : rejet reconnu par le préfixe `AC056COUR_REJ_`. Chaque ligne est décodée (`WinCPToUTF8`) puis épurée (`Trim`). `000`, `001` et `999` sont ignorées, puis un `000` `REJET` et des `001` sont fabriqués. Octets 1 à 700 : ligne AC056. Octets 701 à 718 : identification (ex. `000910643 ESACI643`). À partir de l'octet 719 : message. Les contrôles ne sont pas exécutés.

**Décisions techniques** :

- L'origine (`veos` ou `rejet`) est fournie par l'appelant d'après le préfixe. Le domaine ne lit pas de nom de fichier.
- Décodage par zones en octets : 1 à 700 selon les descriptions de l'item 2, 701 à 718 conservés bruts, 719 et suivants décodés en Windows-1252 puis épurés.
- Divergence 7 : pas de lignes fabriquées. Les dossiers sont regroupés d'après les 17 premiers octets. Règles de l'item 4 adaptées : l'absence de `000`, `001` et `999` est normale, et une ligne doit faire au moins 718 octets.
- Pas d'écriture du format rejet, contrôles non exécutés (parité).
- Encodage incohérent avec l'origine, signalé comme anomalie non bloquante. Un fichier VEOS avec octets invalides en UTF-8 → « semble en Windows-1252 ». Un rejet avec BOM ou séquences UTF-8 multi-octets valides → « semble en UTF-8 ». L'ASCII pur est valide pour les deux.

**Tests** :

- Les 3 rejets de `CORPUS-DEV\OUT\` : aucun caractère de remplacement (U+FFFD) dans les messages. Comptage indicatif des messages rattachés à un `ERRxxx` et des « Erreur inconnue ».
- Synthétiques : rejet en UTF-8, fichier VEOS en Windows-1252.

**Fichiers impactés** : `src/shared/domain/ac056/` (lecture des rejets, décodage) et leurs tests.

**Point d'attention pour l'item 6** (laissé par l'item 4) :

- `controlerStructure` (`structure.ts`) est conçu pour un fichier VEOS. Pour un rejet, il faut :
  - accepter l'absence de `000`, `001` et `999` ;
  - remplacer la longueur exacte de 700 octets par « au moins 718 octets ».
- Les règles de placement sont dans la table `REGLES` et les cas particuliers 000, 001 et 999. C'est là qu'il faut adapter, d'après l'origine fournie par l'appelant. Aucun paramètre n'a été ajouté à l'item 4.

**Point d'attention pour l'item 6** (laissé par l'item 5) :

- `identifierRejet` (`codes-rejet.ts`) prend le message tel quel. Lazarus le prépare ainsi : ligne entière décodée (`WinCPToUTF8`), puis `Trim` de **toute la ligne**, puis `Copy(ligne, 719, …)`. Les espaces de tête du message sont donc conservés, ceux de fin retirés. Un message qui commence par un espace ne correspond à aucun mode `debut`.
- Dans Lazarus, le décodage précède le `Copy` : un caractère accentué dans les octets 1 à 718 décale le début du message. Le décodage par zones de l'item 6 (divergence déjà prévue) ne reproduit pas ce décalage.
- `controlerAc056` ne doit jamais être appelé sur un rejet (parité : `if not FFichierRejet then ControlerEvenements`).

**Décisions d'implémentation** (2026-10-13) :

- **Constats du corpus `OUT\`** (structure seulement, aucune valeur affichée) :
  - les rejets contiennent des 000, 001 et 999, dans l'ordre de MSP : `100 … 990 995 001` par dossier (la 001 après la 995), puis `000 999` en fin de fichier ;
  - 990, 995 et 001 ont les 17 premiers octets de la 100 de leur dossier, 000 et 999 ont les leurs ;
  - une ligne sans message fait exactement 718 octets, une ligne avec message jusqu'à 829 ;
  - octets ≥ 0x80 dans les messages seulement, fichiers invalides en UTF-8, CRLF, sans BOM ;
  - messages sur des 100, 400 et 700.
  - La décision « l'absence de 000, 001 et 999 est normale » est donc précisée : dans un rejet, leur présence, leur absence et leur place ne sont pas contrôlées.
- **API** :
  - `lireAc056(octets, provenance = 'veos')`. `provenance` (`'veos' | 'rejet'`) est recopiée dans `FichierAc056` : le nom `origine` désigne déjà les octets d'une ligne.
  - `LigneCommune.rejet?: MessageRejet` (`message`, `code`, `explication`) : présent sur toute ligne de rejet au message non vide, décrite ou brute (divergence 11).
  - Pas de champ pour l'identification (octets 701 à 718) : elle reste dans `origine`.
  - `DossierAc056.e001` devient `number | null`.
- **Lignes** :
  - une ligne est décrite à partir de 718 octets, si son code est connu et non brut ; ses valeurs sont lues sur les octets 1 à 700 ;
  - message (`rejet.ts`, `messageRejet`) : octets 719 et suivants, `trimDroiteFpc`, `texteWindows1252`, puis `identifierRejet` ;
  - espaces de tête conservés, de fin retirés : parité du `Trim` de la ligne entière.
- **Dossiers** : dans un rejet, un dossier est une suite de lignes de mêmes 17 premiers octets, 000 et 999 exclues. La règle est la même dans `construireHierarchie` et `controlerStructure`. La 001 se rattache au dossier sans toucher aux curseurs.
- **Structure d'un rejet** :
  - au moins 718 octets par ligne ;
  - 000 et 999 ni placées ni exigées, doublon signalé ;
  - 001 non placée, doublon signalé ;
  - 990 et 995 absentes signalées, la 995 sur la première ligne du dossier ;
  - table `REGLES` inchangée.
  - Garantie de l'item 4 conservée et testée : sans anomalie bloquante, chaque ligne est rattachée une fois (suites exhaustives jusqu'à 5 lignes, 11 000 suites aléatoires, mutations).
- **Anomalies** :
  - anomalies de format (`bom`, LF, CR, ligne vide) non émises pour un rejet, qui ne s'enregistre jamais ;
  - `encodage-incoherent`, non bloquante, niveau fichier : fichier VEOS invalide en UTF-8 ; rejet avec BOM, ou avec un octet non ASCII et valide en UTF-8 ;
  - l'ASCII pur ne déclenche rien. Un rejet en Windows-1252 qui forme par hasard de l'UTF-8 valide serait signalé : accepté.
- **Lecture seule** : `controlerAc056` renvoie `[]` (parité), `modifierChamp` refuse (`fichier-rejet`), `ecrireAc056` lève une erreur.
- **Décodage** : `texteWindows1252` utilise `TextDecoder('windows-1252')`. Il ne produit jamais U+FFFD : les 5 octets non définis deviennent des contrôles C1. Le test corpus vérifie donc aussi l'absence de C1.
- **Dette de l'item 5 soldée** : `REJETS` gelé en profondeur.
- **Résultats** :
  - corpus `OUT\` : aucune anomalie sur les 3 rejets, chaque ligne rattachée une fois, aucun U+FFFD ni C1 ;
  - 29 lignes avec message : 16 reconnues par un `ERRxxx`, 13 « Erreur inconnue », toutes distinctes (par fichier : 1/0, 14/10, 1/3) ;
  - `npm test` (1 813 tests) et `npm run test:corpus` (31 tests) passent.
  - Le test corpus lit les rejets une seule fois puis les met en cache : 7 relectures de `P:` dépassaient le délai de 5 s quand toute la suite tournait en parallèle.
- **Non bloquant, reporté** (revue d'item du 2026-10-13) :
  - La règle de longueur (au moins 718 octets en rejet, 700 en VEOS) est écrite deux fois, dans `lecteur.ts` et `structure.ts`. À regrouper dans `rejet.ts` si elle évolue.
  - `texteWindows1252` construit son `TextDecoder` au chargement du module. Sans ICU complet, l'import échouerait ; Electron et Node l'embarquent.
  - Le futur service d'enregistrement ne doit pas appeler `ecrireAc056` sur un rejet : il lève une erreur.
  - 13 messages sur 29 ne correspondent à aucun des 27 `ERRxxx`. Lazarus obtient le même message sur ces fichiers (octets 1 à 718 en ASCII), donc le même résultat. Examiner ces formulations avec le service administratif avant d'enrichir la table.
  - Écran (v0.3.0) : naviguer dans un rejet comme dans un fichier VEOS, afficher le message et l'explication de chaque ligne, sans Enregistrer ni Dépôt.

---

## Items retirés (YAGNI)

Aucun item retiré. Deux items de la roadmap ont été fusionnés :

- « Jeu de caractères AC056 autorisé » fusionné dans l'item 5 (contrôles) : mêmes constantes, mêmes messages, mêmes tests.
- « Fichier VEOS enregistré sans modification identique à l'octet près » fusionné dans l'item 3 (écrivain) : c'est une exigence sur l'écrivain, prouvée par le test SHA-256.

## Ordre de réalisation

| # | Item | Pattern | Justification |
|---|------|---------|---------------|
| 1 | Corpus de référence AC056 (hors dépôt) | aucun | Prérequis de tout le reste : copie des sources Lazarus, `AC056_CORPUS_DIR`, `test:corpus`, règles de confidentialité. Faible complexité. |
| 2 | Description des entités AC056 (000 à 999) | aucun | Socle du lecteur, de l'écrivain, des contrôles et des rejets. Gros travail de recopie, dont le risque est couvert par le test de cohérence sur 700 octets. |
| 3 | Lecteur et écrivain AC056, réécriture identique à l'octet près | aucun | Dépend de l'item 2. Cœur de la parité. Le SHA-256 sur le corpus valide aussi l'item 2 sur de vrais fichiers. |
| 4 | Fichiers AC056 mal formés | aucun | Prolonge le lecteur. Fixe tôt la règle « aucune ligne perdue, ordre conservé », avant que les contrôles ne s'appuient sur la structure. |
| 5 | Règles de contrôle, jeu de caractères et codes de rejet ERRxxx | aucun | Dépend des items 2 à 4. Parité sur `PIEGES\`, à créer par l'utilisateur avant l'item. |
| 6 | Fichiers de rejet MSP (Windows-1252) | aucun | Dépend du lecteur (3) et de la table `ERRxxx` (5). Lecture seule, le moins risqué. |
