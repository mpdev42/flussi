import type { LibraryHandle } from 'koffi';

// API Windows de l'auto-élévation de Flussi : relancer `Flussi.exe` en administrateur (invite de
// contrôle de compte, UAC) et attendre sa fin. SEUL fichier du projet qui importe `koffi` (règle
// ESLint : jamais dans le renderer ni le preload).
//
// Pourquoi `koffi` : l'élévation passe obligatoirement par `ShellExecuteExW` avec le verbe `runas`.
// `child_process` ne sait pas élever, et passer par un interpréteur de commandes intermédiaire est
// signalé par l'EDR du poste (incident `windows_binary_copy_and_subsequent_deletion`). `koffi`
// appelle l'API directement, sans aucun processus intermédiaire ; ses binaires sont précompilés
// (`@koromix/koffi-win32-x64`).
//
// `creerApiElevationWindows` n'est branchée que par `src/main/index.ts` (aucun test ne l'appelle).
// `creerApiShellWindows` est la brique bas niveau, utilisable en test avec le seul verbe `open`.

export type ResultatLancementEleve = { ok: true; processus: unknown } | { ok: false; code: number };

export type VerbeShell = 'runas' | 'open';

export interface ApiShellWindows {
  /**
   * `ShellExecuteExW` (`SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC | SEE_MASK_FLAG_NO_UI`,
   * `SW_HIDE`). En cas d'échec, `code` est `GetLastError()`.
   */
  lancer(verbe: VerbeShell, executable: string, parametres: string): ResultatLancementEleve;
  /**
   * Attend la fin du processus lancé (sans bloquer la boucle d'évènements), renvoie son code de
   * sortie et ferme le handle. Rejette si l'attente échoue.
   */
  attendreFin(processus: unknown): Promise<number>;
}

export interface ApiElevationWindows {
  /**
   * `ShellExecuteExW`, verbe `runas`. En cas d'échec, `code` est `GetLastError()` (1223 : invite
   * refusée ou fermée). Bloque le thread appelant jusqu'à la réponse à l'invite.
   */
  lancerEleve(executable: string, parametres: string): ResultatLancementEleve;
  /**
   * Attend la fin du processus lancé (sans bloquer la boucle d'évènements), renvoie son code de
   * sortie et ferme le handle. Rejette si l'attente échoue.
   */
  attendreFin(processus: unknown): Promise<number>;
}

type FonctionNative = ReturnType<LibraryHandle['func']>;

/** Fonctions Windows déclarées une seule fois (les noms de types `koffi` sont globaux). */
interface LiaisonsWindows {
  tailleInfo: number;
  shellExecuteExW: FonctionNative;
  getLastError: FonctionNative;
  waitForSingleObject: FonctionNative;
  getExitCodeProcess: FonctionNative;
  closeHandle: FonctionNative;
}

// Masques de SHELLEXECUTEINFOW.fMask
const SEE_MASK_NOCLOSEPROCESS = 0x00000040;
const SEE_MASK_NOASYNC = 0x00000100;
const SEE_MASK_FLAG_NO_UI = 0x00000400;
const SW_HIDE = 0;
const INFINITE = 0xffffffff;
const WAIT_OBJECT_0 = 0;

let liaisons: LiaisonsWindows | null = null;

function chargerLiaisons(): LiaisonsWindows {
  if (liaisons !== null) return liaisons;

  // Chargement à l'appel, jamais à l'import du module. `require` : le main est émis en CJS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const koffi = require('koffi') as typeof import('koffi');

  const shell32 = koffi.load('shell32.dll');
  const kernel32 = koffi.load('kernel32.dll');

  // SHELLEXECUTEINFOW, Windows 64 bits (112 octets). Les handles et pointeurs sont des
  // `void *` (BigInt ou null côté JS). Le membre `hIconOuMoniteur` tient la place de l'union
  // `hIcon` / `hMonitor` (même taille et même alignement : un pointeur).
  const InfoShellExecute = koffi.struct('SHELLEXECUTEINFOW', {
    cbSize: 'uint32_t',
    fMask: 'uint32_t',
    hwnd: 'void *',
    lpVerb: 'str16',
    lpFile: 'str16',
    lpParameters: 'str16',
    lpDirectory: 'str16',
    nShow: 'int',
    hInstApp: 'void *',
    lpIDList: 'void *',
    lpClass: 'str16',
    hkeyClass: 'void *',
    dwHotKey: 'uint32_t',
    hIconOuMoniteur: 'void *',
    hProcess: 'void *',
  });

  liaisons = {
    tailleInfo: koffi.sizeof(InfoShellExecute),
    // BOOL est un entier 32 bits : `int`, comparé à 0
    shellExecuteExW: shell32.func('int __stdcall ShellExecuteExW(_Inout_ SHELLEXECUTEINFOW *info)'),
    getLastError: kernel32.func('uint32_t __stdcall GetLastError()'),
    waitForSingleObject: kernel32.func(
      'uint32_t __stdcall WaitForSingleObject(void *handle, uint32_t millisecondes)',
    ),
    getExitCodeProcess: kernel32.func(
      'int __stdcall GetExitCodeProcess(void *handle, _Out_ uint32_t *code)',
    ),
    closeHandle: kernel32.func('int __stdcall CloseHandle(void *handle)'),
  };
  return liaisons;
}

