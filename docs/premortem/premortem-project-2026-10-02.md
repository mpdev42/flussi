# Pre-mortem — Projet Flussi — 2026-10-02

## Contexte

- **Objet** : porter vers Electron, à parité fonctionnelle, l'application Lazarus qui orchestre l'échange de fichiers AC056 entre VEOS (IGA) et MSP. La chaîne complète : déclenchement du workflow VEOS, téléchargement FTP IGA, contrôle et correction, dépôt SFTP MSP, récupération des rejets, journal partagé.
- **Utilisateurs** : le service administratif du cabinet (interne, captif), sur des postes Windows gérés par Intune.
- **Critère de succès** : l'application Electron est en production à 3 mois et remplace Lazarus, qui est abandonnée.

## Synthèse

### Échec le plus probable

**Mode 9, Lazarus ne meurt jamais**, renforcé par le mode 3 (gestes métier perdus). C'est le point d'arrivée commun de presque tous les récits : quatre autres modes (3, 5, 6, 7) se terminent eux aussi par « le service rouvre Lazarus, encore installée ». Le critère de succès actuel, « l'application est en production », peut être atteint sans que Lazarus soit jamais arrêtée. Le cadrage reporte les améliorations sans les nommer : l'utilisateur ne gagne donc rien, et doit apprendre une nouvelle navigation pour corriger. Aucune date de désinstallation ni aucune mesure d'usage n'est prévue. Il suffit d'une friction (secrets, réseau, lenteur de correction) pour que le double fonctionnement s'installe durablement.

### Échec le plus dangereux

**Mode 2, divergence silencieuse de la parité AC056.** Le scénario grave n'est pas le fichier rejeté par MSP, qui est visible et se corrige. C'est le fichier **accepté** avec des données de bénéficiaires altérées : accents en double encodage, ou champs décalés parce que l'écrivain compte des caractères JavaScript au lieu d'octets en largeur fixe. On le découvrirait des semaines plus tard, par des réclamations d'adhérents ou une réconciliation chez MACIF. Les conséquences : des données personnelles erronées chez un partenaire (exposition RGPD et devoir de conseil), une mise en gestion faussée, et la perte de confiance de MSP. Et si Lazarus a déjà été désinstallée et que le journal ne garde ni les octets ni l'empreinte des fichiers envoyés, il n'y a plus de référence pour mesurer l'étendue des dégâts.

### Hypothèse cachée

On tient Lazarus pour la spécification complète de ce qu'il faut reproduire. Or son code ne décrit ni les octets réellement produits, ni les gestes des utilisateurs autour de l'outil, ni les secrets et accès réseau qui le font tourner, ni le filet de secours qu'il représente tant qu'il est installé.

### Plan révisé

