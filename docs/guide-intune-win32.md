# Guide : déployer une application de bureau par Intune (application Win32)

Retour d'expérience du premier déploiement de Flussi (2026-10-15), rédigé pour être réutilisé sur un autre projet. Les exemples viennent de Flussi : une application Electron, un installeur NSIS produit par electron-builder et un fichier de configuration déposé à part.

La procédure propre à Flussi et sa liste de contrôle sont dans `docs/deploiement-intune.md`. Les résultats détaillés du pilote sont dans `docs/version-0.2.0.md`, item 5.

---

## 1. Principes retenus

- **Un seul installeur pour tous les environnements.** Le mode (recette, production) vient d'un fichier de configuration, pas de l'installeur. On ne risque pas de déployer « le mauvais installeur ».
- **La configuration est une seconde application Win32**, qui dépend de la première. Changer la configuration, c'est mettre à jour ce petit paquet, sans reconstruire l'application. Une mise à jour de l'application n'écrase jamais la configuration.
- **L'installeur ne contient aucun secret** et aucun fichier de configuration.
- **Un groupe pilote distinct du groupe de production**, dès le premier test. Jamais d'affectation à « Tous les appareils » ou « Tous les utilisateurs » pendant un test.
- **Tester tôt sur un vrai poste géré**, avec un compte standard : installation, premier lancement, mise à jour, désinstallation. Un poste de développeur peut avoir des réglages de sécurité plus souples que ceux des collègues.

## 2. Ce que fait l'installeur (NSIS, electron-builder)

Réglages d'`electron-builder.yml` :

```yaml
win:
  target:
    - nsis
nsis:
  oneClick: true # aucune question, compatible /S
  perMachine: true # C:\Program Files\…, installé pour tous les comptes
  include: build/installer.nsh # script complémentaire (droits, voir plus bas)
publish: null # pas de mise à jour automatique : c'est Intune qui met à jour
```

- **Installation silencieuse** : `Setup.exe /S`.
- **Désinstallation silencieuse** : `"C:\Program Files\{Produit}\Uninstall {Produit}.exe" /allusers /S`. C'est la valeur `QuietUninstallString` écrite dans le registre.
- **La désinstallation et la mise à jour** ne suppriment que le dossier d'installation (et `%APPDATA%\{app}` seulement si on le demande). Un dossier `%ProgramData%\{Produit}` créé par l'installeur est donc conservé, avec la configuration et les secrets.
- **Version surchargée au build**, sans toucher à `package.json` (utile pour les versions de test) :

  ```powershell
  npm.cmd run package -- "-c.extraMetadata.version=0.2.0-pilote"
  ```

  Les **guillemets sont obligatoires** sous PowerShell 5.1. Sans eux, l'argument est coupé au point (`-c .extraMetadata…`), et electron-builder cherche un fichier de configuration de ce nom.
- **Packaging dans un PowerShell administrateur** : la cible NSIS d'electron-builder en a besoin.
- **Les lignes « signing with signtool.exe »** du journal de build ne signifient pas que le fichier est signé. Sans certificat, rien n'est signé. Pour vérifier : `Get-AuthenticodeSignature -FilePath <fichier>`.

### Dossier de configuration avec des droits restreints

Par défaut, `C:\ProgramData` laisse les utilisateurs créer des fichiers dans ses sous-dossiers. Pour un dossier de configuration en lecture seule pour les utilisateurs, `build/installer.nsh` coupe l'héritage et désigne les comptes **par SID**. Sur un Windows en français, « Administrators » et « Users » n'existent pas.

```nsis
!macro customInstall
  ReadEnvStr $0 "PROGRAMDATA"
  StrCpy $1 "$0\Flussi"
  CreateDirectory "$1"
  nsExec::ExecToLog `"$SYSDIR\icacls.exe" "$1" /reset /T`
  Pop $2
  nsExec::ExecToLog `"$SYSDIR\icacls.exe" "$1" /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F *S-1-5-32-545:(OI)(CI)RX`
  Pop $2
  ; en cas d'échec : SetErrorLevel <code> puis Quit, pour qu'Intune voie l'erreur
!macroend
```

- `S-1-5-18` = SYSTEM : obligatoire, car Intune installe sous ce compte.
- `S-1-5-32-544` = Administrateurs.
- `S-1-5-32-545` = Utilisateurs, en lecture seule (`RX`).
- Version complète, avec la gestion des erreurs : `build/installer.nsh`.
- Résultat attendu de `icacls "C:\ProgramData\Flussi"` :

  ```
  BUILTIN\Utilisateurs:(OI)(CI)(RX)
  BUILTIN\Administrateurs:(OI)(CI)(F)
  AUTORITE NT\Système:(OI)(CI)(F)
  ```

  Un fichier déposé ensuite dans ce dossier hérite des mêmes droits, marqués `(I)`.

## 3. Emballer en `.intunewin`

Outil : Microsoft Win32 Content Prep Tool (`IntuneWinAppUtil.exe`), sur le dépôt GitHub `microsoft/Microsoft-Win32-Content-Prep-Tool`. Il est signé par Microsoft.

