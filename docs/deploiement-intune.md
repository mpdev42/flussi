# Déploiement de Flussi par Intune

Procédure du test pilote de la v0.2.0 (item 5). Elle servira de base au déploiement de la v1.0.0. Le retour d'expérience, réutilisable hors de ce projet, est dans `docs/guide-intune-win32.md`.

Deux applications Win32 Intune :

| Application                     | Contenu                                         | Rôle                                                                                       |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Flussi                          | `Flussi-{version}-setup.exe` (installeur NSIS)  | Installe Flussi dans `C:\Program Files\Flussi`, crée `%ProgramData%\Flussi` avec ses droits |
| Flussi — configuration recette  | `config.json` (`deploiement/intune/config-recette/`) | Copie `config.json` dans `%ProgramData%\Flussi`. Dépend de l'application Flussi           |

L'installeur est identique en recette et en production. C'est `config.json` qui fixe le mode. L'installeur ne contient ni `config.json` ni aucun secret, et une mise à jour ou une désinstallation de Flussi ne touche jamais à `%ProgramData%\Flussi`.

**Droits posés par l'installeur sur `%ProgramData%\Flussi`** : SYSTEM et Administrateurs en contrôle total, Utilisateurs en lecture seule, héritage de `ProgramData` coupé. `config.json` et `secrets.bin` (item 7) en héritent : `icacls /reset /T` remet à chaque installation les fichiers déjà présents en droits seulement hérités. Si la pose des droits échoue, l'installeur supprime sa clé de désinstallation : Intune ne détecte rien et retente l'installation.

---

## 1. Produire l'installeur

Dans un **PowerShell ouvert en tant qu'administrateur** (electron-builder en a besoin pour la cible NSIS), à la racine du projet :

```powershell
cd C:\Dev\Projets\flussi
npm.cmd run package -- "-c.extraMetadata.version=0.2.0-pilote"
```

- Les guillemets sont obligatoires : sans eux, PowerShell 5.1 coupe l'argument au point (`-c .extraMetadata…`), et electron-builder cherche un fichier de configuration nommé `.extraMetadata.version=…`.
- La version est surchargée au build, sans toucher à `package.json`. Elle s'affiche dans l'en-tête de Flussi, dans le journal et dans « Programmes et fonctionnalités ».
- Résultat : `release\Flussi-0.2.0-pilote-setup.exe`.
- Pour la mise à jour du test, même commande avec `0.2.1-pilote`.
- Module natif DPAPI (item 7) : le journal du build ne doit lancer aucune compilation (`npmRebuild: false` dans `electron-builder.yml`), et `release\win-unpacked\resources\app.asar.unpacked\node_modules\@primno\dpapi\prebuilds\win32-x64\@primno+dpapi.node` doit exister. Le module reste ainsi hors de l'archive `app.asar` : chargé depuis l'archive, il serait recopié dans le dossier temporaire, exposé à la règle « Block rare and unknown files in Temp folder ».

## 2. Emballer en `.intunewin`

Outil : Microsoft Win32 Content Prep Tool, installé dans `C:\Intune\outil\IntuneWinAppUtil.exe` (téléchargé depuis le dépôt GitHub `microsoft/Microsoft-Win32-Content-Prep-Tool`, signature Microsoft vérifiée).

**Terminal** : le même **PowerShell ouvert en tant qu'administrateur** qu'à l'étape 1, avec le compte administrateur dédié. L'outil lui-même ne demande pas d'élévation.

Les paquets sont produits dans `C:\Intune\paquets`. Dans les commandes ci-dessous, remplacer `0.2.0-pilote` par la version produite à l'étape 1.

Installeur : le dossier source ne doit contenir que l'installeur.

```powershell
mkdir C:\Intune\Flussi\0.2.0-pilote
copy C:\Dev\Projets\flussi\release\Flussi-0.2.0-pilote-setup.exe C:\Intune\Flussi\0.2.0-pilote\
C:\Intune\outil\IntuneWinAppUtil.exe -c C:\Intune\Flussi\0.2.0-pilote -s Flussi-0.2.0-pilote-setup.exe -o C:\Intune\paquets
```

Résultat : `C:\Intune\paquets\Flussi-0.2.0-pilote-setup.intunewin`.

