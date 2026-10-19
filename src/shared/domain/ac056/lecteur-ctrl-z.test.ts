// Ctrl-Z (0x1A) à la lecture et à l'écriture. Parité `CtrlZMarksEOF` de FPC sous Windows
// (`rtl/win/syswinh.inc`) : `ReadLn` s'arrête au premier 0x1A, que Lazarus traite comme la fin du
// fichier (`fmain.pas:2719-2730`). Les 0x1A de la toute fin sont ignorés (anomalie non bloquante
// pour un fichier VEOS, silence pour un rejet) ; un 0x1A suivi d'autres octets reste bloquant
// (divergence : Lazarus tronquerait le fichier en silence). Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  enOctetsBruts,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { avecOctet } from '@shared/test/controle-ac056';
import { controlerAc056 } from './controle';
import { ecrireAc056 } from './ecrivain';
import { ENTITES } from './entites';
import { lireAc056 } from './lecteur';
import type { AnomalieAc056, Provenance } from './modele';

const MESSAGE = "Caractère de fin de fichier (Ctrl-Z) : il sera supprimé à l'enregistrement.";

/** Fichier VEOS complet et conforme, en chaîne binaire, sans saut final (format VEOS). */
const VEOS = enChaineBinaire(fichierSynthetique(lignesCompletes()));
/** Le même, avec un CRLF final. */
const VEOS_CRLF = enChaineBinaire(fichierSynthetique(lignesCompletes(), { sautFinal: true }));
const REJET = enChaineBinaire(fichierSynthetique(lignesRejet(), { sautFinal: true }));

const lire = (chaine: string, provenance: Provenance = 'veos') =>
  lireAc056(enOctetsBruts(chaine), provenance);

const codes = (anomalies: readonly AnomalieAc056[]) => anomalies.map((a) => a.code);

describe('Ctrl-Z final, fichier VEOS', () => {
  it('ne signale rien sur le fichier de référence sans 0x1A', () => {
    expect(lire(VEOS).anomalies).toEqual([]);
    expect(lire(VEOS_CRLF).anomalies).toEqual([]);
  });

  it.each([
    ['après le CRLF final', `${VEOS_CRLF}\x1A`],
    ['collé à la dernière ligne, sans CRLF final', `${VEOS}\x1A`],
    ['plusieurs 0x1A après le CRLF final', `${VEOS_CRLF}\x1A\x1A\x1A`],
    ['plusieurs 0x1A collés à la dernière ligne', `${VEOS}\x1A\x1A`],
  ])('%s : une seule anomalie non bloquante de niveau fichier', (_cas, chaine) => {
    const { anomalies } = lire(chaine);
    expect(anomalies).toEqual([
      { code: 'ctrl-z-final', ligne: null, message: MESSAGE, bloquante: false },
    ]);
    expect(Object.isFrozen(anomalies[0])).toBe(true);
  });

  it('lit les mêmes lignes qu avec le fichier sans 0x1A', () => {
    const sans = lire(VEOS_CRLF).fichier;
    const avec = lire(`${VEOS_CRLF}\x1A\x1A`).fichier;
    expect(avec).toEqual(sans);
    expect(lire(`${VEOS}\x1A`).fichier).toEqual(lire(VEOS).fichier);
  });

  it('ne produit aucune anomalie de contrôle', () => {
    expect(controlerAc056(lire(`${VEOS}\x1A`).fichier)).toEqual([]);
  });

  it('signale le Ctrl-Z avant les anomalies de ligne (niveau fichier d abord)', () => {
    const { anomalies } = lire(`${VEOS_CRLF}\r\n\x1A`);
    expect(anomalies.map((a) => [a.code, a.ligne])).toEqual([
      ['ctrl-z-final', null],
      ['ligne-vide', lignesCompletes().length + 1],
    ]);
  });

  it('garde fichier-vide pour un fichier fait seulement de 0x1A', () => {
    const { fichier, anomalies } = lire('\x1A\x1A');
    expect(fichier.lignes).toEqual([]);
    expect(anomalies.map((a) => [a.code, a.bloquante])).toEqual([
      ['ctrl-z-final', false],
      ['fichier-vide', true],
    ]);
  });
});

