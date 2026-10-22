# Backlog — Flussi

> Ce fichier centralise les idées d'évolution, bugs connus et questions ouvertes.
> Quand un item est planifié dans une version, il est déplacé dans `docs/roadmap.md`.
> Centraliser toutes les notes ici. Ne pas créer d'autre fichier de notes.

---

## Améliorations

_(aucune pour l'instant — les items de l'amorce du 2026-10-02 sont planifiés dans `docs/roadmap.md`)_
- Mettre l'application en plein écran

## Bugs probables / cas limites

_(aucun pour l'instant)_

## Questions ouvertes

- Renseigner `author` dans `package.json` ? Sans lui, l'éditeur est vide dans « Applications installées » et dans les propriétés de `Flussi.exe` — `package.json` (v0.2.0, item 5)
- Signer `Flussi.exe` ? L'invite UAC de l'enregistrement des secrets affiche « éditeur inconnu », et le principe actuel est « aucun achat » — `electron-builder.yml` (v0.2.0, revue release)
- Durée de conservation du journal nominatif (compte Windows, poste) à inscrire au registre des traitements : la décision actuelle est « nettoyage manuel » — `docs/backlog.md` (Décisions) (v0.2.0, revue release)
- Un fichier VEOS avec erreurs, ou mal formé, est tracé en `SUCCES` « Fichier NOM chargé : N erreurs » (Lazarus : « Le fichier … a été correctement chargé. ») : niveau et texte validés ? — `src/main/services/ac056/index.ts` (v0.3.0, item 1)
- Un rejet renommé en minuscules (`ac056cour_rej_…`) est lu comme un fichier VEOS (parité stricte avec `StartsWith` de Lazarus) : on garde ? — `src/shared/domain/ac056/provenance.ts` (v0.3.0, item 1)
- Rejet : un 0x1A au milieu d'une ligne d'au moins 718 octets ne produit aucune anomalie (rejet non contrôlé), là où Lazarus couperait le fichier : accepter et l'écrire dans la décision Ctrl-Z ? — `src/shared/domain/ac056/lecteur.ts` (v0.3.0, item 1)
- Tracer au journal un échec de la liste `IN`/`OUT` (dossier devenu inaccessible en cours de session) ? Aujourd'hui rien n'est écrit — `src/main/services/ac056/index.ts` (v0.3.0, item 1)
- Panneau du journal : libellés « Titre, Info, Succès, Erreur » et une icône par niveau, au lieu des majuscules et des deux icônes de la maquette : à confirmer — `src/renderer/src/components/journal-session.tsx` (v0.3.0, item 1)
- Le service administratif a-t-il des postes tactiles ? Au toucher, la correction d'un champ est appliquée avant le relâchement et un clic de navigation peut être perdu (correctif : écouter aussi `mousedown` et `mouseup`) — `src/renderer/src/pages/ac056/sortie-champ.ts` (v0.3.0, item 2)
- Frappe en cours à la fermeture (champ jamais quitté) perdue sans confirmation (parité Lazarus) : signaler « modifié » dès la première frappe ? — `src/renderer/src/pages/ac056/champ-ac056.tsx` (v0.3.0, item 3)
- Saisie refusée au même clic qu'« Enregistrer » : le fichier est enregistré sans elle ; bloquer avec un message ? — `src/renderer/src/hooks/use-fichier-ac056.ts` (v0.3.0, item 3)
- Corpus `OUT` : l'assertion « chaque message reconnu par un code ERRxxx » fera échouer `npm run test:corpus` dès qu'un nouveau message MSP y sera déposé (signal d'un code à ajouter, pas d'une régression) : la garder ou la passer en annotation ? — `src/shared/domain/ac056/rejet.corpus.test.ts` (v0.3.0, item 4)
- Divergence 11 : ajouter que le message est affiché à l'écran pour chaque ligne rejetée, y compris 485, 490, 411 et 990, que l'écran de Lazarus n'affiche pas ? — `docs/archives/version-0.1.0.md` (v0.3.0, item 4)
- Encadré MSP : `messageMsp` rogne aussi les espaces de tête, cause d'un « code inconnu » sans indice visible ; ne rogner que la fin ? — `src/renderer/src/pages/ac056/textes-ac056.ts` (v0.3.0, item 4)
- Rapports `flussi-bilan-rejets-*.md` (noms sans chiffre possibles) accumulés dans `%TEMP%`, protégés de la lecture par Claude par la seule consigne : supprimer après relecture, ajouter une règle `deny` ? — `src/shared/test/bilan-rejets.bilan.ts`, `.claude/settings.json` (v0.3.0, item 4)
- Zoom clavier (Ctrl+Plus, Ctrl+Moins, Ctrl+0) perdu avec le menu dans l'application installée : garder un menu minimal caché ? — `src/main/index.ts` (v0.3.0, item 3)
- Le main ne vérifie pas « champ en erreur » à l'enregistrement (conséquence de la décision 2 : un champ corrigé et enregistré reste modifiable) : accepté ? — `src/shared/domain/ac056/enregistrement.ts` (v0.3.0, item 3)
- Clic sur l'évènement ou le bénéficiaire déjà sélectionné : sans effet (implémenté à l'item 3), au lieu de rouvrir la première fiche en erreur : à valider — `src/renderer/src/pages/ac056/navigation-ac056.ts` (v0.3.0, item 3)
- Barrière d'erreur de l'écran AC056 : le contenu ne revient qu'au changement de fichier, même après un enregistrement réussi : voulu ? — `src/renderer/src/pages/ac056/barriere-fichier.tsx` (v0.3.0, item 3)
- 0x1A collé dans une valeur : accepté puis signalé `caractere-interdit` ; Lazarus (solution de repli) tronquerait le fichier à la relecture : refuser à la saisie ? — `src/shared/domain/ac056/modification.ts` (v0.3.0, item 3)
- `P:` qui ne répond plus pendant un enregistrement : la croix ne réagit pas, sans retour, jusqu'à la fin de l'écriture : acceptable ? — `src/main/fermeture.ts` (v0.3.0, item 3)

