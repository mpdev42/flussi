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

## Décisions

- Rétention : Flussi ne purge ni n'archive les fichiers IN, OUT et Journal. Le nettoyage reste manuel.
