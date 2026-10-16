import { describe, expect, it } from 'vitest';
import { creerChiffrementDpapi } from './dpapi';

// DPAPI réel (LocalMachine) : Windows seulement. Valeur témoin fictive.
const TEMOIN = 'TEMOIN-DPAPI-42-valeur-fictive';

describe.runIf(process.platform === 'win32')('creerChiffrementDpapi (Windows)', () => {
  const dpapi = creerChiffrementDpapi();

  it('est disponible : indisponibilite renvoie null', () => {
    expect(dpapi.indisponibilite()).toBeNull();
  });

  it('fait l’aller-retour avec un petit Buffer du pool (byteOffset non nul)', () => {
    // Buffer.from(texte) court est alloué dans le pool partagé : son byteOffset est généralement non nul
    const clair = Buffer.from(TEMOIN);
    const resultat = dpapi.dechiffrer(dpapi.chiffrer(clair));
    expect(Buffer.from(resultat).toString('utf8')).toBe(TEMOIN);
  });

  it('fait l’aller-retour avec un subarray d’un tampon plus grand', () => {
    const grand = Buffer.from(`AAAA${TEMOIN}ZZZZ`);
    const partie = grand.subarray(4, 4 + TEMOIN.length);
    expect(partie.byteOffset).not.toBe(0);
    const resultat = dpapi.dechiffrer(dpapi.chiffrer(partie));
    expect(Buffer.from(resultat).toString('utf8')).toBe(TEMOIN);
  });

  it('fait l’aller-retour avec un Uint8Array simple', () => {
    const clair = new TextEncoder().encode(TEMOIN);
    const resultat = dpapi.dechiffrer(dpapi.chiffrer(clair));
    expect(new TextDecoder().decode(resultat)).toBe(TEMOIN);
  });

  it('produit un blob différent du clair et sans la valeur témoin', () => {
    const clair = Buffer.from(TEMOIN);
    const chiffre = Buffer.from(dpapi.chiffrer(clair));
    expect(chiffre.equals(clair)).toBe(false);
    expect(chiffre.includes(clair)).toBe(false);
    expect(chiffre.length).toBeGreaterThan(clair.length);
  });

  it('refuse un blob altéré (un octet modifié)', () => {
    const chiffre = Buffer.from(dpapi.chiffrer(Buffer.from(TEMOIN)));
    const altere = Buffer.from(chiffre);
    const dernier = altere.length - 1;
    altere[dernier] = (altere[dernier] ?? 0) ^ 0xff;
    expect(() => dpapi.dechiffrer(altere)).toThrow();
  });

  it('refuse des octets qui ne sont pas un blob DPAPI', () => {
    expect(() => dpapi.dechiffrer(Buffer.from('pas un blob DPAPI'))).toThrow();
  });

  it('donne deux blobs différents pour le même clair, tous deux déchiffrables', () => {
    const clair = Buffer.from(TEMOIN);
    const premier = Buffer.from(dpapi.chiffrer(clair));
    const second = Buffer.from(dpapi.chiffrer(clair));
    expect(premier.equals(second)).toBe(false);
    expect(Buffer.from(dpapi.dechiffrer(premier)).toString('utf8')).toBe(TEMOIN);
    expect(Buffer.from(dpapi.dechiffrer(second)).toString('utf8')).toBe(TEMOIN);
  });
});