- **Constituer cette semaine un corpus de référence.** Au moins 20 AC056 réels (VEOS en UTF-8 et rejets en ANSI, avec accents), chacun avec sa sortie Lazarus correspondante, rangés dans un dossier protégé sur `P:` et non sur le poste de dev ni dans le dépôt. Le premier test du domaine `shared/domain/ac056` est une relecture puis réécriture comparée octet par octet (SHA-256) à ce corpus. — adresse : modes n° 2, n° 8
- **Passer une demi-journée à côté d'une gestionnaire pendant un cycle réel complet.** Noter chaque geste fait hors Lazarus (renommage, vérification sur l'extranet MSP, relance horaire, contournement) et l'ajouter au cadrage comme exigence de parité. Recueillir au passage 3 améliorations priorisées et en livrer au moins une dès la v0.1. — adresse : modes n° 3, n° 9
- **Réécrire le critère de succès et fixer la date de bascule.** Nouveau critère : « Lazarus désinstallée par Intune après N semaines de fonctionnement en parallèle sans écart de journal ». Bascule placée hors de la période du 15 décembre au 31 janvier : avant mi-décembre ou en février. L'exécutable Lazarus et un runbook de relance sont archivés et restent utilisables 2 mois après la bascule. — adresse : modes n° 8, n° 9, n° 10
- **Faire un smoke test sur un poste réel du service, avec un compte standard.** Vérifier la connexion TCP vers `mft.macif.fr:10022`, le chargement de `rec-veos.iga.fr` et `prod-veos.iga.fr` dans une fenêtre Electron minimale derrière le proxy, l'écriture dans `%ProgramData%\Flussi\` et l'accès à `P:\…\Transferts\`. Lancer en parallèle la demande de certificat de signature, ou d'autorisation Defender, auprès de la DSI. — adresse : mode n° 7
- **Remplacer le journal en fichier unique par un fichier par session.** Écriture en ajout seul, nom unique (poste, horodatage, uuid), avec l'empreinte SHA-256 du fichier déposé chez MSP. Tester en recette 3 postes qui écrivent en même temps sur `P:`. — adresse : modes n° 5, n° 2
- **Définir le succès de l'adapter `veos` comme un fait observé, pas comme l'absence d'exception.** Le succès est l'apparition du fichier du jour sur le FTP IGA dans un délai donné. Ajouter un mode fenêtre visible pour le diagnostic et la MFA, et écrire la procédure manuelle de lancement d'`EXPORT_APIVIA` dans VEOS. — adresse : mode n° 1
- **Verrouiller la frontière entre recette et prod, et les secrets.** Ajouter une assertion de code qui lie l'hôte SFTP au mode (en recette, refus de tout dépôt vers `mft.macif.fr`). Faire déployer par Intune un `config.json` avec `FLUSSI_ENV` explicite. Garder les données réelles de recette sur `P:` uniquement. Ranger le mot de passe et la clé privée MSP dans le coffre du cabinet, avec 2 détenteurs nommés, et demander à MACIF un préavis pour chaque rotation. — adresse : modes n° 4, n° 6

### Checklist avant exécution

- [ ] Le corpus d'au moins 20 AC056 réels avec leurs sorties Lazarus est récupéré et rangé dans un dossier protégé sur `P:`, pas sur le poste de dev.
- [ ] Depuis un poste du service administratif : le port 10022 MACIF est ouvert, VEOS est joignable par le proxy dans Electron, `P:` et `%ProgramData%` sont accessibles en écriture.
- [ ] Le mot de passe SFTP MSP et la clé privée sont localisés, rangés dans un coffre, avec 2 détenteurs identifiés.
- [ ] La date de bascule est fixée hors de la période du 15 décembre au 31 janvier, et le critère de succès inclut la désinstallation de Lazarus.
- [ ] Une session d'observation d'un cycle réel avec une gestionnaire est planifiée.

---

## Modes d'échec instruits

### Mode n° 1 — Le pilotage de VEOS casse sans prévenir et rien ne le remplace

**Histoire**

Flussi est arrivé en production à la fin du troisième mois, à parité avec Lazarus, qui a été abandonnée comme prévu. Pendant sept semaines, tout a fonctionné. L'adapter `veos` ouvrait la fenêtre Chromium cachée, saisissait les identifiants personnels de l'agent et chargeait l'URL de lancement de `VEOS_WORKFLOW_EXPORT_ID`. Le workflow `EXPORT_APIVIA` partait. Un matin, IGA a mis en place une MFA, puis un SSO, sur `prod-veos.iga.fr`. La page de connexion n'avait plus le même formulaire. Le script injecté ne trouvait plus ses champs. Flussi a affiché « Export lancé » sur la seule foi de l'absence d'exception. Aucun contrôle ne vérifiait qu'un workflow avait réellement démarré.

Le service administratif a attendu l'AC056 pendant deux jours. Le FTP IGA ne contenait que le fichier de la veille. Flussi a alors affiché l'avertissement « fichier non du jour », qui était déjà familier et que les agents savaient ignorer. Un agent l'a ignoré. Il a téléchargé, contrôlé puis déposé en SFTP chez MSP un fichier déjà envoyé. Le doublon n'a été repéré qu'au retour des rejets, un ou deux jours plus tard.

Dans la chaîne, rien ne remplaçait la première étape. Lazarus avait été désinstallée et le cadrage assumait « VEOS n'expose pas d'API de lancement de workflow ». Le contournement manuel dans VEOS n'était ni documenté ni pratiqué. L'adapter avait été conçu pour être remplacé par une API IGA, mais cette API n'existait pas. Le développeur a dû reprendre le pilotage de la page pour gérer la MFA, dans une fenêtre cachée où l'agent ne pouvait pas saisir de code. Pendant ce temps, la bascule vers le mode manuel a pris plusieurs jours, avec des échanges AC056 en retard auprès de MSP. L'équipe a perdu confiance dans l'outil.

**Hypothèse sous-jacente**

La page de connexion et l'URL de lancement du workflow VEOS resteront stables, et IGA préviendra avant de les modifier.

**Signaux faibles à surveiller**

- Plus d'une fois par mois en recette, le test e2e de bout en bout de l'adapter `veos` échoue ou n'est pas exécuté : il doit vérifier la présence de la page de connexion et le démarrage effectif d'`EXPORT_APIVIA`. Il faut aussi comparer chaque semaine le DOM de `rec-veos.iga.fr` au DOM de référence.
- Le fichier AC056 du jour n'apparaît pas sur le FTP IGA dans l'heure suivant un « lancement réussi » pour plus de 2 lancements sur 20, ou l'avertissement « fichier non du jour » apparaît plus d'une fois par semaine en production.

### Mode n° 2 — La parité AC056 diverge sur un détail invisible (encodage, padding, CRLF, règle de `ucontrole.pas`)

**Histoire**

Le portage a été livré à 3 mois, « à parité » selon le critère de succès : l'application est en production et Lazarus est abandonnée. Les tests unitaires du domaine `shared/domain/ac056` passaient, mais ils avaient été écrits à partir du cahier des charges IGA 1.27 et de la lecture de `ucontrole.pas`. Aucun n'avait été comparé, octet par octet, à un fichier réellement produit par Lazarus. Les règles implicites de Lazarus n'étaient donc écrites nulle part : le comportement du `TStringList` Delphi/Lazarus sur les fins de ligne et le BOM, la conversion de page de code des rejets ANSI, le padding des champs en largeur fixe.

La bascule s'est produite lors d'un des premiers dépôts en `prod`. Le fichier venu de VEOS (UTF-8) a été relu, corrigé, puis réécrit. Un nom de bénéficiaire contenant un « é » ou un « ç » est sorti en double encodage, ou son octet multi-octets a décalé tous les champs suivants de la ligne. En largeur fixe, un caractère UTF-8 sur deux octets fait glisser les positions. L'écrivain comptait en caractères JavaScript, alors que MSP attend des positions en octets, ce que Lazarus gérait sans que personne le sache. MSP a d'abord rejeté un fichier entier à cause d'un CRLF devenu LF. Ce rejet était visible, il a été corrigé en une semaine et a donné une fausse confiance.

Le second incident n'a pas été visible. MSP a accepté des fichiers dont des accents étaient corrompus et dont quelques champs, notamment des identifiants de garantie, étaient décalés. Le service administratif a vu un « dépôt réussi » et un listing SFTP de vérification conforme. Aucun rejet n'est revenu dans `/Retrait`. La corruption a été découverte des semaines plus tard, par des réclamations d'adhérents et une réconciliation côté MACIF. Lazarus était déjà désinstallée, il n'existait plus de référence pour comparer. Le journal partagé ne conservait ni les octets envoyés ni leur empreinte.

**Hypothèse sous-jacente**

Si le domaine AC056 est couvert par des tests unitaires et conforme au cahier des charges IGA, le fichier produit est identique à celui de Lazarus.

**Signaux faibles à surveiller**

- Si, sur un corpus d'au moins 20 vrais fichiers AC056 (VEOS et rejets) comportant des accents, la relecture puis la réécriture par Flussi ne donne pas un fichier identique à l'octet près (comparaison SHA-256) à la sortie de Lazarus pour le même fichier, même sur un seul fichier.
- Si les tests du domaine ne contiennent aucun cas avec un caractère accentué ou multi-octets en milieu de ligne, ni de test explicite sur le CRLF et sur la longueur de ligne mesurée en octets, ou si Lazarus est désinstallée avant 2 mois de fonctionnement en parallèle sans écart.

### Mode n° 3 — Les gestes non écrits du métier sont perdus

**Histoire**

Flussi est entré en production dans les trois mois, comme prévu. La parité avait été vérifiée contre `uac056.pas`, `ucontrole.pas`, `urejetsdescription.pas` et le cahier des charges IGA 1.27, et les tests du domaine AC056 étaient au vert. Personne du service administratif n'avait été assis à côté d'une gestionnaire pendant un cycle complet d'envoi. Le cadrage disait pourtant « on définit avec lui les améliorations », mais le temps avait été consacré au portage.

Le basculement a eu lieu lors du premier cycle réel. Lazarus laissait une gestionnaire ouvrir un fichier IN, corriger à la main, renommer, puis déposer. Elle contrôlait aussi sur l'extranet MSP que le dépôt précédent avait bien été pris en charge avant de relancer. Flussi imposait le chemin « VEOS, FTP IGA, IN, contrôle, SFTP ». Les identifiants VEOS devaient être ressaisis à chaque lancement, et l'adapter `veos` pilotait une fenêtre Chromium cachée. Elle ne laissait plus voir la page VEOS, que l'équipe consultait en cas de doute. Un fichier AC056 du jour est arrivé trop tard sur le FTP IGA. Lazarus tolérait l'avertissement « pas du jour », et le service avait l'habitude de relancer à heure fixe. Flussi bloquait ou ralentissait ce geste. Le service ne pouvait pas contourner un contrôle trop strict sur un cas atypique, alors que l'ancien outil le permettait grâce à un bug connu.

En quelques semaines, les gestionnaires ont rouvert Lazarus « juste pour cette fois » et ont gardé un exemplaire sur le poste. L'abandon de Lazarus n'a jamais eu lieu. Le journal partagé sur `P:` ne contenait plus qu'une partie des sessions, car certaines se faisaient hors Flussi. Les écarts avec les envois réels MSP ont alors posé un problème de traçabilité. Le projet a été jugé « en production » mais n'a pas rempli son but : remplacer Lazarus.

**Hypothèse sous-jacente**

Le code Lazarus décrit entièrement ce que fait le service administratif avec l'outil.

**Signaux faibles à surveiller**

- Si, à la fin de la première semaine de recette, un ou plusieurs gestionnaires ne peuvent pas décrire de mémoire leur cycle complet d'envoi, ou si au moins un geste observé en situation réelle (renommage, vérification sur l'extranet MSP, relance horaire, contournement d'un bug) est absent de la liste de parité.
- Si, au cours du premier mois en production, le nombre de sessions inscrites dans le journal partagé sur `P:` est inférieur au nombre de dépôts constatés dans `/Depot_AMM_NAS` côté MSP, ou si Lazarus reste lancé sur au moins un poste.

### Mode n° 4 — La frontière recette/prod fuit (FTP IGA unique, défaut `prod` à l'installation)

**Histoire**

Le portage Electron est arrivé en recette en septembre. Pour valider la parité avec Lazarus, le développeur a lancé `npm run dev`, mode `recette` par défaut, et a téléchargé les AC056 depuis le FTP IGA, le même dans les deux modes. Le dossier `APIVIA` contenait de vrais fichiers de bénéficiaires. Ils ont atterri dans les dossiers IN locaux de dev, hors `P:`, hors du périmètre de sécurité du service administratif. Pour tester le contrôle et la correction, on les a modifiés, copiés comme jeux d'essai et joints à des tickets. Personne n'a vu qu'un jeu de recette contenait des données personnelles réelles, y compris de santé.

Le basculement est venu au déploiement Intune. L'installeur NSIS posait l'application en `prod` par défaut. Sur un poste équipé de test, qui avait déjà un `config.json` partiel dans `%ProgramData%\Flussi`, `FLUSSI_ENV` n'a pas été surchargé comme prévu. Une collaboratrice du service administratif a ouvert l'application pour la « formation ». Elle a déposé un fichier de recette modifié dans `/Depot_AMM_NAS` sur `mft.macif.fr`. MSP l'a traité comme une vraie transmission. Un autre jour, l'inverse s'est produit : un test en `recette` sur un poste de dev a envoyé un vrai AC056 vers `mft-hp.macif.fr`. Un lot est resté absent de la production.

L'incident a été détecté par MSP, qui a signalé des doublons et des bénéficiaires inconnus, puis par le DPO. Le journal partagé a consigné les sessions sans distinguer clairement les fichiers de test des fichiers réels. La direction a gelé le déploiement et rappelé Lazarus. La date de remplacement à 3 mois a été manquée, et la confiance du service s'est érodée.

**Hypothèse sous-jacente**

Un bandeau de couleur en recette et un mode choisi par configuration suffisent à empêcher un opérateur ou un développeur d'agir dans le mauvais environnement, même quand la source des données est partagée.

**Signaux faibles à surveiller**

- Au moins un fichier AC056 téléchargé depuis le FTP IGA se retrouve dans un dossier hors `P:` (poste de dev, dossier de tests Playwright, pièce jointe de ticket). Une recherche des fichiers `AC056*` sur les postes de dev et dans le dépôt le montre dès la première semaine de recette.
- Sur le premier poste pilote Intune, `FLUSSI_ENV` n'est pas explicitement défini, ou le mode affiché dans le titre ne correspond pas au mode attendu. Cela se vérifie à l'installation, avant toute formation. Dès qu'un seul dépôt SFTP en `prod` apparaît dans le journal à une date ou un utilisateur de test, le signal est avéré.

### Mode n° 5 — Le lecteur `P:` synchronisé avec SharePoint corrompt le journal partagé et les dossiers de travail

**Histoire**

Flussi est passé en production sur `P:\…\Transferts\` (IN, OUT, Journal). Les premières semaines ont été calmes, parce que seuls un ou deux agents du service administratif lançaient l'export AC056. Le basculement a eu lieu un matin de fin de mois, quand plusieurs agents ont clôturé leurs sessions en même temps. Chacun a écrit son entrée d'index dans le même fichier journal. OneDrive a créé des copies de conflit (`journal-PC-ADM04.json`), puis verrouillé le fichier chez un agent dont la synchronisation était en retard. L'application, qui faisait confiance à `P:` comme à un disque local, a soit échoué en silence, soit écrasé la version distante.

Le vrai problème est apparu quelques semaines plus tard. MSP a signalé un fichier AC056 déposé dans `/Depot_AMM_NAS` et rejeté, puis un doublon. La direction a ouvert le journal pour savoir qui avait envoyé quoi et quand. Trois sessions manquaient et deux entrées portaient l'utilisateur Windows d'un autre poste. Les copies de conflit étaient incomplètes, et l'historique SharePoint ne permettait pas de trancher. Les fichiers IN et OUT présentaient le même défaut : un agent corrigeait un fichier pendant que la synchronisation de son collègue écrasait la version qu'il venait d'enregistrer. Impossible de prouver un envoi ni de rattacher un rejet à son dépôt.

L'équipe s'est mise à tenir un suivi parallèle dans Excel, puis a rouvert Lazarus « par sécurité ». Flussi n'a jamais remplacé l'outil. L'adapter `stockage` isolait bien le code métier de `P:`, mais personne n'avait testé la concurrence réelle sur un dossier synchronisé. Le choix « pas de base de données, SQLite exclu » avait été fait pour cette raison, sans que l'on en tire la conséquence pour le journal : un fichier unique modifié par tous.

**Hypothèse sous-jacente**

Un lecteur `P:` synchronisé avec SharePoint se comporte, pour des écritures simultanées de plusieurs postes, comme un partage réseau classique.

**Signaux faibles à surveiller**

- Dès la recette sur `P:`, présence d'au moins un fichier de conflit (`*-NOMPOSTE*`) ou d'une erreur de verrouillage (`EBUSY`, `EPERM`) dans le dossier Journal, après un test d'écriture simultanée par 3 postes ou plus.
- Pendant le premier mois de production, écart entre le nombre de dépôts constatés dans `/Depot_AMM_NAS` (listing SFTP) et le nombre d'entrées de session dans le journal, supérieur à 0 sur une seule semaine.

### Mode n° 6 — L'onboarding des secrets (DPAPI par utilisateur) bloque les envois SFTP vers MSP

**Histoire**

Le jour de la bascule, Lazarus a été retiré des postes par Intune en même temps que l'installeur NSIS Flussi arrivait. Au premier lancement, chaque agent du service administratif a trouvé un écran Paramètres vide. Il lui fallait saisir le mot de passe SFTP du compte technique MSP (`mft.macif.fr`, port 10022) et le chemin de la clé privée. Ces secrets étaient autrefois configurés une seule fois, par le développeur, dans Lazarus. Personne d'autre ne les avait jamais vus. Le mot de passe dormait dans un coffre ou dans la tête d'une seule personne. La clé privée se trouvait sur un poste, ou sur `P:`, ou avait été perdue lors d'un renouvellement de machine. Les agents ont appelé le développeur. Il a dicté le mot de passe par téléphone et déposé la clé sur `P:` en dehors de tout contrôle d'accès.

Le blocage est devenu récurrent. `safeStorage` (DPAPI) lie le secret au profil Windows de chacun, donc rien n'est partagé. Chaque nouvel arrivant, chaque remplaçant en congés et chaque poste réimagé par Intune a dû tout ressaisir. Quand MACIF a fait tourner le mot de passe du compte technique, six personnes ont dû le ressaisir sur six postes. Deux ne l'ont jamais fait, parce qu'elles étaient absentes. Un vendredi, le dépôt dans `/Depot_AMM_NAS` a été refusé. Seule la personne absente le jour du changement détenait la nouvelle valeur. Le fichier AC056 n'est pas parti dans les délais et les rejets de `/Retrait` n'ont pas pu être récupérés.

Le service a rouvert Lazarus « en secours » sur un poste, puis sur trois. Lazarus n'a jamais été abandonnée, donc le critère « Lazarus abandonnée » n'a pas été atteint. Le journal partagé s'est retrouvé avec deux sources, car certaines sessions n'étaient plus tracées dans Flussi. La direction a conclu que le portage ajoutait de la fragilité sans aucun gain, et le projet s'est arrêté.

**Hypothèse sous-jacente**

La saisie unique et individuelle des secrets sur chaque poste suffit, parce que quelqu'un détient toujours le mot de passe et la clé MSP et que ces secrets ne changent presque jamais.

**Signaux faibles à surveiller**

- Lors d'un test à blanc en recette, si un agent du service, hors développeur, ne parvient pas à renseigner seul mot de passe et clé SFTP et à réussir un dépôt en moins de 15 minutes, sans appeler personne.
- Si, lors de la première semaine de production, plus de 2 postes sur l'effectif du service ont encore Lazarus lancée ou installée, ou si le nombre d'entrées de journal Flussi par jour ouvré est inférieur au nombre d'envois attendus.

### Mode n° 7 — Le poste Intune réel bloque ou dégrade l'application, qui fonctionnait en dev

**Histoire**

La recette s'est faite sur le poste du développeur, avec `npm run dev`, un `.env` et un dossier de travail local. Le premier `.intunewin` est parti en pilote sur trois postes du service administratif. L'installeur NSIS n'était pas signé. SmartScreen a affiché son avertissement, puis Defender a mis l'exécutable en quarantaine sur deux postes. Le lot est resté bloqué trois semaines, le temps de faire autoriser l'application par la sécurité, sans certificat prêt. Les 3 mois de l'objectif « en production » étaient déjà entamés quand l'application a enfin pu se lancer chez un utilisateur.

Les blocages suivants sont venus un par un. L'adapter `sftp-msp` ne joignait pas `mft.macif.fr` sur le port 10022, fermé en sortie sur le réseau du cabinet. L'ouverture a demandé une demande formelle à la DSI, puis une autre pour la liste blanche côté MACIF. L'adapter `veos`, qui pilote la fenêtre Chromium cachée, se heurtait au proxy d'entreprise. L'inspection TLS présentait un certificat que Chromium refusait. Comme la fenêtre était cachée, l'utilisateur ne voyait aucune erreur. Le workflow `EXPORT_APIVIA` semblait ne rien faire, et le message « échec de connexion » ne distinguait pas un mauvais mot de passe d'un blocage réseau. `%ProgramData%\Flussi\config.json` était en lecture seule pour les utilisateurs standard. L'écran Paramètres ne pouvait donc pas enregistrer la surcharge de configuration. Le lecteur `P:` n'était pas monté au même moment selon les sessions.

Les utilisateurs sont retournés à Lazarus « le temps que ça se règle ». Lazarus n'a jamais été arrêtée. À 6 mois, l'application Electron n'était toujours pas la référence en production. Le journal partagé contenait deux sources de vérité et le service administratif ne faisait plus confiance au nouvel outil.

**Hypothèse sous-jacente**

Un poste Intune du service administratif se comporte comme le poste de dev : réseau sortant, proxy, droits d'écriture et installation d'un exécutable non signé ne posent pas problème.

**Signaux faibles à surveiller**

- Si, à la fin de la 2e semaine, l'installeur n'a pas été installé et lancé sur au moins un poste réel du service administratif avec un compte utilisateur standard. Le test doit couvrir SmartScreen et Defender, une connexion SFTP sur 10022 et un workflow VEOS déclenché derrière le proxy.
- Si, lors du premier test réel, un des accès suivants échoue depuis le réseau du cabinet : connexion TCP vers `mft.macif.fr:10022`, chargement de `prod-veos.iga.fr` dans la fenêtre cachée, écriture dans `%ProgramData%\Flussi\config.json` ou accès à `P:\…\Transferts\`.

### Mode n° 8 — « Tout en v0.1 » en 3 mois, seul : la bascule glisse en pleine saison

**Histoire**

Le cadrage du 1er octobre fixait un périmètre sans exclusion : six modules (`Veos`, `Iga`, `Msp`, `Ac056`, `Journal`, `Parametres`) et le domaine pur `shared/domain/ac056` (entités 000 à 800, lecteur, écrivain, contrôles, codes ERRxxx), le tout à parité avec Lazarus et en trois mois. Le développeur travaillait seul. Il a avancé vite sur les adapters `ftp-iga` et `sftp-msp`, qui avaient l'air simples. Mais le module `Ac056` a absorbé l'essentiel du temps. Il fallait reconstituer les positions, les longueurs et les valeurs autorisées à partir de `uac056.pas`, `ucontrole.pas` et du cahier des charges IGA 1.27. À chaque cas limite, le code Lazarus et le cahier des charges ne disaient pas la même chose. L'encodage UTF-8 des fichiers VEOS et l'ANSI des rejets MSP ont coûté trois semaines de plus.

Fin novembre, `Veos` n'était toujours pas stable. Le pilotage d'une fenêtre Chromium cachée sur `rec-veos.iga.fr` cassait à chaque changement de page de connexion. Les tests e2e Playwright sur ce flux étaient fragiles. Il n'y avait pas de design système, car `DESIGN.md` et les patterns avaient été repoussés « avant le premier item d'interface ». L'écran AC056 a donc été fait deux fois. La recette avec le service administratif n'a eu lieu qu'une fois, début décembre. Elle a montré des écarts de comportement avec Lazarus, que le principe « toute divergence est explicite et validée » rendait bloquants. Le critère de succès « en production à 3 mois » est devenu un objectif de date, plus un objectif de qualité.

La bascule a été décidée mi-janvier, en plein pic des renouvellements et des mouvements au 1er janvier. Lazarus était déjà abandonnée sur les postes. Le premier vrai AC056 a été traité avec le serveur FTP IGA, qui est unique pour la recette et la prod. Un défaut de contrôle a laissé passer un fichier mal formé, que MSP a rejeté. Les administratifs, sous pression, sont revenus à Lazarus. Le projet a été gelé.

**Hypothèse sous-jacente**

Un développeur seul peut reconstituer en trois mois la parité complète d'un domaine AC056 non documenté en dehors du code Lazarus, et la date de bascule restera libre de toute contrainte saisonnière.

**Signaux faibles à surveiller**

- Si, à la fin du premier mois, `shared/domain/ac056` n'a pas ses entités 000 à 800 lues et écrites avec des tests de non-régression. Le contrôle serait de relire en lecture/écriture au moins 20 fichiers AC056 réels, avec une différence nulle octet par octet.
- Si, à la 6e semaine, le flux complet `Veos` → `Iga` → `Ac056` → `Msp` ne tourne pas de bout en bout en mode `recette` sans intervention manuelle. Ou si la première recette avec le service administratif n'a pas eu lieu avant la fin du 2e mois.

### Mode n° 9 — Aucun bénéfice perçu, Lazarus ne meurt jamais

**Histoire**

Pour tenir la parité fonctionnelle de la v1.0 (VEOS, FTP IGA, contrôle, SFTP MSP, rejets, journal, chargement libre), tout le périmètre a été construit d'un bloc. Aucune exclusion n'était prévue. Les améliorations, qui devaient se définir avec le service administratif, ont été repoussées « après la parité ». L'atelier n'a jamais eu lieu, faute de temps de développement. Le critère de succès, « l'application est en production », a été atteint à 3 mois : installeur NSIS poussé par Intune, bandeau de mode, écran Paramètres. L'équipe a déclaré la mission remplie.

La bascule a eu lieu la première semaine de production. Une gestionnaire a eu un AC056 rejeté avec une quinzaine d'erreurs. Dans Lazarus, elle les corrigeait au clavier, dans une grille qu'elle connaissait par cœur. Dans Flussi, elle devait naviguer évènement, bénéficiaire, garantie, puis entité, avec des onglets marqués. Elle a mis plus de temps, a dû saisir ses identifiants VEOS à chaque lancement, et a découvert l'écran Paramètres pour les secrets. Elle a rouvert Lazarus, toujours installée sur son poste, et a fini le travail dedans. Personne n'avait prévu de désinstaller Lazarus ni de date de coupure, puisque la parité devait suffire à la faire abandonner.

En six mois, deux journaux se sont mis à coexister. Flussi écrivait dans `P:\…\Transferts\Journal`, Lazarus dans son propre historique. Les rejets étaient traités dans l'un ou l'autre selon la personne. Le jour où un envoi à MSP a été fait deux fois, une fois depuis chaque outil, et que le journal ne le montrait pas, la direction a constaté qu'elle devait maintenir deux outils. Flussi ne coûtait plus rien en bénéfice et ajoutait une charge de maintenance.

**Hypothèse sous-jacente**

La parité fonctionnelle suffit à faire abandonner Lazarus : un utilisateur captif adoptera un outil identique en moins bien rodé, sans qu'on lui apporte rien.

**Signaux faibles à surveiller**

- Si, au bout de 4 semaines de production, le journal partagé de Flussi enregistre moins de 80 % des sessions d'envoi AC056 de la période, le reste étant tracé dans Lazarus ou nulle part.
- Si aucun atelier avec le service administratif n'a eu lieu, avec une liste d'améliorations écrite et priorisée, avant la fin du 2e mois de développement. Et si Lazarus n'a pas de date de désinstallation fixée par Intune avant la mise en production.

### Mode n° 10 — Bug en production pendant l'absence du seul développeur, sans retour arrière possible

**Histoire**

Flussi est passée en production à la fin du troisième mois, et Lazarus a été retirée le jour même, conformément au cadrage (« elle sera abandonnée »). Aucun poste n'a gardé de plan B. Le cahier des charges AC056 IGA (v1.27) n'était maîtrisé que par un seul développeur. Il vivait aussi dans `uac056.pas`, `ucontrole.pas` et la tête de ce développeur. Un mois plus tard, MSP a modifié sa règle de contrôle sur un champ de l'entité bénéficiaire. Le domaine `shared/domain/ac056` a alors refusé tous les fichiers du jour, y compris ceux que Lazarus aurait acceptés. Le même matin, la clé privée SFTP a expiré. Le dépôt dans `/Depot_AMM_NAS` a échoué, avec une erreur de `ssh2-sftp-client` que le service administratif ne savait pas lire.

Le développeur était en congés. Le service administratif a ouvert le journal partagé sur `P:`, qui ne disait rien d'exploitable. Personne d'autre ne connaissait le format en largeur fixe, les ERRxxx ni l'adapter `veos`. Un correctif a été écrit à distance au bout de deux jours. Mais il fallait repasser par le paquet `.intunewin`, le test de déploiement, puis la poussée Intune. Quatre jours se sont écoulés avant que tous les postes aient la nouvelle version. Certains sont restés en retard, car il n'existait aucun contrôle de version.

Pendant ce temps, personne n'a su relancer Lazarus. L'exécutable avait été désinstallé par Intune, les sources Pascal n'étaient pas archivées au même endroit, et le compilateur n'existait plus sur aucun poste. Les AC056 n'ont plus quitté le cabinet chez MSP pendant sept jours ouvrés. La mise en gestion des bénéficiaires a pris du retard, ce qui a généré des réclamations de clients et un signalement à la direction.

**Hypothèse sous-jacente**

Le développeur sera toujours disponible quand un bug bloquera l'envoi, et un correctif poussé par Intune sera assez rapide pour qu'un retour arrière ne soit pas nécessaire.

**Signaux faibles à surveiller**

- Si, à la date de retrait de Lazarus, personne d'autre que le développeur n'a rejoué avec succès un cycle complet (déclenchement VEOS, FTP, contrôle, dépôt SFTP, rejets) en suivant un runbook écrit, sans son aide.
- Si le délai mesuré entre la publication d'une version de test et la présence de cette version sur 100 % des postes via Intune dépasse 24 heures lors du premier déploiement pilote, ou si la version installée sur chaque poste n'est pas visible.
