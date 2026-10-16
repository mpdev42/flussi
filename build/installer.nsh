; Extension NSIS de l'installeur Flussi (incluse par electron-builder, voir `nsis.include`).
;
; Rôle : créer `%ProgramData%\Flussi\` avec les droits attendus par l'application installée.
; Ce dossier reçoit `config.json` (déposé à part par Intune) et `secrets.bin` (créé par Flussi,
; lancé en administrateur, quand il enregistre les secrets techniques ; chiffré par DPAPI).
;   - SYSTEM et administrateurs : contrôle total (Intune installe sous le compte SYSTEM,
;     l'administrateur saisit les secrets) ;
;   - utilisateurs : lecture et exécution seules (ils lisent la configuration, jamais ne la modifient).
;
; Pourquoi des SID et non des noms de comptes : les postes sont en français ("Administrateurs",
; "Utilisateurs"), un nom anglais échouerait. S-1-5-18 = SYSTEM, S-1-5-32-544 = administrateurs,
; S-1-5-32-545 = utilisateurs.
;
; Pourquoi couper l'héritage : par défaut, %ProgramData% autorise les utilisateurs à créer des
; fichiers dans ses sous-dossiers, ils pourraient donc remplacer `config.json` ou `secrets.bin`.
; `/reset /T` d'abord élimine toute entrée explicite laissée par une installation précédente, sur
; le dossier ET sur les fichiers qu'il contient (ils ne gardent alors que des droits hérités),
; puis `/inheritance:r` retire les entrées héritées du dossier et `/grant:r` pose les trois droits
; ci-dessus ; les fichiers existants et futurs les reçoivent par héritage.
;
; Les commandes sont idempotentes : la macro est rejouée à chaque mise à jour.
;
; Il n'y a volontairement PAS de macro `customUnInstall`. La désinstallation et la mise à jour
; d'electron-builder ne suppriment que `$INSTDIR` (et `%APPDATA%\Flussi` avec `--delete-app-data`),
; donc `config.json` et `secrets.bin` sont conservés. Les supprimer ferait perdre la configuration
; et les secrets à chaque mise à jour.
;
; Tout échec est visible d'Intune : message, code de sortie non nul (SetErrorLevel) puis Quit
; (comme electron-builder dans installUtil.nsh : SetErrorLevel suivi de Quit fixe le code de sortie).
; La clé de désinstallation, déjà écrite à ce stade, est supprimée avant de quitter : sinon Intune
; détecterait Flussi comme installé (DisplayVersion) et ne rejouerait plus l'installeur, alors que
; le dossier garderait les droits par défaut de %ProgramData% (écriture permise aux utilisateurs).
; Sans clé, Intune ne détecte rien et retente l'installation. Les fichiers de l'application restent
; copiés ; une réinstallation les remplace.
; Codes de sortie : 10 = %ProgramData% introuvable, 11 = dossier non créé, 12 = icacls /reset en
; échec, 13 = icacls (droits) en échec.

; Signale un échec : journal de l'installeur, boîte de dialogue (ignorée en mode /S), code de
; sortie, arrêt de l'installation.
!macro flussiEchecInstallation CODE MESSAGE
  DetailPrint "${MESSAGE}"
  MessageBox MB_OK|MB_ICONSTOP "${MESSAGE}" /SD IDOK
  ; Mêmes constantes qu'electron-builder (uninstaller.nsh) ; la seconde n'existe que si l'appId
  ; diffère du GUID d'installation
  DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY_2}"
  !endif
  SetErrorLevel ${CODE}
  Quit
!macroend

; Appelée par installSection.nsh après la copie des fichiers de l'application.
!macro customInstall
  ; $0 = %ProgramData%, $1 = dossier Flussi, $2 = code de retour d'icacls
  ReadEnvStr $0 "PROGRAMDATA"
  ${If} $0 == ""
    !insertmacro flussiEchecInstallation 10 "Flussi : la variable PROGRAMDATA est vide, le dossier de configuration ne peut pas être créé."
  ${EndIf}

  StrCpy $1 "$0\Flussi"
  CreateDirectory "$1"
  ${IfNot} ${FileExists} "$1"
    !insertmacro flussiEchecInstallation 11 "Flussi : le dossier $1 n'a pas pu être créé."
  ${EndIf}

  nsExec::ExecToLog `"$SYSDIR\icacls.exe" "$1" /reset /T`
  Pop $2
  ${If} $2 != 0
    !insertmacro flussiEchecInstallation 12 "Flussi : icacls /reset /T a échoué sur $1 (code $2)."
  ${EndIf}

  nsExec::ExecToLog `"$SYSDIR\icacls.exe" "$1" /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F *S-1-5-32-545:(OI)(CI)RX`
  Pop $2
  ${If} $2 != 0
    !insertmacro flussiEchecInstallation 13 "Flussi : la pose des droits sur $1 a échoué (code icacls $2)."
  ${EndIf}
!macroend
