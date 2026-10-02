---
model: opus
effort: xhigh
---

# /investigate — Pas de fix sans investigation

## Confirmation du modèle

Cette skill est conçue pour Opus en effort `xhigh`.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`xhigh`**. Si l'effort actif n'est pas `xhigh`, tape `/effort xhigh` avant de répondre `ok` (puis `/effort high` une fois la skill terminée, pour revenir à ton réglage habituel).

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument optionnel : description courte du bug ou du comportement à investiguer.

Exemples :
- `/investigate`
- `/investigate l'export PDF rend une page blanche`
- `/investigate la sauvegarde d'un client perd le champ téléphone`

---

## Étape 1 — Recueil du symptôme

- Si un argument a été fourni, utilise-le comme point de départ. Demande à l'utilisateur de compléter ce qui manque (conditions d'apparition, comportement attendu, fréquence).
- Sinon, demande : « Décris le symptôme observé, dans quelles conditions il apparaît, et quel comportement tu attends à la place. »

**Attends ma réponse complète avant de continuer.**

Reformule ensuite le symptôme en trois lignes maximum :

```markdown
- **Observé** : {ce que voit l'utilisateur}
- **Conditions** : {quand cela se produit}
- **Attendu** : {ce qui devrait se passer à la place}
```

Demande confirmation que la reformulation est correcte. **Attends ma réponse avant de continuer.**

---

## Étape 2 — Lecture du contexte

Lis `CLAUDE.md` pour comprendre l'architecture du projet :

- Couches définies (présentation, transport, service, données, autre)
- ORM ou outil d'accès aux données
- Framework UI
- Modules / entités du projet

Liste explicitement les couches identifiées. Si une information critique pour l'investigation manque dans `CLAUDE.md`, signale-le.

---

## Étape 3 — Trace des données

Identifie les fichiers et les couches potentiellement impliqués dans le symptôme. Procède par couches, en partant de celle où le symptôme s'observe :

- Pour un symptôme UI : commencer par la couche présentation, puis remonter vers transport, service, données.
- Pour un symptôme DB ou métier : commencer par les données, puis remonter vers service, transport, présentation.

Lis chaque fichier identifié. Si l'investigation révèle d'autres fichiers liés (imports, appels, dépendances), explore-les aussi. Note systématiquement ce que tu lis et pourquoi tu le lis.

---

## Étape 4 — Formulation d'hypothèses

Produis 2 ou 3 hypothèses possibles, classées par probabilité décroissante. Pour chacune :

- **Description** : 1 à 2 phrases sur la cause supposée
- **Couche(s) concernée(s)** : présentation / transport / service / données / autre
- **Validation proposée** : ce qu'il faudrait vérifier pour confirmer ou infirmer (lecture d'un fichier précis, exécution d'une commande de log, lancement d'un test ciblé existant, requête `SELECT` sur la base)

Présente les hypothèses sous forme de tableau ou de liste structurée. Demande mon avis avant de lancer les vérifications. **Attends ma réponse.**

---

## Étape 5 — Validation des hypothèses

Pour chaque hypothèse, dans l'ordre de probabilité décroissante, exécute la vérification proposée à l'étape 4.

Vérifications autorisées :

- Lecture de fichiers source
- Exécution de tests existants (en lecture seule, sans modifier les tests)
- Commandes de log
- Requêtes DB en `SELECT` uniquement

<instructions>
Aucune modification de fichier source. Aucune commande `Edit`, `Write`, `INSERT`, `UPDATE`, `DELETE`. Aucune exécution de migration. Si une vérification nécessite d'écrire (par exemple ajouter un log temporaire ou un test ciblé), arrête et signale-le à l'utilisateur — c'est à lui de décider d'ouvrir un cycle d'item dédié pour ajouter ces instruments.
</instructions>

Note pour chaque hypothèse l'un des trois résultats :
- **Confirmée** : la vérification démontre la cause.
- **Infirmée** : la vérification exclut cette cause.
- **Indéterminée** : la vérification n'a pas permis de trancher.

---

## Étape 6 — Conclusion

### Cas 1 — une hypothèse confirmée

Produis le rapport suivant :

```markdown
# Investigation — {symptôme} — {date YYYY-MM-DD}

## Cause racine
{description claire de la cause identifiée, avec référence aux fichiers et lignes concernés}

## Fichiers à modifier
- `{file1}` — {nature de la modification attendue}
- `{file2}` — {nature de la modification attendue}

## Recommandation
- Soit : « Créer un item dans `docs/roadmap.md` (description ci-dessous) — la correction n'est pas urgente. »
- Soit : « Ouvrir un cycle `/item-start` immédiatement — la correction est urgente. »

## Description de l'item proposé
**Titre** : {titre court}
**Description** : {description prête à être collée dans roadmap.md ou dans le fichier de version courante}
**Fichiers concernés** : {liste}
```

### Cas 2 — aucune hypothèse confirmée

Si aucune des 2-3 hypothèses n'est validée après les vérifications, signale :

> Investigation incomplète. Je n'ai pas trouvé la cause racine après vérification des hypothèses listées.

Puis liste :

- Ce qui a été exclu (hypothèses infirmées avec justification courte)
- Ce qui reste indéterminé
- 1 à 2 pistes supplémentaires à explorer (sans les explorer toi-même)

Sors de la skill sans recommander de fix.

---

## Règle absolue

<instructions>
Cette skill ne modifie aucun fichier source pendant l'investigation. La correction relève d'un cycle d'item séparé. Si une hypothèse n'est pas validée après les vérifications proposées, signale « Investigation incomplète » plutôt que de proposer un fix au hasard. Aucune supposition non vérifiée ne doit apparaître comme « cause racine » dans la conclusion.
</instructions>


---

## Fin de skill — retour au réglage habituel

Si j'ai basculé en `xhigh` au bloc de confirmation, termine en me rappelant : « Pense à repasser en `/effort high` (ton réglage habituel). »