- **Le dossier source ne doit contenir que les fichiers du paquet** : l'installeur seul, sans le `.blockmap` ni le reste de `release\`.
- **Un dossier source par version.**

```powershell
mkdir C:\Intune\sources\flussi-0.2.0-pilote
copy release\Flussi-0.2.0-pilote-setup.exe C:\Intune\sources\flussi-0.2.0-pilote\
C:\Intune\outil\IntuneWinAppUtil.exe -c C:\Intune\sources\flussi-0.2.0-pilote -s Flussi-0.2.0-pilote-setup.exe -o C:\Intune\paquets -q
```

Le paquet de configuration se fait de la même façon, avec un dossier qui ne contient que `config.json` (`-s config.json`).

## 4. Créer une application Win32 dans Intune

Centre d'administration (`intune.microsoft.com`) → **Applications** → **Windows** → **+ Ajouter** → **Application Windows (Win32)**.

**Règle d'or : taper les valeurs à la main.** Un copier-coller depuis un tableau peut ajouter une tabulation invisible en tête de champ. Au pilote, la valeur de détection collée valait `⇥0.2.0-pilote` : l'application était installée, mais Intune ne la détectait pas et signalait un échec.

### Application principale

| Onglet | Réglage |
|---|---|
| Informations | Fichier `.intunewin`, nom, description, **éditeur** (obligatoire), version |
| Programme | Installation `Setup.exe /S` ; désinstallation `"C:\Program Files\{Produit}\Uninstall {Produit}.exe" /allusers /S` ; comportement **Système** ; redémarrage **Aucune action spécifique** ; codes de retour par défaut |
| Exigences | x64 ; système minimal selon le parc (ici Windows 11 21H2) |
| Règles de détection | Manuelle, **Registre** (voir ci-dessous) |
| Dépendances, Remplacement | Rien |
| Affectations | **Obligatoire** → groupe pilote |

**Règle de détection par le registre** :
- **Clé** : `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}`.
- **Valeur** : `DisplayVersion`, comparaison de chaînes, **Égal à** la version déployée.
- **Associé à une application 32 bits sur des clients 64 bits** : Non.
- Le GUID est fixe pour un `appId` donné : electron-builder le calcule par UUID v5 de l'`appId`. Pour le connaître avant toute installation :

  ```bash
  node -e "const {UUID}=require('./node_modules/builder-util-runtime'); console.log(UUID.v5('com.exemple.app', UUID.parse('50e065bc-3134-11e6-9bab-38c9862bdaf3')))"
  ```

  Pour Flussi (`com.math-prevaris.flussi`) : `f4fbc099-6400-53e0-b346-884096add07f`. On peut aussi le lire après une première installation, avec `reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall /s /f {Produit}`.
- Une valeur d'option `nsis.guid` dans `electron-builder.yml` le remplacerait : ne pas la changer une fois l'application déployée.

### Application de configuration

| Onglet | Réglage |
|---|---|
| Programme | Installation `cmd.exe /c copy /Y config.json "%ProgramData%\{Produit}\config.json"` ; désinstallation `cmd.exe /c del "%ProgramData%\{Produit}\config.json"` ; comportement **Système** |
| Exigences | Comme l'application principale |
| Règles de détection | Manuelle, **Fichier** : chemin `%ProgramData%\{Produit}`, fichier `config.json`, « Le fichier ou le dossier existe » |
| Dépendances | L'application principale, **installation automatique : Oui** |
| Affectations | **Obligatoire** → groupe pilote |

- La dépendance garantit l'ordre : le dossier et ses droits existent avant la copie.
- `cmd.exe /c` développe lui-même `%ProgramData%`.
- **L'application principale n'apparaît dans la liste des dépendances qu'une fois son fichier entièrement envoyé** : attendre la notification de fin de chargement. L'envoi se fait depuis le navigateur, il ne faut pas fermer l'onglet.
- **Limite** : la détection par simple présence du fichier ne redéploie pas un `config.json` modifié. Pour suivre les modifications, il faut une détection par script qui compare l'empreinte SHA-256 du fichier attendu.

## 5. Mettre à jour

1. Produire et emballer la nouvelle version.
2. Dans l'application principale, **Propriétés** :
   - **Informations sur l'application** : nouveau fichier et nouvelle version ;
   - **Programme** : nouvelle commande d'installation (le nom du fichier contient la version) ;
   - **Règles de détection** : nouvelle valeur `DisplayVersion`.
3. Attendre la fin de l'envoi du fichier, puis synchroniser le poste.

Comportements constatés :
- **L'installeur NSIS d'electron-builder ferme l'application si elle est ouverte.** Sous SYSTEM, elle est coupée net, sans passer par sa procédure de fermeture. Pour une application qui peut être en pleine opération (un transfert de fichier, par exemple), prévoir une macro NSIS `customCheckAppRunning` qui sort avec le code **1618** si l'application tourne : Intune considère ce code comme « réessayer plus tard ».
- **La mise à jour lance le désinstalleur de l'ancienne version depuis le dossier temporaire** (`C:\Windows\Temp\ns….tmp\old-uninstaller.exe`). Si ce lancement est bloqué, electron-builder le relance depuis le dossier d'installation.
- **Les fichiers de configuration du dossier `ProgramData` sont conservés.**