## Points reportés

> Actions techniques et décisions issues d'items livrés, reportées hors de leur version.
> Une entrée = l'action, le fichier concerné, l'origine. Le détail reste dans le fichier de
> version d'origine (`docs/version-{X}.md`, puis `docs/archives/` une fois la version finalisée).
> Ne pas confondre avec « Items différés » (idées de fonctionnalités écartées par `/backlog-bootstrap`).

### v0.4.0 — IGA

- Fichier retéléchargé sous le même nom après un enregistrement : la copie `IN\Originaux\NOM.txt` (jamais écrasée) n'est plus l'original du nouveau fichier. Avertir, horodater la copie ou la remplacer au téléchargement ? — `src/main/services/ac056/index.ts` (v0.3.0, item 3)

### v0.5.0 — MSP

- Refuser le dépôt d'un fichier en anomalie de structure — `src/shared/domain/ac056/structure.ts` (v0.1.0, item 4)
- Refuser le dépôt d'un fichier qui contient encore une erreur : contrôle complet avant le dépôt (divergence avec Lazarus validée le 2026-10-16 : Lazarus ne contrôle qu'au chargement et avant l'enregistrement ; l'enregistrement d'un fichier en erreur est permis depuis v0.3.0, item 3) — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Avant les premiers dépôts : une mise à jour Intune coupe Flussi ouvert (constaté au pilote), donc un dépôt en cours. Macro NSIS `customCheckAppRunning` qui sort avec le code 1618 (Intune retente plus tard) si Flussi est ouvert — `build/installer.nsh` (v0.2.0, item 5)
- Copies de conflit OneDrive listées comme des fichiers ordinaires dans l'écran AC056 (`copieConflitProbable` écarté par le service) : transmettre l'information et la signaler avant tout dépôt — `src/main/services/ac056/index.ts`, `src/shared/types/ac056.ts` (v0.3.0, item 1)

### v0.6.0 — Parcours complet et recette

