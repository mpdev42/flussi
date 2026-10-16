# Backlog — Flussi

> Ce fichier centralise les idées d'évolution, bugs connus et questions ouvertes.
> Quand un item est planifié dans une version, il est déplacé dans `docs/roadmap.md`.
> Centraliser toutes les notes ici. Ne pas créer d'autre fichier de notes.

---

## Améliorations

_(aucune pour l'instant — les items de l'amorce du 2026-10-02 sont planifiés dans `docs/roadmap.md`)_

## Bugs probables / cas limites

_(aucun pour l'instant)_

## Questions ouvertes

- Renseigner `author` dans `package.json` ? Sans lui, l'éditeur est vide dans « Applications installées » et dans les propriétés de `Flussi.exe` — `package.json` (v0.2.0, item 5)
- Signer `Flussi.exe` ? L'invite UAC de l'enregistrement des secrets affiche « éditeur inconnu », et le principe actuel est « aucun achat » — `electron-builder.yml` (v0.2.0, revue release)
- Durée de conservation du journal nominatif (compte Windows, poste) à inscrire au registre des traitements : la décision actuelle est « nettoyage manuel » — `docs/backlog.md` (Décisions) (v0.2.0, revue release)

## Points reportés

> Actions techniques et décisions issues d'items livrés, reportées hors de leur version.
> Une entrée = l'action, le fichier concerné, l'origine. Le détail reste dans le fichier de
> version d'origine (`docs/version-{X}.md`, puis `docs/archives/` une fois la version finalisée).
> Ne pas confondre avec « Items différés » (idées de fonctionnalités écartées par `/backlog-bootstrap`).

### v0.5.0 — MSP

- Refuser le dépôt d'un fichier en anomalie de structure — `src/shared/domain/ac056/structure.ts` (v0.1.0, item 4)
- Refuser le dépôt d'un fichier qui contient encore une erreur : contrôle complet avant le dépôt (divergence avec Lazarus validée le 2026-10-16 : Lazarus ne contrôle qu'au chargement et avant l'enregistrement ; l'enregistrement d'un fichier en erreur est permis depuis v0.3.0, item 3) — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Avant les premiers dépôts : une mise à jour Intune coupe Flussi ouvert (constaté au pilote), donc un dépôt en cours. Macro NSIS `customCheckAppRunning` qui sort avec le code 1618 (Intune retente plus tard) si Flussi est ouvert — `build/installer.nsh` (v0.2.0, item 5)
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

### Dette technique (sans échéance)

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
- ESLint : étendre `no-restricted-imports` de `@primno/dpapi` et `koffi` à `src/shared/**` et aux sous-chemins — `eslint.config.js` (v0.2.0, revue release)
- Passer en `devDependencies` les paquets du renderer déjà regroupés par Vite (`app.asar` de 48 Mo) — préférence — `package.json` (v0.2.0, revue release)
- Documentation : commentaire de `installer.nsh` (« lancé en administrateur »), contrôles des modules natifs dans la procédure Dependabot, retrait définitif d'un poste (supprimer `%ProgramData%\Flussi`), `README.md` (configuration et guides Intune) — `build/installer.nsh`, `CLAUDE.md`, `docs/deploiement-intune.md`, `README.md` (v0.2.0, revue release)
- Second lancement pendant une boîte de démarrage : rien de visible ; afficher « Flussi est déjà ouvert » — `src/main/index.ts` (v0.2.0, revue release)

## Décisions

- Rétention : Flussi ne purge ni n'archive les fichiers IN, OUT et Journal. Le nettoyage reste manuel.
