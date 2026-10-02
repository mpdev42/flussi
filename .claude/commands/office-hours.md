---
model: opus
effort: high
---

# /office-hours — Cadrage forçant avant projet ou feature

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `high`.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument attendu : `{scope}` parmi `project` ou `feature`.

- `/office-hours project` : appelée AVANT `/project-start`. Cadre un nouveau projet.
- `/office-hours feature` : appelée AVANT d'ajouter un item dans `docs/roadmap.md`, ou pendant l'interview de `/version-start`. Cadre une feature.

Depuis `$ARGUMENTS`, extrais `SCOPE` (premier mot, insensible à la casse).

- Si `SCOPE` est vide → afficher l'aide intégrée (en bas de ce fichier) et arrêter.
- Si `SCOPE` n'est pas dans `{project, feature}` → afficher l'aide avec la mention : « Scope inconnu : `{SCOPE}`. Did you mean : {suggestion} ? » et arrêter.

---

## Étape 1 — Annonce et démarrage

Affiche un court préambule à l'utilisateur :

- Le scope retenu (`project` ou `feature`).
- Le nombre de questions qui vont être posées : 6, une par une.
- Le rappel : cette skill n'écrit dans aucun fichier. À la fin, elle livre un bloc Markdown que l'utilisateur copie lui-même là où il veut.

**Attends mon `ok` avant de poser la première question.**

---

## Étape 2 — Questions, une par une

<instructions>
Pose une seule question à la fois. Attends ma réponse complète avant de passer à la suivante. Ne reformule pas la question si je la trouve floue — laisse-moi répondre comme je le veux. Ne synthétise rien à ce stade. Ne donne aucun avis sur ma réponse à ce stade.
</instructions>

### Pour `SCOPE = project`

1. Qui sont les utilisateurs réels de ce projet ? (toi seul, un sous-groupe identifié, les commerciaux, autres)
2. Quel est le vrai problème à résoudre, formulé du point de vue de l'utilisateur ?
3. Quelle est la version la plus simple (v0.1) qui résoudrait 80 % du problème ?
4. Qu'est-ce que tu n'es PAS en train de construire, au moins dans les premières versions ?
5. Quel sera le critère de succès à 3 mois ?
6. Existe-t-il déjà un outil (le tien, externe, Excel) qui couvre 50 % du besoin ? Si oui, pourquoi ne pas l'étendre plutôt que créer un nouveau projet ?

### Pour `SCOPE = feature`

1. Cette feature résout-elle un vrai problème utilisateur, ou est-ce une « bonne idée » sans demande ?
2. Qui demande cette feature et à quelle fréquence ?
3. Quelle est la version la plus simple qui apporte de la valeur ?
4. Qu'est-ce que tu N'AJOUTES PAS dans cette feature (pour éviter le scope creep) ?
5. Quel critère permettra de dire « c'est terminé et utile » ?
6. Si on ne faisait pas cette feature, quel serait l'impact réel à 3 mois ?

---

## Étape 3 — Synthèse en bloc Markdown

Une fois les 6 questions répondues, produis un bloc Markdown structuré, prêt à être copié.

**Format identique pour les deux scopes :**

```markdown
## Cadrage — {date du jour YYYY-MM-DD}

- **{libellé court de la question 1}** : {synthèse courte de ma réponse}
- **{libellé court de la question 2}** : {synthèse courte de ma réponse}
- **{libellé court de la question 3}** : {synthèse courte de ma réponse}
- **{libellé court de la question 4}** : {synthèse courte de ma réponse}
- **{libellé court de la question 5}** : {synthèse courte de ma réponse}
- **{libellé court de la question 6}** : {synthèse courte de ma réponse}
```

<example>
Pour la question « Qui sont les utilisateurs réels ? », un libellé court possible est « Utilisateurs réels ». Pour « Qu'est-ce que tu N'AJOUTES PAS dans cette feature ? », un libellé court possible est « Hors scope ». Garde une formulation neutre et descriptive, en français.
</example>

Le bloc doit être en français, factuel, synthétique. Une à trois phrases par puce maximum.

---

## Étape 4 — Présentation et ajustements

Présente le bloc avec ce message exact :

> Voici le bloc de cadrage. Copie-le dans le fichier approprié. Veux-tu ajuster une réponse avant de finaliser ?

Ajoute, après le bloc, l'indication de destination correspondant au scope :

- Pour `SCOPE = project` : « À coller dans `docs/project-description.md`, section *Cadrage initial*. »
- Pour `SCOPE = feature` : « À coller soit dans `docs/roadmap.md` sous l'item correspondant, soit dans `docs/version-{VERSION}.md` si la skill a été appelée pendant `/version-start`. »

Si je demande des ajustements, modifie le bloc et représente-le. Sinon, sors de la skill.

---

## Règle absolue

<instructions>
Cette skill N'ÉCRIT JAMAIS dans aucun fichier. Elle produit uniquement un bloc Markdown à coller. C'est l'utilisateur qui décide où et quand le coller. Aucune commande `Write`, `Edit`, ni manipulation de fichier autorisée pendant l'exécution.
</instructions>

---

## Aide intégrée

```
/office-hours — Cadrage forçant avant projet ou feature

Scopes disponibles :

  project   Cadre un nouveau projet (à appeler avant /project-start)
  feature   Cadre une feature (à appeler avant /version-start ou
            avant d'ajouter un item dans docs/roadmap.md)

Usage : /office-hours <scope>
```