- Confirmer le déploiement Intune sur le poste d'un collègue (le poste pilote est celui du développeur, aux réglages possiblement plus souples), dans le groupe pilote — `docs/deploiement-intune.md` (v0.2.0, item 5)
- Observer en conditions réelles ce que le pilote n'a pas rencontré : `P:` monté en retard (« Réessayer »), verrou OneDrive `EBUSY`/`EPERM`, copie de conflit — `src/main/adapters/stockage/` (v0.2.0, item 5)
- Vérifier sur l'application installée le bandeau « Journal non enregistré » (dossier `Journal` renommé pendant une session, puis enregistrement d'un secret) et un `secrets.bin` illisible (alerte puis recréation) — `docs/deploiement-intune.md` § 7 de la liste de contrôle (v0.2.0, item 7)
- Observer « Ouvrir dans l'Explorateur » avec `P:` déconnecté : message renvoyé, boîte système de Windows ou blocage jusqu'au délai réseau (boutons restés désactivés) — `src/main/services/parametres/index.ts`, `src/renderer/src/hooks/use-ouverture-dossier.ts` (v0.2.0, item 6)

### v1.0.0 — Mise en production

- Fin de ligne : `L1\r\r\nL2` est réécrit `L1\rL2` (une ligne vide supprimée donne un séparateur CR seul, sans anomalie bloquante). Reporter la fin de la ligne vide ou rendre `fin-de-ligne-cr` bloquante, avec un test — `src/shared/domain/ac056/decoupage.ts`, `src/shared/domain/ac056/ecrivain.ts` (v0.1.0, revue release)
- La fin de ligne d'une ligne vide supprimée est comptée dans l'anomalie LF/CR (message faux) : déplacer le comptage après le `continue` — `src/shared/domain/ac056/lecteur.ts` (v0.1.0, revue release)
- Jeux de caractères sans oracle indépendant du code : ajouter en extrait les lignes 70 à 74 de `uconstantes.pas` (sans secret), ou piéger les caractères limites (`, & ( + _ @`, une minuscule) — `src/shared/domain/ac056/jeux-caracteres.ts` (v0.1.0, revue release)
- `rang-non-numerique` écarté sans contrôle dans la comparaison `PIEGES\` : n'écarter que `caractere-interdit` et vérifier qu'il y en a 0 — `src/shared/domain/ac056/controle.corpus.test.ts` (v0.1.0, revue release)
- Remesurer la performance du chargement avec le contrôle complet, dans les mêmes conditions que la mesure de l'item 4 — `src/shared/domain/ac056/structure.test.ts` (v0.1.0, item 4)
- Vérifier sur l'application installée en production que le titre de la fenêtre est « Flussi » seul (non testable en dev, où `prod` est refusé) — `src/main/index.ts` (v0.2.0, item 2)
- À la première mise en production, archiver les anciens journaux de Lazarus (fichiers RTF et index commun) de `Transferts\Journal` dans un autre dossier, pour laisser `Transferts\Journal` à Flussi — `P:\…\Transferts\Journal` (v0.2.0, cadrage de l'item 4)
- Déploiement de production : groupe Intune de production distinct du groupe pilote, application « Flussi — configuration production » qui remplace celle de recette (supersedence), détection de `config.json` par empreinte SHA-256 (la présence seule ne redéploie pas un fichier modifié) — `docs/deploiement-intune.md`, `deploiement/intune/` (v0.2.0, item 5)
- Bascule d'un poste de recette en production : `secrets.bin` est unique et ne connaît pas le mode. Les secrets MSP (mot de passe et clé, comptes différents entre recette et production) sont à ressaisir pour le compte de production ; l'ajouter à la procédure de mise en production — `docs/deploiement-intune.md` § 7 (v0.2.0, item 7)
- Procédure de retour à la version N-1 par Intune (garder le `.intunewin` précédent, remettre sa valeur de détection) et renvoi vers le repli Lazarus `flussi_old` : mode d'échec n° 10 du pre-mortem — `docs/deploiement-intune.md` § 5-6 (v0.2.0, revue release)
- Durcissement de la fenêtre et du paquet : `will-navigate` et `window.open` refusés, CSP `default-src 'self'`, `sandbox: true`, menu et DevTools désactivés en production, fuses Electron, `asarUnpack: ['**/*.node']` explicite avec `koffi.node` dans le contrôle de la procédure — `src/main/index.ts`, `electron-builder.yml`, `docs/deploiement-intune.md` (v0.2.0, revue release)
- Réinitialiser le propriétaire de `%ProgramData%\Flussi` avant `/reset` (`icacls /setowner *S-1-5-32-544 /T`, nouveau code de sortie) : un compte standard qui crée le dossier en reste propriétaire — `build/installer.nsh` (v0.2.0, revue release)

### Module Ac056

- Liste `IN`/`OUT` : un dossier inaccessible masque l'autre et l'erreur ne dit pas lequel ; ajouter `emplacement` (nom logique) à `ErreurAc056` ou un résultat par dossier — `src/main/services/ac056/index.ts`, `src/shared/types/ac056.ts` (v0.3.0, item 1)
- Taille maximale au chargement (un gros `.txt` déposé par erreur saturerait le main), d'après la `taille` connue par la liste — `src/main/services/ac056/index.ts` (v0.3.0, item 1)
- Réponse IPC qui ne vient jamais (`P:` bloqué) : l'écran reste en chargement sans moyen d'annuler ; autoriser « Changer de fichier » en ignorant la réponse tardive — `src/renderer/src/hooks/use-fichier-ac056.ts` (v0.3.0, item 1)
- Choix du fichier : focus perdu après « Réessayer » et « Actualiser », squelettes à chaque retour (garder la liste avec `aria-busy`), trois boutons « Actualiser » à deux noms, « Aucun fichier » en double dans une carte vide, « IN »/« OUT » sans libellé accessible — `src/renderer/src/pages/ac056/` (v0.3.0, item 1)
- Erreurs : code système perdu pour `erreur-systeme` (journal compris), exception d'analyse sans trace console, exception IPC de `ac056:lister` affichée brute, lecture initiale du journal en direct en échec silencieuse — `src/main/services/ac056/index.ts`, `src/renderer/src/hooks/{use-chargement-stockage,use-journal-session}.ts` (v0.3.0, item 1)
- Stockage : fichier disparu entre la lecture du dossier et le `stat` gardé dans la liste (l'écarter sur `ENOENT`) ; date hors limites qui lève une `RangeError` (faux système de fichiers seulement) — `src/main/adapters/stockage/disque.ts` (v0.3.0, item 1)
- Noms réservés Windows (`CON.txt`) listés puis refusés par l'adapter à l'ouverture : les écarter de la liste — `src/main/services/ac056/index.ts` (v0.3.0, item 1)
- Fermeture juste après « Enregistrer » : verrou main posé dès la confirmation de fermeture (refus « Flussi se ferme »), sinon les lignes du journal d'un enregistrement arrivé pendant « Fin de session » sont perdues — `src/main/fermeture.ts`, `src/main/services/ac056/index.ts` (v0.3.0, item 3)
- Retour `interrompu` : renvoyer le signal « modifié » au main, `try/finally` autour du verrou d'`enregistrer`, éviter la boucle « Réessayer » sur un rejet zod — `src/renderer/src/hooks/use-fichier-ac056.ts` (v0.3.0, item 3)
- Messages d'échec d'enregistrement : titre contradictoire avec `fichier-modifie`, consigne « vérifiez le fichier » inapplicable, cause `verrou` sans rejeu, EISDIR/ENOTDIR en « fichier introuvable » — `src/renderer/src/pages/ac056/textes-ac056.ts`, `src/main/services/ac056/index.ts`, `src/main/adapters/stockage/erreurs.ts` (v0.3.0, item 3)
- `analyseReportee` : vérifier `bom`, `nature` et longueur des lignes, lever `ErreurEcritureAc056('invariant')` — `src/shared/domain/ac056/enregistrement.ts` (v0.3.0, item 3)
- Rangs : chiffres testés avant la longueur (« é5 »), code `valeur-trop-courte` à renommer — `src/shared/domain/ac056/modification.ts` (v0.3.0, item 3)
- Écran : focus perdu après « Réessayer » d'un chargement, confirmation générique à compteur 0, ponctuation et espaces insécables des nouveaux textes, `ErreurSaisie` homonyme dans le hook — `src/renderer/src/pages/ac056/`, `src/renderer/src/hooks/use-fichier-ac056.ts` (v0.3.0, item 3)
- Main : `did-navigate` au lieu de `did-start-navigation`, garde `will-navigate` (fichier déposé sur la fenêtre) — `src/main/index.ts` (v0.3.0, item 3)
- Déposer dans `MODIFIES` un cas ordinaire (rang sur 2 chiffres), puis remonter `MINIMUM_FICHIERS_CORPUS.MODIFIES` à 3 — `src/shared/test/corpus.ts` (v0.3.0, item 3)
- Tests corpus des rejets : « chaque ligne rejetée comptée une fois » égal par construction, « valeurs sans U+FFFD » presque toujours vrai en Windows-1252 (compter les valeurs non ASCII) — `src/shared/domain/ac056/rejet.corpus.test.ts`, `compteurs.test.ts` (v0.3.0, item 4)
- Libellé de structure « hors d'un bénéficiaire (après une 400…) » inexact pour un rejet (jamais affiché) ; totaux de `compteurs.test.ts:143` égaux par construction — `src/shared/domain/ac056/structure.ts`, `compteurs.test.ts` (v0.3.0, item 4)

### Dette technique (sans échéance)

- Outil de bilan des rejets : compter les entrées ni fichier ni dossier (liens, fichiers OneDrive « à la demande »), élargir la marque « À relire » (groupes présents dans peu de fichiers, mots en majuscules inconnus), masquer une adresse e-mail, `DOSSIER_TRAVAIL_PROD` importé du main, année 2026 fixée dans le code, `loadEnv('bilan')` qui lirait un `.env.bilan` non couvert par les règles `deny`, fausses « extensions » tirées des noms de fichiers non-rejets (morceaux de noms dans le rapport), année d'un nom sans date d'après le dossier `OUT\AAAA`, caractères invisibles et signes Markdown à rendre fidèlement, emplacement de la garde à tester — `src/shared/test/bilan-rejets.bilan.ts`, `bilan-rejets.ts` (v0.3.0, item 4)
- Test des explications couplé au document daté `docs/bilan-rejets-2026.md` (tout futur code doit y figurer) : vérifier l'inclusion avec des exceptions `null`, ou un document de référence non daté — `src/shared/domain/ac056/codes-rejet.test.ts` (v0.3.0, item 4)
- Activer `no-control-regex` dans ESLint (un U+0008 littéral rendait une assertion inopérante) — `eslint.config.js` (v0.3.0, item 4)
- E2e instable : `ac056-enregistrement.spec.ts:673` a attendu en vain l'alerte « Fichier enregistré » une fois (passé relancé seul) — `e2e/specs/ac056-enregistrement.spec.ts` (v0.3.0, item 4)
- Enregistrement AC056 : tracer en console `ErreurEcritureAc056.code` et le code d'un refus `correction-refusee` ; `modifierChamp` en O(N·L) près du plafond de 10 000 corrections — `src/main/services/ac056/index.ts`, `src/shared/domain/ac056/enregistrement.ts` (v0.3.0, item 3)
- Tests de l'enregistrement : test corpus qui régénère chaque ligne de `IN` à la manière de Lazarus (0 ligne différente attendue), `champEnErreur` tautologique, correction sur une ligne CP1252, clé par indice côté DOM, `interrompu` puis `fichier-modifie`, référence du bouton « Réessayer », U+FFFD littéral, faux `setEnabled`, `isEnabled()` après « Annuler », boîte inattendue déléguée à la vraie fonction dans la fixture e2e — `src/shared/domain/ac056/`, `src/renderer/src/`, `src/main/fermeture.test.ts`, `e2e/` (v0.3.0, item 3)
- Secrets : appeler `abandonnerCle()` au démontage de l'écran Paramètres, sérialiser `preparerCle` avec `enregistrer`, tracer au journal le refus d'une clé trop volumineuse ou illisible — `src/renderer/src/hooks/use-secrets.ts`, `src/main/services/parametres/secrets.ts` (v0.2.0, item 7)
- Secrets : délai maximal (environ 2 minutes) sur l'attente du Flussi élevé, au lieu d'`INFINITE` — `src/main/adapters/config/api-windows.ts` (v0.2.0, item 7)
- Regrouper les petites fonctions d'erreur recopiées (`codeErreur`, `messageErreur`, `codeSortieDisque`) — `src/main/adapters/config/{secrets,elevation,ecriture-secrets}.ts` (v0.2.0, item 7)
- `strToIntFpc` : préciser le commentaire « comme `Integer` de FPC », sans extension de signe au-delà de 2^31 - 1 en base 16, 8 ou 2 (cas inatteignable) — `src/shared/domain/ac056/fpc.ts` (v0.1.0, item 5)
- Règle de longueur de ligne (au moins 718 octets en rejet, 700 en VEOS) écrite deux fois : la regrouper dans `rejet.ts` si elle évolue — `src/shared/domain/ac056/lecteur.ts`, `src/shared/domain/ac056/structure.ts` (v0.1.0, item 6)
- `texteWindows1252` construit son `TextDecoder` au chargement : sans ICU complet, l'import échouerait (Electron et Node l'embarquent) — `src/shared/domain/ac056/octets.ts` (v0.1.0, item 6)
- `REGLES`, `Verdict` et `RegleLazarus` sont exportés de `controle.ts` pour les seuls tests de parité — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Après la v1.0, passer à Tailwind 4 (et `tailwind-merge` 3) : règle l'alerte Dependabot n° 3 `postcss-selector-parser`, classée « risque toléré », puis retirer les règles `ignore` correspondantes — `tailwind.config.js`, `.github/dependabot.yml`, `CLAUDE.md` (v0.2.0, item 1)
- À la première PR de sécurité qui toucherait un paquet bloqué, vérifier que les règles `ignore` par `versions` sont respectées (non documenté par GitHub) ; sinon, s'appuyer sur la procédure de `CLAUDE.md` — `.github/dependabot.yml` (v0.2.0, item 1)
- Vérifier que la règle `Read(//p/**/CORPUS-DEV/**)` bloque réellement la lecture du corpus (format des chemins `P:` dans les règles de permission non confirmé) — `.claude/settings.json` (v0.2.0, item 2)
- Messages du stockage : « élément verrouillé » plutôt que « fichier verrouillé » quand la cible est un dossier, et regrouper dans la boîte de démarrage les dossiers qui ont la même cause (`P:` non monté répété trois fois) — `src/main/adapters/stockage/erreurs.ts` (v0.2.0, item 3)
- Écran Journal : explication de « Copie de conflit » accessible au clavier (`Tooltip` ou texte `sr-only` au lieu de `title`), erreur des années affichée près des boutons d'années sans masquer le tableau du mois, analyse unique des noms dans `sessions` — `src/renderer/src/pages/journal/historique-journal.tsx`, `src/renderer/src/hooks/use-historique-journal.ts`, `src/main/services/journal/historique.ts` (v0.2.0, item 4)
- Journal : écriture partielle possible (lignes réécrites en double après une coupure pendant un ajout), `terminer()` sans délai maximal, ligne « Fin de session » absente si Windows ferme la session avec Flussi ouvert, session à cheval sur deux mois absente du mois affiché — `src/main/services/journal/session.ts`, `src/main/index.ts` (v0.2.0, item 4)
- `scripts/icone.mjs` laisse son profil Electron jetable `%TEMP%\flussi-icone` : le supprimer en fin de génération — `scripts/icone.mjs` (v0.2.0, item 5)
- Tests manquants : replis de `identite.ts`, hooks `use-chargement-stockage` et `use-etat-journal` (environnement DOM de test à prévoir), e2e de l'historique instable au changement de mois — `src/main/services/journal/identite.ts`, `src/renderer/src/hooks/`, `e2e/specs/journal.spec.ts` (v0.2.0, item 4)
- Hook `use-ouverture-dossier` sans test unitaire : verrou contre le double clic et démontage pendant une ouverture (même environnement DOM de test à prévoir) — `src/renderer/src/hooks/use-ouverture-dossier.ts` (v0.2.0, item 6)
- Secrets : champ mot de passe non contrôlé (React recopie la valeur dans l'attribut DOM `value`, visible dans les DevTools), avec un test DOM — `src/renderer/src/pages/parametres/secrets-vue.tsx` (v0.2.0, revue release)
- Élévation : empreinte SHA-256 du blob passée avec le canal (`--flussi-ecrire-secrets=<canal>:<sha256>`), fenêtre propriétaire (`hwnd`) de l'invite UAC, nouvelles tentatives sur le renommage de `secrets.bin` (verrou d'antivirus), messages d'échec traduits en consignes, argument invalide traité comme une erreur, `%ProgramData%` lu par `SHGetKnownFolderPath` — `src/main/adapters/config/{elevation,ecriture-secrets,api-windows}.ts`, `src/main/index.ts` (v0.2.0, revue release)
- Journal : attendre la file d'enregistrement des secrets avant `session.terminer()`, sinon la ligne « Secret renseigné » est perdue si la fenêtre se ferme pendant l'attente — `src/main/services/journal/session.ts`, `src/main/index.ts` (v0.2.0, revue release)
- Messages techniques bruts (« Error invoking remote method… ») affichés à l'écran, détail de l'erreur de configuration ni affiché ni tracé : message générique et `console.error` — `src/renderer/src/hooks/{use-secrets,use-ouverture-dossier,use-chargement-stockage}.ts`, `src/renderer/src/App.tsx` (v0.2.0, revue release)
- Tests : e2e du chemin `journal:etat-change` vers le bandeau « Journal non enregistré » ; tests de démontage de `use-secrets` et `use-ouverture-dossier` qui ne testent plus rien sous React 19 — `e2e/specs/`, `src/renderer/src/hooks/*.test.tsx` (v0.2.0, revue release)
- ESLint : étendre `no-restricted-imports` de `@primno/dpapi` et `koffi` au reste de `src/shared/**` (`schemas`, `types` ; le domaine est couvert depuis v0.3.0, item 1) et aux sous-chemins ; couvrir aussi l'import relatif `../../test/…` dans le domaine — `eslint.config.js` (v0.2.0, revue release ; v0.3.0, item 1)
- Passer en `devDependencies` les paquets du renderer déjà regroupés par Vite (`app.asar` de 48 Mo) — préférence — `package.json` (v0.2.0, revue release)
- Documentation : commentaire de `installer.nsh` (« lancé en administrateur »), contrôles des modules natifs dans la procédure Dependabot, retrait définitif d'un poste (supprimer `%ProgramData%\Flussi`), `README.md` (configuration et guides Intune) — `build/installer.nsh`, `CLAUDE.md`, `docs/deploiement-intune.md`, `README.md` (v0.2.0, revue release)
- Second lancement pendant une boîte de démarrage : rien de visible ; afficher « Flussi est déjà ouvert » — `src/main/index.ts` (v0.2.0, revue release)
- Corpus : aucun fichier ne se termine par 0x1A, le test corpus du Ctrl-Z ne vérifie rien sur des données réelles (règle couverte par des fichiers synthétiques). Ajouter un fichier `PIEGES\` si le cas apparaît — `src/shared/domain/ac056/ctrl-z.corpus.test.ts` (v0.3.0, item 1)
- Fenêtre sans `minWidth` : l'en-tête (environ 920 px, sans retour à la ligne) défile horizontalement si la fenêtre est réduite — `src/main/index.ts`, `src/renderer/src/components/cadre-application.tsx` (v0.3.0, item 1)
- `CardTitle` rend un `div` : composant partagé à patcher (prop de niveau), contourné par des `h2` écrits à la main dans l'écran AC056 — `src/renderer/src/components/ui/card.tsx` (v0.3.0, item 1)
- DRY renderer : focus du `h1` écrit deux fois (cadre et écran AC056), enveloppe d'écran et classes du `h1` copiées sur quatre écrans, alerte « … + Réessayer » en double (AC056 et Journal), `libelleOuvrir` qui reconstruit `titreSession` — `src/renderer/src/components/cadre-application.tsx`, `src/renderer/src/pages/` (v0.3.0, item 1)
- Rangement et typage renderer : `verrou-navigation.ts` (hooks hors de `hooks/`), `lib/niveaux-journal.ts` qui importe `components/ui`, refs `monte` et `courant` inutiles, ref d'`AlertTitle` typée titre avec `as="p"`, `aria-live` redondant avec `role="log"` — `src/renderer/src/` (v0.3.0, item 1)
- DRY main et domaine : `compter` du service Ac056 et `pluralize` du renderer, comparateur d'anomalies écrit deux fois, type écrit sur place dans le preload au lieu de `CibleFichierAc056`, `ListeAc056` hors de la forme `{ ok, valeur }`, `PREFIXE_FICHIER_REJET` réexporté sans usage, `provenanceDepuisNom` sur un nom avec chemin (JSDoc et test) — `src/main/services/ac056/index.ts`, `src/shared/domain/ac056/`, `src/preload/index.ts` (v0.3.0, item 1)
- Tests de l'item 1 de la v0.3.0 : tests sans preuve (« ne contrôle pas un rejet », « et lui seul », démontage sous React 19, hook de verrou sans fournisseur), `pousser` hors de `act`, assertions sur des classes Tailwind, seuil fixe de 2 s ; cas manquants (`ctrlZFinal` avec BOM, rejet fait seulement de 0x1A, `CON.txt`, `ENOENT`, focus au retour sur l'écran AC056, 1280 px sans défilement sur Journal et Paramètres) — `src/shared/domain/ac056/*.test.ts`, `src/renderer/src/`, `e2e/specs/ac056.spec.ts` (v0.3.0, item 1)
- Canaux `journal:*` : ils renvoient encore `ErreurStockage` complet à l'écran (chemin absolu, lecteur ou partage dans le message), contraire au principe « aucun chemin vers l'écran » de l'écran AC056 — `src/main/ipc/journal/index.ts` (v0.3.0, item 1)
- E2E : `EPERM` au nettoyage d'un dossier temporaire de la fixture (antivirus probable), rendu tolérant à l'item 2 de la v0.3.0 (avertissement au lieu d'un échec). Reste : un Electron orphelin n'est plus détecté si `app.close()` échoue (tuer `app.process()`), erreur de nettoyage sans trace dans le `catch` de `launchApp`, attente jusqu'à environ 21 s — `e2e/fixtures/electron.ts` (v0.3.0, items 1 et 2)
- DRY et YAGNI du domaine AC056 : `FAMILLES` et `CODES_STRUCTURE` en double, `controlerChamp`, `entreeListe`, `texteEntree` et `compterParLigne` exportés sans appelant en production, paramètre `_index` inutilisé de `controlerLigne`, `indices` (Map) non gelé — `src/shared/domain/ac056/` (v0.3.0, item 2)
- Rangement de l'écran AC056 : `use-navigation-ac056` importe `pages/` (sens des dépendances), `sortie-champ.ts` générique rangé dans `pages/`, logique des tranches en double avec `carte-fichiers.tsx`, `TabBar` non générique (casts `as`), copie de référence dans un `useEffect` — `src/renderer/src/` (v0.3.0, item 2)
- Partagé : token `w-panel-nav` inutilisé (le `content` Tailwind analyse aussi les tests), `var(--panel-nav-width)` sans valeur de repli, `select.tsx` en `focus:` au lieu de `focus-visible:`, `useEtatJournal` dans `App` (re-rendu complet en mode dégradé du journal), infobulle d'un onglet désactivé à vérifier à la main, `TextInput` qui peut rogner 1 px à `maxLength` — `tailwind.config.js`, `src/renderer/src/` (v0.3.0, item 2)
- Tests de l'item 2 de la v0.3.0 : `App.dom.test` (classe exacte, compte de rendus fragile), quatre cas inopérants de `utils.test`, `analyse.test` qui compare deux listes écrites à la main, cas manquants `TabBar`, `TextInput` et `JournalSessionEnDirect`, U+FFFD en clair et `\T` non échappé dans des tests du renderer, accents échappés dans un commentaire d'`octets.test`, e2e couplés aux classes Tailwind et au DOM, marge de 40 px du test « une colonne » à 1280 px — `src/`, `e2e/specs/ac056.spec.ts` (v0.3.0, item 2)

## Décisions

- Rétention : Flussi ne purge ni n'archive les fichiers IN, OUT et Journal. Le nettoyage reste manuel.
