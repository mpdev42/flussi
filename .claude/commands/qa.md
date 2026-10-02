---
model: opus
effort: high
---

# /qa — Test utilisateur de l'application

## Confirmation du modèle

Cette skill est conçue pour **Opus** en effort `high`. Une alternative acceptable est **Sonnet** en effort `high` quand l'usage est focalisé sur des flux courts et bien délimités.

Affiche-moi ce rappel :

> Calibrage attendu : **Opus**, effort **`high`** (ton réglage habituel ; alternative : Sonnet `high` pour des flux courts). Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

**Attends ma confirmation explicite (`ok`, `go`, ou équivalent). Ne continue pas tant que je n'ai pas répondu.**

---

## Argument

Argument optionnel : un chemin (route, écran) ou une URL pour cibler un flux précis.

Exemples :
- `/qa` (sans argument — la skill demandera quel flux tester)
- `/qa /clients/new`
- `/qa http://localhost:5173/login`

---

## Étape 1 — Lecture du contexte projet

Lis `CLAUDE.md` et identifie :

- **Type de projet** : desktop, web, serveur, ou combinaison.
- **Commande de lancement en dev** déclarée dans la section *Commandes de développement*.
- **Modules / entités principaux**, utiles pour identifier les flux candidats au test.

Si l'une de ces informations est absente de `CLAUDE.md`, signale-le explicitement et demande-moi de la fournir avant de continuer. **Attends ma réponse.**

---

## Étape 2 — Détection de l'environnement de test

Selon le type de projet identifié à l'étape 1 :

- **Projet desktop** : besoin de la commande de lancement déclarée dans `CLAUDE.md`. Demande à l'utilisateur si l'application est déjà lancée ou s'il faut la lancer.
- **Projet web** : besoin d'une URL accessible (locale `http://localhost:...` ou staging). Demande l'URL si elle n'a pas été fournie en argument.
- **Projet serveur sans UI** : signale que cette skill teste des flux UI et ne s'applique pas. Sors de la skill.

En parallèle, **détecte silencieusement** (sans encore en parler à l'utilisateur, le résultat sera utilisé à l'étape 5) :

- Présence de `@playwright/test` dans les `devDependencies` du `package.json`.
- Présence d'un fichier `playwright.config.ts` ou `playwright.config.js` à la racine ou dans `e2e/`.
- Pour les projets Electron : présence d'une commande `build` exécutable (`npm run build`) — nécessaire pour lancer Playwright contre l'app buildée.

Si l'environnement n'est pas détectable automatiquement, demande explicitement à l'utilisateur. **Attends sa réponse avant de continuer.**

---

## Étape 3 — Identification du scope du test

