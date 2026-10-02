# /version-start — Démarrer une nouvelle version

Argument attendu : `{version}`
Exemple : `/version-start 1.2.0`

---

Tu vas préparer le fichier de version pour démarrer le développement. Suis ces étapes dans l'ordre.

## Argument

Depuis `$ARGUMENTS`, extrais :
- `VERSION` — ex: `1.2.0`

## Étape 1 — Lire le contexte

Lis `docs/roadmap.md` et extrais tous les items de la section `v{VERSION}`.

Si la section `v{VERSION}` est absente de `docs/roadmap.md`, affiche :

> "La version v{VERSION} n'est pas encore définie dans `docs/roadmap.md`. Décris les items que tu veux inclure dans cette version et je les ajouterai."

Attends la réponse de l'utilisateur et ajoute les items dans `docs/roadmap.md` avant de continuer.

Lis aussi `CLAUDE.md` pour connaître les conventions et le contexte du projet.

Présente à l'utilisateur :
- La version identifiée
- La liste des items avec leur description actuelle

## Étape 2 — Interview des items

Pour chaque item, engage une conversation avec l'utilisateur pour affiner la description. Procède **item par item** — attends la réponse avant de passer au suivant.

Pour chaque item, explore selon ce qui est pertinent :
- Le titre est-il correct, ou faut-il le reformuler ?
- Quelles sont les décisions techniques à prendre ?
- Quelles sont les contraintes connues ?
- Y a-t-il des cas limites ou sous-cas à anticiper ?
- Quels fichiers seront probablement impactés ?

## Étape 3 — Proposer un ordre de réalisation

Sur la base des items discutés, propose un ordre de réalisation sous forme de tableau avec justification (dépendances, risques, complexité). Attends la validation ou les ajustements avant de continuer.

## Étape 4 — Créer le fichier de version

Crée `docs/version-{VERSION}.md` avec :
- Un titre et un objectif général de la version
- Chaque item numéroté avec sa description complète, ses décisions, ses contraintes
- La table "Ordre de réalisation" validée

Si un dossier `docs/archives/` contient des versions précédentes, respecte leur format.

Une fois le fichier créé, affiche le message suivant et **attends la confirmation avant de continuer** :

> "Le fichier `docs/version-{VERSION}.md` est créé. Relis-le et dis-moi si tu veux des ajustements. Quand tu es satisfait, dis-moi et je ferai le commit.
> **Important : ne ferme pas cette conversation avant le commit — l'état de la skill n'est pas persisté entre sessions.**"

## Étape 5 — Commit

Une fois la validation reçue :

```bash
git add docs/version-{VERSION}.md
git commit -m "v{VERSION} — Initialisation"
```