Configuration de recette : le dossier source est `deploiement\intune\config-recette` du dépôt, qui ne contient que `config.json`.

```powershell
C:\Intune\outil\IntuneWinAppUtil.exe -c C:\Dev\Projets\flussi\deploiement\intune\config-recette -s config.json -o C:\Intune\paquets
```

Résultat : `C:\Intune\paquets\config.intunewin`. Ce paquet ne change que si `config.json` change : inutile de le refaire pour une nouvelle version de Flussi.

Si le fichier `.intunewin` existe déjà, l'outil demande s'il faut l'écraser.

## 3. Créer les applications dans Intune

Centre d'administration Intune → Applications → Windows → Ajouter → **Application Windows (Win32)**.

**Saisir les valeurs à la main**, surtout celles des règles de détection. Un copier-coller depuis un tableau peut ajouter une tabulation invisible en tête de champ. Au premier essai, la valeur `DisplayVersion` collée valait `⇥0.2.0-pilote` : Flussi était bien installé, mais Intune ne le détectait pas et signalait un échec.

### Application « Flussi »

| Réglage                     | Valeur                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fichier                     | `Flussi-0.2.0-pilote-setup.intunewin`                                                                     |
| Version de l'application    | `0.2.0-pilote`                                                                                            |
| Commande d'installation     | `Flussi-0.2.0-pilote-setup.exe /S`                                                                        |
| Commande de désinstallation | `"C:\Program Files\Flussi\Uninstall Flussi.exe" /allusers /S`                                             |
| Comportement d'installation | Système                                                                                                   |
| Redémarrage de l'appareil   | Aucune action spécifique                                                                                  |
| Codes de retour             | Valeurs par défaut                                                                                        |
| Exigences                   | x64 seulement, Windows 11 21H2 minimum (parc entièrement en Windows 11)                                   |
| Règle de détection          | Manuelle, **Registre**                                                                                    |
| — Chemin de la clé          | `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\f4fbc099-6400-53e0-b346-884096add07f` |
| — Nom de la valeur          | `DisplayVersion`                                                                                          |
| — Méthode de détection      | Comparaison de chaînes, **Égal à** `0.2.0-pilote`                                                         |
| — Application 32 bits       | Non                                                                                                       |
| Affectation                 | Obligatoire, groupe du poste pilote                                                                       |

La clé `f4fbc099-…` est fixe : electron-builder la calcule à partir de l'`appId` (`com.math-prevaris.flussi`). Elle ne change pas d'une version à l'autre.

### Application « Flussi — configuration recette »

| Réglage                     | Valeur                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Fichier                     | `config.intunewin`                                                 |
| Commande d'installation     | `cmd.exe /c copy /Y config.json "%ProgramData%\Flussi\config.json"` |
| Commande de désinstallation | `cmd.exe /c del "%ProgramData%\Flussi\config.json"`                |
| Comportement d'installation | Système                                                            |
| Règle de détection          | Manuelle, **Fichier**                                              |
| — Chemin                    | `%ProgramData%\Flussi`                                             |
| — Fichier ou dossier        | `config.json`                                                      |
| — Méthode de détection      | Le fichier ou le dossier existe                                    |
| Dépendances                 | Flussi, installation automatique : Oui                             |
| Affectation                 | Obligatoire, même groupe                                           |

La dépendance garantit que Flussi, donc `%ProgramData%\Flussi` et ses droits, est en place avant la copie.

## 4. Suivre un déploiement sur le poste