describe('0x1A suivi d autres octets (divergence : Lazarus tronquerait le fichier)', () => {
  it('reste bloquant entre deux lignes (ligne d un octet)', () => {
    const lignes = lignesCompletes();
    const chaine = `${lignes[0]}\r\n\x1A\r\n${lignes.slice(1).join('\r\n')}`;
    const { anomalies } = lire(chaine);
    expect(codes(anomalies)).not.toContain('ctrl-z-final');
    expect(anomalies.filter((a) => a.bloquante).map((a) => [a.code, a.ligne])).toEqual([
      ['longueur-ligne', 2],
    ]);
  });

  it('reste bloquant au milieu d une ligne (ligne de 701 octets)', () => {
    const lignes = lignesCompletes();
    const avant = lignes[1] ?? '';
    const chaine = [lignes[0], `${avant.slice(0, 100)}\x1A${avant.slice(100)}`, ...lignes.slice(2)];
    const { anomalies } = lire(chaine.join('\r\n'));
    expect(codes(anomalies)).not.toContain('ctrl-z-final');
    expect(anomalies.filter((a) => a.bloquante).map((a) => [a.code, a.ligne])).toEqual([
      ['longueur-ligne', 2],
    ]);
  });

  it('reste bloquant à la place d un octet d un champ (refusé au contrôle)', () => {
    const lignes = lignesCompletes();
    const indice = lignes.findIndex((l) => l.slice(22, 25) === '405');
    const nom = ENTITES['405'].champs.find((c) => c.nom === 'nom');
    if (nom === undefined) throw new Error('champ nom de la 405 attendu');
    lignes[indice] = avecOctet(lignes[indice] ?? '', nom.position - 1, '\x1A');
    const { fichier, anomalies } = lire(lignes.join('\r\n'));
    expect(anomalies).toEqual([]);
    expect(controlerAc056(fichier).map((a) => [a.code, a.ligne, a.champ, a.bloquante])).toEqual([
      ['caractere-interdit', indice + 1, 'nom', true],
    ]);
  });

  it('signale le 0x1A final mais garde bloquant un 0x1A du milieu', () => {
    const lignes = lignesCompletes();
    const chaine = `${lignes[0]}\r\n\x1A\r\n${lignes.slice(1).join('\r\n')}\x1A`;
    const { anomalies } = lire(chaine);
    expect(anomalies.map((a) => [a.code, a.ligne, a.bloquante])).toEqual([
      ['ctrl-z-final', null, false],
      ['longueur-ligne', 2, true],
    ]);
  });
});

describe('Ctrl-Z final, fichier de rejet', () => {
  it.each([
    ['après le CRLF final', `${REJET}\x1A`],
    ['plusieurs 0x1A', `${REJET}\x1A\x1A`],
    ['collé à la dernière ligne', `${REJET.slice(0, -2)}\x1A`],
  ])('%s : ignoré en silence', (_cas, chaine) => {
    const { fichier, anomalies } = lire(chaine, 'rejet');
    expect(anomalies).toEqual([]);
    expect(fichier.lignes.map((l) => l.origine)).toEqual(lignesRejet());
  });
});

describe('aller-retour lecture puis écriture', () => {
  it.each([
    ['après le CRLF final', VEOS_CRLF, '\x1A'],
    ['collé à la dernière ligne', VEOS, '\x1A'],
    ['plusieurs 0x1A', VEOS_CRLF, '\x1A\x1A\x1A'],
  ])('%s : réécrit l original sans les 0x1A finaux', (_cas, original, ctrlZ) => {
    const sortie = ecrireAc056(lire(`${original}${ctrlZ}`).fichier);
    expect(enChaineBinaire(sortie)).toBe(original);
  });

  it('avec BOM : réécrit le BOM et le contenu, sans les 0x1A finaux', () => {
    const original = enChaineBinaire(fichierSynthetique(lignesCompletes(), { bom: true }));
    const sortie = ecrireAc056(lire(`${original}\x1A`).fichier);
    expect(enChaineBinaire(sortie)).toBe(original);
  });

  it('réécrit à l identique un 0x1A du milieu (ligne brute)', () => {
    const lignes = lignesCompletes();
    const chaine = `${lignes[0]}\r\n\x1A\r\n${lignes.slice(1).join('\r\n')}`;
    expect(enChaineBinaire(ecrireAc056(lire(chaine).fichier))).toBe(chaine);
  });
});
