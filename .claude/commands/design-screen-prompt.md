---
model: opus
effort: high
---

# /design-screen-prompt — Génération d'un prompt d'écran pour Claude Design

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`. Le travail consiste à transformer un brief d'écran en un prompt riche, ancré dans le design system existant — c'est un travail de jugement éditorial.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument optionnel : description courte de l'écran à concevoir.

Exemples :
- `/design-screen-prompt`
- `/design-screen-prompt formulaire de création client`
- `/design-screen-prompt dashboard production mensuelle`

Cette skill est typiquement appelée **avant** `/item-start`, lorsque l'item à développer nécessite la création d'un nouvel écran (formulaire, page, modal, dashboard). Le composant React produit par Claude Design servira ensuite de référence d'inspiration au `feature-agent` pour l'intégration finale dans le code applicatif.

---

## Étape 1 — Pré-requis design system

Vérifie la présence d'un design system dans le projet :

- `DESIGN.md` à la racine
- `design/handoff/` (dossier)

<instructions>
**Cas 1 — aucun des deux n'existe.**

Affiche :

> Aucun design system détecté dans ce projet. Je recommande de lancer `/design-system-bootstrap` d'abord pour assurer une cohérence visuelle entre tous les écrans.
> Veux-tu :
> - `arrêter` — pour lancer `/design-system-bootstrap`
> - `continuer` — l'écran sera générique, sans guide visuel cohérent

Attends ma réponse. Si `arrêter` : sors de la skill. Si `continuer` : note que le prompt construit ne pourra pas s'ancrer sur un design system, et continue.

**Cas 2 — `DESIGN.md` existe.**

Lis-le intégralement. Son contenu sera inclus comme contexte dans le prompt construit à l'étape 4.

**Cas 3 — `design/handoff/` existe.**

Liste (sans les lire intégralement) les fichiers présents. Cette liste sera mentionnée dans le prompt construit, comme références déjà disponibles à réutiliser.

Les cas 2 et 3 peuvent coexister — c'est même la situation nominale après `/design-system-bootstrap`.
</instructions>

---

## Étape 2 — Recueil du brief écran

<instructions>
- Si un argument a été fourni à la skill, utilise-le comme point de départ et demande à l'utilisateur de compléter ce qui manque.
- Sinon, demande : « Quel écran veux-tu concevoir ? Décris : son rôle, qui l'utilise, ce qu'il contient (champs, sections, actions principales). »

Attends ma réponse complète avant de continuer. Ne reformule pas mes mots.
</instructions>

---

## Étape 3 — Affinage du brief

Pose les questions suivantes **une par une**. Attends ma réponse complète à chaque question avant de passer à la suivante.

<instructions>
Ne reformule pas la question si elle me paraît floue. Ne synthétise rien à ce stade. Ne donne aucun avis sur ma réponse à ce stade.
</instructions>

1. Quels sont les champs ou sections de cet écran, dans l'ordre ? (Si formulaire : liste des champs. Si dashboard : liste des indicateurs / blocs.)
2. Quelles actions principales l'utilisateur doit-il pouvoir réaliser ? (sauvegarder, supprimer, exporter, etc.)
3. Y a-t-il des états particuliers à gérer ? (chargement, erreur, vide, succès)
4. Cet écran s'intègre-t-il dans une navigation existante ? Si oui, où ?

---

## Étape 4 — Construction du prompt Claude Design

Sur la base du design system (étape 1) et du brief (étapes 2 et 3), construis un prompt **en anglais**, riche et structuré.

<context>
Structure attendue du prompt :

1. **Design system reference** — section ouverte par : « Use the following design system as the strict source of truth for all visual decisions. Do not invent new colors, spacing, typography, or component patterns — use only the tokens and components defined here. »
   - Si `DESIGN.md` existe : inclure son **contenu intégral** dans cette section.
   - Si `design/handoff/` contient des composants : lister leurs noms comme références déjà disponibles à réutiliser dans la composition de l'écran.
   - Si aucun design system n'existe (cas où l'utilisateur a choisi `continuer` à l'étape 1) : remplacer cette section par : « No design system available — produce a clean, neutral, professional screen, but flag any visual decision that should be standardized later. »

2. **Screen role** — qui utilise cet écran, dans quel contexte business, à quelle fréquence d'usage. Reformulation business du brief de l'étape 2.

3. **Screen content** — liste exhaustive des champs ou sections, dans l'ordre demandé à l'étape 3 question 1. Pour chaque champ : type (text, email, select, checkbox, etc.), libellé, contraintes (required, format) si l'utilisateur les a précisées.

4. **Primary actions** — réponse à la question 2 de l'étape 3, formulée comme des intents utilisateur (« save the form », « delete the entity », « export to PDF », etc.).

5. **States to handle** — réponse à la question 3 de l'étape 3 (loading, error, empty, success), avec demande explicite de produire une variante visuelle pour chacun si pertinent.

6. **Navigation context** — réponse à la question 4 de l'étape 3, pour que Claude Design comprenne où l'écran s'intègre (ex : « accessed from the main client list, returns to it after save »).

7. **Deliverable** — demande explicite : un fichier React (TSX) fonctionnel, autonome, utilisant les tokens et composants du design system. Pas de logique métier réelle — un screen de référence visuelle prêt à servir d'inspiration au développement applicatif.

8. **Constraints** — explicitation : « Visual coherence with the design system is non-negotiable. If a need arises that the design system doesn't cover, extend it through tokens (and document the new token), do not improvise inline. »
</context>

<instructions>
Le prompt produit doit être en anglais, en Markdown, prêt à être collé tel quel dans Claude Design.

Si `DESIGN.md` existe, son contenu doit être copié **intégralement** dans le prompt — Claude Design n'a pas accès au filesystem du projet et a besoin du texte complet pour s'y conformer. Ne tronque pas, ne résume pas.
</instructions>

---

## Étape 5 — Validation utilisateur

Présente le prompt construit et demande :

> Voici le prompt à coller dans Claude Design. Tu valides, tu ajustes, ou tu annules ?

<instructions>
- `valider` : passe à l'étape suivante.
- `ajuster <précisions>` : modifie le prompt selon les précisions, re-présente pour validation.
- `annuler` : sors de la skill sans rien produire.

Boucle sur l'ajustement tant que je n'ai pas validé explicitement.
</instructions>

---

## Étape 6 — Instructions d'utilisation

Affiche le prompt validé dans un bloc clairement délimité, suivi de la marche à suivre :

```
1. Va sur https://claude.ai/design — idéalement dans la conversation existante de ton design system (pour garder la cohérence sémantique côté Claude Design). Sinon, démarre une nouvelle conversation.
2. Colle le prompt ci-dessus.
3. Itère avec Claude Design jusqu'à un résultat qui te convient.
4. Récupère le fichier React produit → à déposer dans `design/handoff/{nom-de-l-ecran}.tsx`.
5. Lance ensuite `/item-start` sur l'item correspondant. Le `feature-agent` utilisera le fichier dans `design/handoff/` comme référence d'inspiration pour l'intégration finale dans le code applicatif (avec la logique métier, le routing, les services).
```

<instructions>
Adapte `{nom-de-l-ecran}` à un slug raisonnable basé sur le brief recueilli (ex : `client-create-form`, `monthly-production-dashboard`). Propose le nom dans la marche à suivre — l'utilisateur reste libre de le changer au moment de déposer le fichier.
</instructions>

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier du projet. Elle produit uniquement un prompt à coller dans Claude Design et des instructions à suivre. Aucune commande `Write`, `Edit`, ni manipulation de fichier source autorisée pendant l'exécution. C'est l'utilisateur qui dépose le fichier produit par Claude Design dans `design/handoff/`. L'intégration applicative effective relève ensuite de `/item-start` et du `feature-agent`.
</instructions>