- Forcer la synchronisation : Paramètres → Comptes → Accès Professionnel ou Scolaire → le compte → Infos → Synchroniser (ou Portail d'entreprise → Synchroniser).
- Journaux de l'agent Intune : `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs\` (`IntuneManagementExtension.log`, `AppWorkload.log`).
- Blocages Defender et ASR : Observateur d'évènements → Journaux des applications et des services → Microsoft → Windows → Windows Defender → Opérationnel. Évènement 1121 : règle ASR bloquante. Évènement 1122 : règle ASR en audit.
- SmartScreen ne s'applique qu'aux fichiers téléchargés (marque « provenant d'Internet »). Une installation par Intune ne devrait pas le déclencher. Une installation manuelle d'un fichier téléchargé, oui.
- **Contrôle des applications de la solution de sécurité** : la règle « Block rare and unknown files in Temp folder » bloque le démarrage d'un exécutable inconnu lancé depuis un dossier temporaire. Elle a bloqué un installeur NSIS d'essai le 2026-10-15. Pour chaque alerte, noter le fichier, son chemin et la règle. Trois moments sont exposés :
  - **Installation** : Intune lance l'installeur depuis son cache (`C:\Windows\IMECache\…`), hors dossier temporaire. Elle devrait passer.
  - **Mise à jour** : l'installeur copie le désinstalleur de l'ancienne version dans `C:\Windows\Temp\ns….tmp\old-uninstaller.exe` et le lance depuis cet emplacement. Si ce lancement échoue, electron-builder relance le désinstalleur depuis `C:\Program Files\Flussi`. Si la solution laisse démarrer le processus puis l'arrête, le repli ne joue pas.
  - **Désinstallation** : un désinstalleur NSIS se recopie dans le dossier temporaire (`C:\Windows\Temp\~nsu….tmp\`) avant de s'exécuter. C'est le moment le plus exposé.

## 5. Mettre à jour

1. Produire et emballer le build `0.2.1-pilote` (étapes 1 et 2).
2. Dans l'application « Flussi » : remplacer le fichier `.intunewin`, puis passer la commande d'installation à `Flussi-0.2.1-pilote-setup.exe /S` et la valeur de détection à `0.2.1-pilote`.
3. Synchroniser le poste. Intune ne détecte plus `0.2.1-pilote`, il installe la nouvelle version par-dessus l'ancienne.

Si Flussi est ouvert pendant la mise à jour, l'installeur le ferme. Sous SYSTEM, il le coupera probablement de force, sans ligne « Fin de session » dans le journal.

### Réinstaller après une désinstallation

Cas du pilote : Flussi a été désinstallé par Intune (affectation « Désinstaller ») et `config.json` est resté sur le poste (§ 6).

1. Produire et emballer la nouvelle version (étapes 1 et 2).
2. Application « Flussi » : remplacer le fichier `.intunewin`, mettre à jour la commande d'installation et la valeur de détection (saisie à la main), puis passer l'affectation de « Désinstaller » à « Obligatoire ».
3. Application « Flussi — configuration recette » : repasser l'affectation en « Obligatoire ».
4. Synchroniser le poste (§ 4).

Points d'attention (constatés le 2026-10-16) :

- **`config.json` resté sur le poste** : « Flussi — configuration recette » est détectée comme déjà installée, donc sa dépendance (installation automatique de Flussi) ne se déclenche pas. Seule l'affectation « Obligatoire » de « Flussi » lance l'installation.
- **Délai de prise en compte** : le changement d'affectation et la nouvelle règle de détection peuvent mettre plusieurs minutes à arriver sur le poste. Dans `AppWorkload.log`, la ligne `Checked reg path: …\Uninstall\f4fbc099-…, name: DisplayVersion, … value: …` donne la valeur de détection reçue. Tant qu'elle vaut l'ancienne version, ou que le journal indique `intent is to un-install` pour Flussi, le poste n'a pas reçu les modifications. Synchroniser de nouveau, ou forcer un nouveau passage de l'agent dans un PowerShell administrateur :
  ```powershell
  Restart-Service -Name IntuneManagementExtension
  ```

## 6. Désinstaller

1. Retirer l'affectation de « Flussi — configuration recette » (sans la passer en « Désinstaller », pour garder `config.json`). **Attention à ne pas inverser les deux applications** : « Désinstaller » sur la configuration supprime `config.json` (constaté au pilote).
2. Passer l'affectation de « Flussi » en **Désinstaller**, puis synchroniser. Toujours dans cet ordre : tant que la configuration reste « Obligatoire », sa dépendance (installation automatique) réinstalle Flussi (constaté au pilote).

`%ProgramData%\Flussi`, `config.json` et `secrets.bin` restent en place.

## 7. Saisir les secrets techniques

Une fois par poste, après le déploiement de Flussi et de sa configuration. Les secrets sont chiffrés pour la machine (DPAPI, portée `LocalMachine`) dans `%ProgramData%\Flussi\secrets.bin` : tout compte du poste peut les utiliser, mais le fichier copié sur un autre poste est illisible, et un poste réinstallé demande une nouvelle saisie.

Trois secrets : mot de passe FTP IGA, mot de passe SFTP MSP, clé privée SFTP MSP. Les comptes (`IGA_FTP_USER`, `MSP_SFTP_USER`) restent dans `config.json`.

1. **Préparer la clé** (fichier `.ppk` de FileZilla), si besoin, avec PuTTYgen :
   - format accepté : PPK version 2 de type RSA ou DSA, ou OpenSSH, sans phrase secrète ;
   - PPK version 3 (`PuTTY-User-Key-File-3`, format par défaut des PuTTY récents) : charger la clé, puis Key → Parameters for saving key files → PPK file version 2, puis « Save private key » ;
   - clé PPK ed25519 ou ECDSA : Conversions → Export OpenSSH key ;
   - clé protégée par une phrase secrète : vider « Key passphrase » et « Confirm passphrase », puis enregistrer ;
   - ne jamais déposer le fichier de clé dans un dossier synchronisé (`P:`, OneDrive).
2. **Lancer Flussi normalement**, dans la session de l'utilisateur. **Jamais « en tant qu'administrateur »** : le compte administrateur ne voit pas `P:`, qui est un `subst` de la session de l'utilisateur, et Flussi refuserait de démarrer (constaté le 2026-10-16).
3. **Paramètres → Secrets techniques → « Modifier les secrets ».** Un seul bouton déverrouille tous les champs.
4. **Saisir les mots de passe à changer** (un champ laissé vide ne change pas) et, pour la clé, **« Choisir la clé… »** : Flussi la contrôle aussitôt et affiche « Clé prête (PPK version 2) » ou le motif du refus.
5. **« Enregistrer ».** Windows affiche **une seule** invite de contrôle de compte pour tous les changements (programme : « Flussi.exe », éditeur : inconnu, car Flussi n'est pas signé) : saisir l'identifiant et le mot de passe du compte administrateur.
6. Les statuts passent à « Renseigné le JJ/MM/AAAA » et la section se reverrouille. Le journal trace une ligne par secret (« Secret renseigné : … », « Secret remplacé : … »), jamais la valeur.

Invite fermée sans valider : rien n'est enregistré, la saisie et la clé choisie restent en place pour réessayer. « Annuler » reverrouille la section sans rien enregistrer.

**Fonctionnement** : Flussi chiffre lui-même le nouveau `secrets.bin` (DPAPI), en mémoire. Il se relance élevé (`Flussi.exe` → `Flussi.exe`, par l'API Windows `ShellExecuteEx` avec le verbe « runas ») dans un mode qui ne fait qu'écrire : le Flussi élevé reçoit le fichier chiffré par un canal nommé (aucun fichier temporaire, rien sur la ligne de commande), vérifie qu'il se déchiffre, l'écrit dans `%ProgramData%\Flussi`, dont les droits ne changent pas (utilisateurs en lecture seule), puis se termine. Flussi relit ensuite le fichier pour vérifier l'enregistrement. Ni PowerShell ni `cmd.exe` : la première version passait par eux et déclenchait l'EDR (alerte `windows_binary_copy_and_subsequent_deletion`, 2026-10-16).

Remplacer un secret : le saisir de nouveau, par la même procédure. Aucun secret n'est jamais réaffiché. En dev (`npm run dev`), les secrets viennent du `.env` et la section est en lecture seule, sans bouton « Modifier les secrets ».

## 8. Évolution pour la v1.0.0

- Un groupe de production (postes du service administratif), distinct du groupe pilote, créé à la mise en production. Le groupe pilote garde la configuration de recette, le groupe de production reçoit la configuration de production. Jamais la configuration de recette sur le groupe de production.
- Une application « Flussi — configuration production » remplace celle de recette par le **remplacement** Intune (supersedence), qui désinstalle l'ancienne avant d'installer la nouvelle. Jamais deux affectations indépendantes : la désinstallation de la recette pourrait supprimer le `config.json` de production.
- La détection par simple présence du fichier ne redéploie pas un `config.json` modifié. Il faudra une détection par empreinte SHA-256 (backlog).

---

## Liste de contrôle du test pilote

Poste de l'utilisateur. L'emballage, le déploiement et les vérifications administrateur se font avec le compte administrateur dédié, les lancements avec le compte utilisateur standard.

Prérequis : dossiers `IN`, `OUT` et `Journal` créés dans `P:\Siege\Service administratif\MATH\APIVIA Transfert\Transferts\RECETTE`.

Les résultats sont tracés dans « Décisions d'implémentation » de l'item 5 (`docs/version-0.2.0.md`).

### 1. Installation par Intune

- [ ] Les deux applications sont installées, statut « Installé » dans Intune.
- [ ] Réaction de Defender, d'une règle ASR ou de SmartScreen à l'installation (évènements 1121 et 1122, notifications) : aucune, ou le blocage constaté.
- [ ] Alerte du contrôle des applications à l'installation : aucune, ou fichier, chemin et règle.
- [ ] `reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\f4fbc099-6400-53e0-b346-884096add07f` : `DisplayVersion` = `0.2.0-pilote` ; noter `QuietUninstallString` pour confirmer la commande de désinstallation.
- [ ] `icacls "%ProgramData%\Flussi"` : seulement `AUTORITE NT\Système:(OI)(CI)(F)`, `BUILTIN\Administrateurs:(OI)(CI)(F)`, `BUILTIN\Utilisateurs:(OI)(CI)(RX)`, aucune entrée héritée.
- [ ] `icacls "%ProgramData%\Flussi\config.json"` : les mêmes entrées, marquées `(I)` (héritées).
- [ ] Compte standard : impossible de créer ou de modifier un fichier dans `%ProgramData%\Flussi` (accès refusé).
- [ ] Raccourcis créés (menu Démarrer, bureau) ; cohabitation avec le raccourci « Flussi » de Lazarus.

### 2. Premier lancement (compte standard)

- [ ] Réaction de Defender ou d'une règle ASR au lancement de `Flussi.exe`, non signé.
- [ ] Titre « Flussi — Recette », bandeau Recette, « Flussi 0.2.0-pilote » dans l'en-tête, nouvelle icône (barre des tâches, Alt+Tab).
- [ ] Fichier de session créé dans `RECETTE\Journal\AAAA\MM\` (`AAAAMMJJ-HHMMSS-{compte}.txt`).
- [ ] Écran Journal sur le vrai dossier : la session en cours apparaît, aucun mois « indisponible » (entrée OneDrive « à la demande »).
- [ ] Fermeture : durée entre le clic et la disparition de la fenêtre, ligne « Fin de session » présente.

### 3. Configuration (compte administrateur, puis relance par le compte standard)

Intune peut recopier `config.json` à la synchronisation suivante : faire ces essais d'affilée.

- [ ] `config.json` réenregistré par PowerShell 5.1 avec BOM (`Get-Content … | Set-Content -Encoding UTF8 …`) : Flussi démarre.
- [ ] `config.json` renommé : boîte « Flussi ne peut pas démarrer », « fichier introuvable, il est obligatoire », arrêt.
- [ ] `config.json` au contenu invalide (une accolade supprimée) : « JSON invalide », arrêt.
- [ ] `config.json` rétabli : Flussi démarre.

### 4. Lecteur `P:` (selon les occasions)

- [ ] `P:` absent ou monté en retard (lancement dès l'ouverture de session, ou lecteur déconnecté) : boîte « Réessayer » / « Quitter », « Réessayer » fonctionne une fois `P:` disponible.
- [ ] Si l'occasion se présente : verrou OneDrive (`EBUSY` / `EPERM`) ou copie de conflit (`nom-NOMPOSTE.ext`), message et marquage observés.

### 5. Mise à jour vers `0.2.1-pilote`

- [ ] Alerte du contrôle des applications sur `old-uninstaller.exe` (dossier temporaire) : aucune, ou bloquée. Statut Intune de la mise à jour, et ancienne version bien retirée (pas de fichiers mêlés dans `C:\Program Files\Flussi`).
- [ ] Mise à jour avec Flussi **ouvert** : Flussi fermé ou non par l'installeur, présence ou absence de « Fin de session » dans le journal.
- [ ] Relance : « Flussi 0.2.1-pilote » dans l'en-tête.
- [ ] `config.json` conservé (contenu et droits).

### 6. Désinstallation

- [ ] Alerte du contrôle des applications sur la copie temporaire du désinstalleur : aucune, ou bloquée.
- [ ] Flussi désinstallé (`C:\Program Files\Flussi` supprimé, raccourcis retirés), statut Intune correct.
- [ ] `%ProgramData%\Flussi\config.json` conservé.

### 7. Secrets techniques (item 7)

Prérequis : Flussi puis la configuration repassés en « Obligatoire » (dans cet ordre), version de test déployée. Clés de test fabriquées pour l'occasion (PPK version 3, PPK version 2 avec phrase secrète), jamais versionnées. Résultats tracés dans « Décisions d'implémentation » de l'item 7.

- [ ] Section « Secrets techniques » verrouillée : statuts « Non renseigné », bouton « Modifier les secrets ».
- [ ] Carte « Configuration » : source « config.json » et chemin `C:\ProgramData\Flussi\config.json` ; « Ouvrir dans l'Explorateur » ouvre les quatre dossiers sur `P:`.
- [ ] Alerte de la solution de sécurité au chargement du module DPAPI (`…\app.asar.unpacked\node_modules\@primno\dpapi\prebuilds\win32-x64\@primno+dpapi.node`, non signé) : aucune, ou bloqué (la carte affiche alors « Le chiffrement Windows (DPAPI) n'est pas disponible… »).
- [ ] Clé PPK version 3 et clé avec phrase secrète refusées dès le choix du fichier, avec leur message ; ligne « Secret refusé : Clé privée SFTP MSP. … » au journal.
- [ ] Invite fermée sans valider : rien n'est enregistré, saisie et clé choisie conservées, rien au journal.
- [ ] Alerte de l'EDR ou de la solution de sécurité à l'enregistrement (`Flussi.exe` qui relance `Flussi.exe` élevé) : aucune, ou règle, processus et action (alerte ou blocage, message « L'écriture du fichier des secrets … a échoué »).
- [ ] Deux mots de passe et la clé enregistrés en **une seule** invite (programme affiché : « Flussi.exe », éditeur inconnu) : « Renseigné le … » ×3, section reverrouillée, lignes « Secret renseigné : … » ou « Secret remplacé : … » au journal. Aucune valeur dans le fichier de session (vérifier dans le Bloc-notes, Ctrl+F ; pas de `Select-String`, qui garderait la valeur dans l'historique de PowerShell).
- [ ] `icacls "%ProgramData%\Flussi\secrets.bin"` : entrées héritées `(I)` seulement. Compte standard : modification et suppression de `secrets.bin` refusées. Aucun `secrets.bin.*.tmp` restant dans `%ProgramData%\Flussi`.
- [ ] Relance : « Renseigné le … » ×3.
- [ ] Bandeau « Journal non enregistré » : renommer `RECETTE\Journal` pendant la session, enregistrer un secret → bandeau ; rétablir le dossier, enregistrer de nouveau → le bandeau disparaît et les lignes en attente sont écrites.
- [ ] Mise à jour par Intune vers une version supérieure : `secrets.bin` conservé, droits toujours hérités, « Renseigné le … » ×3 pour le compte standard.
- [ ] (Facultatif) Fichier illisible : `secrets.bin` remplacé par un autre fichier → alerte « ne peut pas être déchiffré sur ce poste » ; un nouvel enregistrement le recrée (ligne `INFO` au journal), les autres secrets sont à ressaisir.

### En cas de blocage

Si Defender, une règle ASR, SmartScreen ou le contrôle des applications bloquent l'installeur, sa mise à jour, sa désinstallation ou l'application : noter le message exact, le fichier, son chemin et la règle. Selon le blocage, la solution est :
- une exception ciblée dans la solution de sécurité ;
- une commande Intune adaptée (par exemple, désinstalleur lancé sur place) ;
- ou la procédure d'installation manuelle sur les postes, à rédiger ici.

Pas d'achat de certificat.
