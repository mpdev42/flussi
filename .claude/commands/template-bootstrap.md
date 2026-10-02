---
model: opus
effort: high
---

# /template-bootstrap — Créer un template de squelette dans deneb

Guide la **création d'un template de bootstrap** `template-{TYPE}.md` dans la stack Claude — la recette
que `/project-start` lit à son étape 6 pour générer le **squelette** d'un projet (arborescence, fichiers
de config, fichiers de base). Un template par **type** de projet (`electron`, `tauri`, `nextjs`,
`react-spa`, `node-api`, `full-stack`, `other`).

Pendant symétrique de `/scaffolder-bootstrap` : celle-ci crée un **scaffolder** (moteur CRUD, par
**stack**) ; celle-ci crée un **template** (squelette, par **type**). Les deux briques sont distinctes
et complémentaires — un template construit le squelette, un scaffolder s'écrit dedans. Voir
`.claude/docs/cycles-de-developpement.md` (Cycle 1) et `.claude/docs/scaffolder-integration.md`.

---

## Bloc de confirmation modèle

<instructions>
Avant toute action, affiche ce bloc et attends ma confirmation explicite. Ne continue pas sans réponse.

> Cette skill est prévue pour tourner en **Opus** avec un effort **`high`**. Plus légère que
> `/scaffolder-bootstrap` (`xhigh`) : un template est un Markdown structuré, sans moteur de génération
> ni preuves de validation.
> Si ce n'est pas ton réglage actif, tape `/model opus` et/ou `/effort high` avant de répondre `ok`.

Attends ma réponse. Ne continue pas.
</instructions>

## Où s'exécute cette skill

Un template se crée **dans deneb**, au chemin canonique :

```
C:\Dev\Projets\deneb\Claude\templates\template-{TYPE}.md
```

<instructions>
Si la conversation est ouverte dans deneb, tu travailles directement dans `Claude/templates/`. Si elle
est ouverte dans un projet utilisateur, signale-le : le template doit être créé dans deneb (chemin
canonique ci-dessus), pas dans le projet — sinon il ne sera pas réutilisable par les futurs projets.
Propose de poursuivre en ciblant ce chemin, ou de relancer depuis une conversation ouverte dans deneb.
Attends ma réponse.
</instructions>

## Étape 1 — Déterminer le type et la stack

Détermine le `PROJECT_TYPE` parmi les valeurs reconnues par `/project-start` (étape 6) :
`electron`, `tauri`, `nextjs`, `react-spa`, `node-api`, `full-stack`, `other`.

Puis recueille la **stack** visée (granularité opinated : méta-framework, ORM/DB éventuels, UI,
transport, outils de test/lint).