/** Sous Vitest (`process.env.VITEST` défini) : aucune élévation réelle ne doit pouvoir partir. */
function sousVitest(): boolean {
  return process.env.VITEST !== undefined;
}

/**
 * Brique bas niveau, testable sans élévation : `ShellExecuteExW` et l'attente de fin. Défense en
 * profondeur après l'incident des invites UAC en série (des tests avaient ouvert de vraies invites
 * Windows) : sous Vitest, le verbe `runas` est refusé (`{ ok: false, code: -1 }`) sans aucun appel
 * natif. Le verbe `open` reste permis (sans effet visible : `SW_HIDE`, `SEE_MASK_FLAG_NO_UI`) : les
 * tests s'en servent pour exercer la mécanique `koffi` sans invite.
 *
 * `koffi` est chargé à l'appel de cette fonction.
 *
 * L'appel `ShellExecuteExW` reste SYNCHRONE sur le thread principal, volontairement : COM y est
 * initialisé (recommandé par la documentation de `ShellExecuteEx`) et `GetLastError()` y est fiable
 * (`koffi` le préserve par thread). Contrepartie assumée : la fenêtre de Flussi est figée pendant
 * l'invite UAC, qui occupe de toute façon le bureau sécurisé. L'attente de fin
 * (`WaitForSingleObject`) reste en `.async`, pour ne pas bloquer la boucle d'évènements.
 */
export function creerApiShellWindows(): ApiShellWindows {
  const api = chargerLiaisons();

  return {
    lancer(verbe, executable, parametres) {
      // Garde-fou n° 2 (le n° 1 est dans `creerApiElevationWindows`) : jamais de `runas` sous Vitest
      if (verbe === 'runas' && sousVitest()) return { ok: false, code: -1 };

      // `_Inout_` : `koffi` recopie la structure remplie par Windows dans cet objet (hProcess)
      const info: Record<string, unknown> = {
        cbSize: api.tailleInfo,
        fMask: SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC | SEE_MASK_FLAG_NO_UI,
        hwnd: null,
        lpVerb: verbe,
        lpFile: executable,
        lpParameters: parametres,
        lpDirectory: null,
        nShow: SW_HIDE,
        hInstApp: null,
        lpIDList: null,
        lpClass: null,
        hkeyClass: null,
        dwHotKey: 0,
        hIconOuMoniteur: null,
        hProcess: null,
      };
      const reussi = Number(api.shellExecuteExW(info)) !== 0;
      // Lu tout de suite : `koffi` protège la valeur de GetLastError() juste après l'appel
      if (!reussi) return { ok: false, code: Number(api.getLastError()) };
      // Sans handle (SEE_MASK_NOCLOSEPROCESS), la fin du processus ne pourrait pas être attendue
      if (info.hProcess === null || info.hProcess === 0n) return { ok: false, code: -2 };
      return { ok: true, processus: info.hProcess };
    },

    async attendreFin(processus) {
      try {
        const attente = await new Promise<number>((resolve, reject) => {
          api.waitForSingleObject.async(
            processus,
            INFINITE,
            (erreur: unknown, resultat: unknown) =>
              erreur ? reject(erreur) : resolve(Number(resultat)),
          );
        });
        if (attente !== WAIT_OBJECT_0) throw new Error(`attente échouée (code ${attente})`);

        const sortie = [0];
        if (Number(api.getExitCodeProcess(processus, sortie)) === 0) {
          throw new Error('code de sortie illisible');
        }
        return Number(sortie[0]);
      } finally {
        api.closeHandle(processus);
      }
    },
  };
}

/**
 * API d'élévation réelle : fine couche sur `creerApiShellWindows` (verbe `runas`). Garde-fou n° 1 :
 * sous Vitest, elle ne charge pas `koffi` et ne lance rien (`lancerEleve` répond le code -1).
 */
export function creerApiElevationWindows(): ApiElevationWindows {
  if (sousVitest()) {
    return {
      lancerEleve: () => ({ ok: false, code: -1 }),
      attendreFin: () => Promise.reject(new Error('élévation réelle interdite pendant les tests')),
    };
  }

  const api = creerApiShellWindows();
  return {
    lancerEleve: (executable, parametres) => api.lancer('runas', executable, parametres),
    attendreFin: (processus) => api.attendreFin(processus),
  };
}