- Si un argument a été fourni à la skill, utilise-le comme point d'entrée.
- Sinon, demande : « Quel flux veux-tu tester ? (ex : *connexion + création client*, *modification d'une signature*, *export PDF*) »

**Attends ma réponse avant de continuer.**

---

## Étape 4 — Plan de test

Présente un plan en 3 à 6 étapes décrivant :

- Les écrans visités
- Les clics et saisies effectués (avec données de test plausibles, pas de vraies données)
- Les assertions visuelles ou fonctionnelles attendues à chaque étape

Demande validation : « Est-ce que ce plan correspond à ce que tu veux tester ? »

**Attends ma réponse. Ne lance aucune action sans validation explicite.**

---

## Étape 5 — Détection du mode d'exécution

À partir des signaux collectés à l'étape 2, détermine le mode d'exécution. Trois cas, dans l'ordre de priorité :

### Cas A — Mode automatisé Electron (Playwright détecté + projet Electron)

Conditions cumulatives :
- `@playwright/test` présent dans `devDependencies`
- `playwright.config.{ts,js}` présent
- Projet Electron (cf. étape 1)

Annonce à l'utilisateur :

> Playwright est configuré sur ce projet. Je vais générer un spec dans `e2e/qa-runs/`, builder l'app, puis exécuter le test. OK pour lancer ?

**Attends confirmation explicite.** Si refus, bascule sur le cas C.

### Cas B — Mode automatisé navigateur (projet web + MCP de navigation disponible)

Conditions cumulatives :
- Projet web (cf. étape 1)
- Outil de pilotage de navigateur disponible dans la session (Playwright MCP, navigation MCP, etc.)

Annonce à l'utilisateur :

> Un outil de pilotage de navigateur est disponible. Je vais exécuter le plan directement contre l'URL fournie et prendre des screenshots aux étapes clés. OK pour lancer ?

**Attends confirmation explicite.** Si refus, bascule sur le cas C.

### Cas C — Mode dégradé manuel (aucun outil détecté ou refus utilisateur)

Annonce :

> Pas de pilotage automatisé disponible (ou refusé). Lance manuellement les étapes du plan et reviens avec les observations (étapes ok / étapes ratées / messages d'erreur / screenshots éventuels). Je rédigerai le rapport ensuite.

Puis attends les observations utilisateur. Quand elles arrivent, va directement à l'étape 7.

> **Note** : cette skill **ne propose pas** d'installer ou configurer Playwright à la volée. Si tu veux automatiser `/qa` sur un projet, configure Playwright en amont (cf. `template-electron.md` §2.11) ; le mode A se déclenchera automatiquement au prochain run.

---

## Étape 6 — Exécution du test

### Cas A — Mode automatisé Electron

Procède dans cet ordre :

1. **Build de l'application**. Lance `npm run build` (ou la commande équivalente détectée dans `CLAUDE.md`). Si le build échoue, arrête tout et passe à l'étape 7 avec ce qui a été observé.

2. **Génération du spec**. Crée le fichier `e2e/qa-runs/qa-{YYYY-MM-DD}-{slug-du-flux}.spec.ts`. Si le dossier `e2e/qa-runs/` n'existe pas, crée-le et ajoute la ligne `e2e/qa-runs/` au `.gitignore` (sauf si déjà présente). Le `slug-du-flux` est dérivé du scope validé à l'étape 3.

   Patron du spec à respecter :

   ```ts
   import { test, expect, _electron as electron } from '@playwright/test';
   import path from 'node:path';

   test('{flux testé}', async () => {
     const app = await electron.launch({
       args: [path.join(__dirname, '../../out/main/index.cjs')],
     });
     const win = await app.firstWindow();

     // Étape 1 : {description}
     await win.screenshot({ path: 'e2e/qa-runs/screenshots/{date}-{slug}/01.png' });
     // ... interactions

     await app.close();
   });
   ```

   Le chemin du `main` buildé suit la convention du `template-electron.md` (§2.6 : `out/main/index.cjs`). Si le projet dévie de cette convention, adapte d'après le contenu réel de `electron.vite.config.ts`.

   Pour chaque étape du plan validé à l'étape 4, génère :
   - Une interaction Playwright (`click`, `fill`, `getByRole`, etc.) — privilégie les sélecteurs accessibles (`getByRole`, `getByLabel`) aux sélecteurs CSS.
   - Une assertion `expect(...)` quand l'étape comporte une attente fonctionnelle ou visuelle vérifiable.
   - Un `screenshot` après l'interaction, dans `e2e/qa-runs/screenshots/{date}-{slug}/{NN}.png`.

3. **Exécution**. Lance `npx playwright test e2e/qa-runs/qa-{YYYY-MM-DD}-{slug}.spec.ts --reporter=list`. Capture la sortie complète.

4. **Collecte des résultats**. Pour chaque étape : succès, échec, ou erreur. En cas d'échec Playwright, lis le message d'erreur et le screenshot d'échec automatique si Playwright en a généré un (`test-results/`).

5. **Conservation**. Le spec et les screenshots restent dans `e2e/qa-runs/`. Ils servent de trace consultable et permettent de rejouer le scénario après correction (`npx playwright test e2e/qa-runs/qa-{date}-{slug}.spec.ts`).

   <instructions>
   Si l'utilisateur préfère un mode jetable (spec et screenshots supprimés en fin de skill), il doit le signaler explicitement avant l'exécution. Dans ce cas, supprime le fichier `.spec.ts` et le dossier `screenshots/{date}-{slug}/` après collecte des résultats à l'étape 7.
   </instructions>

### Cas B — Mode automatisé navigateur

Si un outil de pilotage de navigateur est disponible :

1. Exécute le plan étape par étape, dans l'ordre validé.
2. Prends un screenshot aux étapes clés (ouverture d'écran, formulaire rempli, écran de confirmation, écran d'erreur).
3. Note pour chaque étape : succès, échec, ou anomalie observée.
4. Si une étape bloque (élément introuvable, timeout, erreur applicative), arrête l'exécution et passe directement à l'étape 7 avec ce qui a été observé jusque-là.

### Cas C — Mode dégradé manuel

Tu es déjà passé directement à l'étape 7 depuis l'étape 5. Cette section ne s'applique pas.

---

## Étape 7 — Rapport

Produis un rapport structuré :

```markdown
# Rapport QA — {flux testé} — {date YYYY-MM-DD}

## 1. Mode d'exécution
{Automatisé Electron / Automatisé navigateur / Dégradé manuel}
{Si automatisé : chemin du spec et du dossier de screenshots}

## 2. Étapes réussies
- Étape 1 : {description courte}
- Étape 2 : {description courte}
{...}

## 3. Bugs détectés
- **{titre court}** — {description}
  - Reproduction : {étapes minimales pour reproduire}
  - Screenshot : {chemin ou référence au screenshot pris}
  - Sévérité estimée : bloquant / majeur / mineur

## 4. Observations visuelles (si design présent)
{Si DESIGN.md ou design/handoff/ est présent dans le projet :
  comparer ce qui a été observé avec le design et noter les divergences.
 Sinon : RAS.}

## 5. Recommandation
- Soit : « Corriger immédiatement le bug `{titre}` — lancer `/investigate`. »
- Soit : « Continuer — bugs mineurs uniquement, à consigner dans `docs/backlog.md`. »
```

<instructions>
Liste tous les bugs observés sans en filtrer au moment de la collecte. La sévérité estimée est un champ informatif, pas un filtre. Le tri intervient uniquement dans la recommandation finale (section 5).
</instructions>

---

## Règle absolue

<instructions>
Cette skill ne corrige PAS les bugs détectés. Son rôle est de tester et rapporter. Toute correction relève de `/investigate` (pour analyse de cause racine) ou d'un cycle d'item dédié (`/item-start`). Aucun `Edit` ni `Write` sur du code source pendant l'exécution de cette skill.

Exception ciblée : la skill peut écrire dans `e2e/qa-runs/` (spec et screenshots) et amender `.gitignore` pour y ajouter `e2e/qa-runs/`. Aucune autre écriture n'est permise.
</instructions>