<instructions>
- Si cette skill a été appelée à la suite de `/project-start` (template absent à l'étape 6), reprends le
  `PROJECT_TYPE` et la Stack déjà connus de `docs/project-description.md` ; demande-moi seulement de
  confirmer/compléter.
- Sinon, demande-moi le type et la stack. Si tu ne peux pas trancher le type avec certitude, propose
  celui qui correspond le mieux et demande validation.
</instructions>

## Étape 2 — Vérifier l'absence de doublon

Vérifie que `Claude/templates/template-{TYPE}.md` n'existe pas déjà.

<instructions>
- S'il existe : ne l'écrase pas. Signale-le et demande-moi si je veux le faire évoluer (modification
  manuelle, hors périmètre de cette skill) ou cibler un autre type. Sors si je n'en choisis pas un autre.
- S'il n'existe pas : continue.
</instructions>

## Étape 3 — Lire le contrat

Lis, dans cet ordre, ce qui définit ce qu'un template doit fournir :

1. **`.claude/commands/project-start.md`, étape 6** (et les étapes qui consomment le squelette : 5, 7,
   9) — le **contrat** que tout template doit honorer :
   - les sections de `docs/project-description.md` à lire (Stack, Architecture, Dev Commands, Modules,
     Design) ;
   - les **adaptations conditionnelles** selon les briques de Stack ;
   - la convention **versions en `"latest"`** (jamais de numéro figé) ;
   - les **avertissements à remonter dans le résumé final** de `/project-start` ;
   - la **procédure de fallback** « briques non gérées » (s'arrêter, lister, proposer
     `partiel`/`corriger`/`annuler`).
2. **Un template existant comme modèle de forme** : `Claude/templates/template-electron.md`. Reprends sa
   **structure** (Préambule → structure de dossiers → fichiers de config → fichiers de base →
   compléments `.gitignore` → cas non gérés → Pièges connus) et ses **conventions** (table de dérivation
   Stack → paquets, blocs shadcn/Tailwind neutres réutilisables, wrappers si besoin). **Jamais par
   duplication aveugle** — adapte chaque section à la stack cible.
3. **Si un scaffolder de la stack existe** dans le catalogue deneb (`C:\Dev\Projets\deneb\scaffolders\`,
   un sous-dossier dont le `scaffolder.yaml › stack` matche la stack visée) : lis son `README.md`
   (§Installation) et son `scaffolder.yaml` (mapping `artifacts`, `aliases`, `io.outDir`). Le squelette
   produit par le template **doit être compatible** avec la structure que ce scaffolder attend (dossiers,
   alias d'import, chemins d'artefacts) — sinon le code généré par `/scaffold` ne compilera pas. Le
   template fournit le **shell exécutable** ; le scaffolder écrit ses `.base` dedans. Le template ne doit
   **pas** générer les fichiers que le scaffolder produit (artefacts `.base` et agrégateurs).

<instructions>
Si tu ne trouves aucun scaffolder correspondant, dis-le : le template est alors purement « squelette »,
sans contrainte d'alignement. Continue normalement.
</instructions>

## Étape 4 — Plan

Présente d'abord un **plan** avant toute écriture :
- structure de dossiers que le template fera générer ;
- table de dérivation Stack → paquets (deps / devDeps) ;
- fichiers de configuration et fichiers de base à décrire ;
- le cas échéant, le **handshake avec le scaffolder** de la stack (fichiers-hôtes du squelette qui se
  branchent sur les agrégateurs générés) ;
- ce qui est volontairement **laissé au scaffolder** (non généré par le template).

Attends ma validation du plan. Ne produis aucun fichier avant.

## Étape 5 — Produire le template

Une fois le plan validé, produis `Claude/templates/template-{TYPE}.md` avec les sections :

1. **Préambule** — rappelle que le fichier est lu par `/project-start` étape 6 ; liste les sections de
   `docs/project-description.md` à lire avant génération ; si un scaffolder de la stack existe, **renvoie
   explicitement à son `README §Installation` comme contrat de structure**.
2. **Structure de dossiers à générer** + adaptations conditionnelles.
3. **Fichiers de configuration à générer** — dont la **table de dérivation Stack → paquets**, la
   convention versions `"latest"`, et les avertissements à remonter dans le résumé final.
4. **Fichiers de base à générer** (entrées, points de montage, styles…).
5. **Compléments au `.gitignore`** spécifiques à la stack.
6. **Comportement face à la section Modules** (dossiers vides par module, si pertinent).
7. **Cas non gérés et procédure de fallback** (modèle `template-electron.md` §6).
8. **Pièges connus et leur correction** — section **démarrée vide** (ou 1-2 gotchas avérés), à enrichir
   au fil des projets via `/investigate`.

## Étape 6 — Fin

Récapitule le template créé (type, stack, alignement scaffolder éventuel). Indique la suite :

> Le template `template-{TYPE}.md` est créé dans la stack Claude de deneb. Pense à le **committer dans
> deneb**. Pour qu'il soit invocable, il sera copié dans `.claude/templates/` des projets à l'étape 1 du
> Cycle 1. Pour un projet **déjà démarré**, recopie le fichier dans son `.claude/templates/`, puis
> relance `/project-start` (il trouvera le template à l'étape 6).

<instructions>
Rappelle aussi : si la stack vise un scaffolder du catalogue, vérifie que ce scaffolder existe (sinon
`/scaffolder-bootstrap`) — template et scaffolder sont les deux briques à préparer en amont dans deneb.
</instructions>
