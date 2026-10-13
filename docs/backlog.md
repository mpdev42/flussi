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

- **Rang saisi sur un seul chiffre (écran AC056, v0.3.0)**.
  - Lazarus écrit « 10 » quand on saisit « 1 » dans un rang : `AddCharR` bourre avec `'0'` à droite. Constaté le 2026-10-13 sur `CORPUS-DEV\MODIFIES\`.
  - Le domaine conserve cette parité (v0.1.0, item 3).
  - À trancher pour l'écran : imposer 2 chiffres à la saisie, compléter par un zéro à gauche (divergence à valider), ou garder la parité.
- Contrôler le fichier avant le dépôt MSP ? Lazarus ne contrôle qu'au chargement et avant l'enregistrement : divergence à valider — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Réécrire les explications `ERRxxx` avec le service administratif ? Les textes actuels sont repris mot pour mot de Lazarus, provisoires — `src/shared/domain/ac056/codes-rejet.ts` (v0.1.0, item 5)
- Ajouter des codes `ERRxxx` ? 13 messages de rejet sur 29 du corpus `OUT\` ne correspondent à aucun code (Lazarus donne le même résultat). À examiner avec le service administratif — `src/shared/domain/ac056/codes-rejet.ts` (v0.1.0, item 6)

## Points reportés

> Actions techniques et décisions issues d'items livrés, reportées hors de leur version.
> Une entrée = l'action, le fichier concerné, l'origine. Le détail reste dans le fichier de
> version d'origine (`docs/version-{X}.md`, puis `docs/archives/` une fois la version finalisée).
> Ne pas confondre avec « Items différés » (idées de fonctionnalités écartées par `/backlog-bootstrap`).

### v0.3.0 — Écran AC056

- Au démarrage de la version, avant le premier item : créer `ac056-agent` (format AC056 et parité Lazarus, prévu au cadrage, jamais créé) — `.claude/agents/`, `docs/project-description.md` (v0.1.0, audit de finalisation)
- Description des entités : `affiche` n'est figé par un test que pour une partie des champs, et les listes courtes (100, 120, 125, 130, 180, 400) ne sont pas vérifiées contre `fmain.lfm` — `src/shared/domain/ac056/entites/` (v0.1.0, item 2)
- Modification réservée aux champs en erreur (parité Lazarus `VerrouillerComposants`, `MarquerControleErreur`), `maxLength` appliqué à la saisie — `src/shared/domain/ac056/modification.ts` (v0.1.0, item 3)
- `texteDepuisOctets` retire un BOM en tête de valeur : passer `ignoreBOM: true` avant l'affichage — `src/shared/domain/ac056/octets.ts` (v0.1.0, item 3)
- Lignes vides : décider si l'écran réenregistre le fichier au chargement, comme Lazarus — `src/shared/domain/ac056/lecteur.ts` (v0.1.0, item 3)
- Fichier en anomalie de structure : refuser l'enregistrement et afficher la consigne « relancer l'export VEOS » — `src/shared/domain/ac056/structure.ts` (v0.1.0, item 4)
- Sortie de champ : ne remplacer que les anomalies du champ modifié, par `controlerChamp` (Lazarus vide celles de tout l'évènement) — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Libellés réels des champs affichés, dans les messages d'anomalie et à l'écran (aujourd'hui « le champ {nom} (octets X à Y) ») — `src/shared/domain/ac056/controle.ts` (v0.1.0, item 5)
- Rejet : navigation comme dans un fichier VEOS, message et explication de chaque ligne, sans Enregistrer ni Dépôt — `src/shared/domain/ac056/rejet.ts` (v0.1.0, item 6)
- Enregistrement : ne jamais appeler `ecrireAc056` sur un rejet, qui lève une erreur — `src/shared/domain/ac056/ecrivain.ts` (v0.1.0, item 6)

### v0.5.0 — MSP

- Refuser le dépôt d'un fichier en anomalie de structure — `src/shared/domain/ac056/structure.ts` (v0.1.0, item 4)

### Dette technique (sans échéance)

- Second fichier piégé dans `PIEGES\` pour les messages Lazarus non couverts (120, 405, 800, `ENFANT`, 490 `REDAN`) et la divergence 5 — `src/shared/domain/ac056/controle.corpus.test.ts` (v0.1.0, item 5)
- `strToIntFpc` : préciser le commentaire « comme `Integer` de FPC », sans extension de signe au-delà de 2^31 - 1 en base 16, 8 ou 2 (cas inatteignable) — `src/shared/domain/ac056/fpc.ts` (v0.1.0, item 5)
- Règle de longueur de ligne (au moins 718 octets en rejet, 700 en VEOS) écrite deux fois : la regrouper dans `rejet.ts` si elle évolue — `src/shared/domain/ac056/lecteur.ts`, `src/shared/domain/ac056/structure.ts` (v0.1.0, item 6)

## Décisions

- Rétention : Flussi ne purge ni n'archive les fichiers IN, OUT et Journal. Le nettoyage reste manuel.
