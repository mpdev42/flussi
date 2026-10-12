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

---

### 1. Corpus de référence AC056 (hors dépôt)

**Statut** : Terminé
**Pattern** : aucun

**Description** — Jeu de fichiers AC056 réels servant de référence de parité avec Lazarus, rangé sur `P:` et jamais dans le dépôt. Mise en place de l'accès depuis les tests et copie des sources Lazarus de référence dans le dépôt.

**Dossier du corpus** : `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts\CORPUS-DEV\`

- `IN\` : 9 fichiers VEOS de 2026, de 4 Ko à 387 Ko, ASCII pur, sans BOM, CRLF, lignes de 700 caractères. Les fichiers corrigés dans Lazarus (écrasés à l'enregistrement) ne se distinguent pas des originaux.
- `OUT\` : 3 rejets MSP (09/09, 17/09, 23/09), Windows-1252, CRLF, lignes de 817 à 829 caractères, chacun rattaché à un fichier de `IN`.
- `PIEGES\` : créé par l'utilisateur le moment voulu (avant l'item 5). Copies de fichiers du corpus avec erreurs volontaires, accompagnées du relevé manuel des messages affichés par Lazarus. Lazarus n'enregistre pas un fichier en erreur.
- Fichiers modifiés par Lazarus : 2 ou 3 copies dont un champ est modifié puis enregistré dans Lazarus, avec la modification notée. Référence de l'écrivain (item 3), créées par l'utilisateur le moment voulu.
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

**Statut** : À faire
**Pattern** : aucun

**Description** — Lecture d'un fichier AC056 (octets → structure + anomalies), écriture (structure → octets), modification d'un champ. Un fichier lu puis réécrit sans modification est identique à l'original, octet par octet. Fusion des items 3 et 6 de la roadmap.

**Constat Lazarus** (`ChargerFichierAc056` et `EnregistrerFichierAc056` dans `fmain.pas`) :

- Lecture ligne par ligne (`ReadLn` : CRLF et LF), lignes vides ignorées, et fichier aussitôt réenregistré au chargement s'il en contenait.
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

---

### 4. Fichiers AC056 mal formés

**Statut** : À faire
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

---

### 5. Règles de contrôle, jeu de caractères et codes de rejet ERRxxx

**Statut** : À faire
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

---

### 6. Fichiers de rejet MSP (Windows-1252)

**Statut** : À faire
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