## 6. Désinstaller

**L'ordre compte** :
1. Retirer l'affectation de l'application de configuration, **sans la passer en « Désinstaller »**. Sinon, sa commande de désinstallation supprime `config.json`.
2. Passer l'application principale en **Désinstaller**.

Pièges constatés :
- **Ne pas inverser les deux applications.** « Désinstaller » sur la configuration supprime le fichier, et l'application principale reste installée.
- **Une dépendance avec installation automatique l'emporte sur « Désinstaller ».** Tant que la configuration est « Obligatoire », Intune réinstalle l'application principale pour la satisfaire.
- **Le désinstalleur NSIS rend la main aussitôt.** Il se recopie dans le dossier temporaire et se relance. Intune lit le code 0 immédiatement, puis la détection, faite une quinzaine de secondes plus tard, confirme la désinstallation.

## 7. Suivre et diagnostiquer sur le poste

- **Synchroniser** : Paramètres → Comptes → Accès Professionnel ou Scolaire → le compte → Infos → **Synchroniser**.
- **Cette synchronisation ne réveille pas toujours l'agent qui gère les applications Win32** (Intune Management Extension), qui ne vérifie de lui-même qu'environ une fois par heure. Pour le forcer, dans un PowerShell administrateur :

  ```powershell
  Restart-Service -Name IntuneManagementExtension
  ```

- **Journaux** : `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs\`, surtout **`AppWorkload.log`**. Lignes utiles :

| Ligne du journal | Sens |
|---|---|
| `Get policies = [...]` | Applications reçues ; `"Intent":3` = obligatoire, `"Intent":4` = désinstaller |
| `Checked reg path: … value: …` et `Equal: actualValue: …, DetectionValue: …` | Résultat de la détection, avec la valeur attendue exacte (une tabulation y apparaît) |
| `Using content at: C:\WINDOWS\IMECache\…` | Dossier d'où l'installeur est lancé (hors dossier temporaire) |
| `lpExitCode …` | Code de sortie de l'installeur ou du désinstalleur |
| `Handler invoked with execution type: Install` ou `Uninstall` | Action lancée |
| `ToastDependencyAppInstall` | Installation d'une dépendance déclenchée par une autre application |

- **Vérifications rapides** :

  ```powershell
  Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}" | Select-Object DisplayVersion, QuietUninstallString
  icacls "C:\ProgramData\{Produit}"
  Get-FileHash "C:\ProgramData\{Produit}\config.json"
  ```

## 8. Sécurité du poste

- **Un installeur non signé déployé par Intune est passé sans blocage** : installation, mise à jour et désinstallation, malgré un contrôle des applications actif sur le poste. Pas besoin d'acheter un certificat.
- **La règle de contrôle des applications « Block rare and unknown files in Temp folder »** bloque un exécutable inconnu lancé depuis un dossier temporaire de l'utilisateur. Elle a bloqué un installeur d'essai lancé à la main depuis `%TEMP%`. Elle n'a pas gêné Intune, qui lance l'installeur depuis `C:\WINDOWS\IMECache\…`.
- **Ne pas désactiver la protection pour le test** : c'est elle qu'on veut éprouver. En cas d'alerte, noter le fichier, son chemin et la règle avant tout.
- **SmartScreen** ne concerne que les fichiers téléchargés (marque « provenant d'Internet »), pas une installation par Intune.
- **Defender et ASR** : Observateur d'évènements → Microsoft → Windows → Windows Defender → Opérationnel. Évènement 1121 : règle ASR bloquante. Évènement 1122 : règle ASR en audit.

## 9. Liste de contrôle réutilisable

- [ ] Installeur produit, version de test surchargée, non signé (vérifié).
- [ ] Les deux paquets `.intunewin` sont produits depuis des dossiers sources qui ne contiennent que leurs fichiers.
- [ ] Application principale : commandes, comportement Système, détection par le registre (**valeurs tapées à la main**), affectation au groupe pilote.
- [ ] Application de configuration : copie et suppression par `cmd.exe`, détection par fichier, dépendance avec installation automatique (après la fin de l'envoi de l'application principale).
- [ ] Installation : statut Intune, alertes de sécurité, clé de registre, `icacls` du dossier et du fichier de configuration, écriture refusée au compte standard, raccourcis.
- [ ] Premier lancement par un compte standard.
- [ ] Configuration absente, invalide ou enregistrée avec BOM : comportement attendu de l'application.
- [ ] Mise à jour avec l'application ouverte : statut, alertes, configuration conservée, comportement de l'application ouverte.
- [ ] Désinstallation, dans le bon ordre : statut, dossier et raccourcis supprimés, configuration conservée.
