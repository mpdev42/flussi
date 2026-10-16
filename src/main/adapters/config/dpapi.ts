import { Dpapi, isPlatformSupported } from '@primno/dpapi';

// Chiffrement DPAPI au niveau de la machine. Seul fichier du projet qui importe `@primno/dpapi`
// (règle ESLint : jamais dans le renderer ni le preload).

export interface ChiffrementMachine {
  /** null si DPAPI est disponible, sinon la cause lisible. */
  indisponibilite(): string | null;
  chiffrer(clair: Uint8Array): Uint8Array;
  dechiffrer(chiffre: Uint8Array): Uint8Array;
}

// Entropie applicative : non secrète, elle sépare cet usage de DPAPI des autres programmes de la
// machine. Elle ne doit JAMAIS changer : secrets.bin deviendrait illisible.
const ENTROPIE = new TextEncoder().encode('Flussi secrets.bin v1');

export function creerChiffrementDpapi(): ChiffrementMachine {
  return {
    indisponibilite() {
      if (isPlatformSupported) return null;
      // Si le binaire ne se charge pas, l'import ne lève pas : `Dpapi` porte la cause dans `error`
      const cause = (Dpapi as { error?: unknown }).error;
      if (cause instanceof Error) return cause.message;
      return typeof cause === 'string' && cause !== '' ? cause : 'module DPAPI non chargé.';
    },
    chiffrer(clair) {
      return Dpapi.protectData(clair, ENTROPIE, 'LocalMachine');
    },
    dechiffrer(chiffre) {
      return Dpapi.unprotectData(chiffre, ENTROPIE, 'LocalMachine');
    },
  };
}
