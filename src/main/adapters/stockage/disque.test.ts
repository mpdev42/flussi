import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, win32 } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Configuration } from '@shared/schemas/config';
import { creerStockageDisque } from './disque';
import type {
  ElementStockage,
  Emplacement,
  EntreeDossier,
  ErreurStockage,
  ResultatStockage,
  Stockage,
  SystemeFichiers,
} from './types';

// Dossier temporaire avec IN, OUT et Journal, valeurs fictives, aucun accès à P:.
// Les erreurs sont injectées par un faux SystemeFichiers qui délègue au vrai système de fichiers.

let base: string;
let dossiers: Configuration['dossiers'];

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'flussi-stockage-'));
  dossiers = {
    travail: base,
    in: join(base, 'IN'),
    out: join(base, 'OUT'),
    journal: join(base, 'Journal'),
  };
  for (const dossier of [dossiers.in, dossiers.out, dossiers.journal]) mkdirSync(dossier);
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
});

// --- Faux système de fichiers ---

type Operation = keyof SystemeFichiers;

interface Panne {
  operation: Operation;
  code: string;
  /** Chemin exact visé (tous les chemins si absent). */
  chemin?: string;
  /** Nombre d'échecs avant de laisser passer (toujours si absent). */
  fois?: number;
}

const systemeReel: SystemeFichiers = {
  stat: (chemin) => fsPromises.stat(chemin),
  readdir: (chemin) => fsPromises.readdir(chemin, { withFileTypes: true }),
  opendir: (chemin) => fsPromises.opendir(chemin),
  readFile: (chemin) => fsPromises.readFile(chemin),
  appendFile: (chemin, octets) => fsPromises.appendFile(chemin, octets),
  mkdir: async (chemin) => {
    await fsPromises.mkdir(chemin);
  },
};

function creerFaux(pannes: Panne[] = [], surcharges: Partial<SystemeFichiers> = {}) {
  const appels: { operation: Operation; chemin: string }[] = [];
  const restantes = pannes.map((panne) => ({ ...panne, restant: panne.fois ?? Infinity }));

  const intercepter = (operation: Operation, chemin: string): void => {
    appels.push({ operation, chemin });
    const panne = restantes.find(
      (p) =>
        p.operation === operation &&
        (p.chemin === undefined || p.chemin === chemin) &&
        p.restant > 0,
    );
    if (panne) {
      panne.restant--;
      throw Object.assign(new Error(`panne simulée ${panne.code}`), { code: panne.code });
    }
  };

  const fs: SystemeFichiers = {
    stat: async (chemin) => {
      intercepter('stat', chemin);
      return (surcharges.stat ?? systemeReel.stat)(chemin);
    },
    readdir: async (chemin) => {
      intercepter('readdir', chemin);
      return (surcharges.readdir ?? systemeReel.readdir)(chemin);
    },
    opendir: async (chemin) => {
      intercepter('opendir', chemin);
      return (surcharges.opendir ?? systemeReel.opendir)(chemin);
    },
    readFile: async (chemin) => {
      intercepter('readFile', chemin);
      return (surcharges.readFile ?? systemeReel.readFile)(chemin);
    },
    appendFile: async (chemin, octets) => {
      intercepter('appendFile', chemin);
      return (surcharges.appendFile ?? systemeReel.appendFile)(chemin, octets);
    },
    mkdir: async (chemin) => {
      intercepter('mkdir', chemin);
      return (surcharges.mkdir ?? systemeReel.mkdir)(chemin);
    },
  };

  return {
    fs,
    appels,
    cheminsAppeles: (operation: Operation) =>
      appels.filter((a) => a.operation === operation).map((a) => a.chemin),
  };
}

/** `attendre` simulé : enregistre les délais demandés, n'attend jamais. */
function creerAttente() {
  const delais: number[] = [];
  const attendre = vi.fn(async (ms: number) => {
    delais.push(ms);
  });
  return { attendre, delais };
}

function creerStockage(pannes: Panne[] = [], surcharges: Partial<SystemeFichiers> = {}) {
  const faux = creerFaux(pannes, surcharges);
  const { attendre, delais } = creerAttente();
  const stockage: Stockage = creerStockageDisque(dossiers, { fs: faux.fs, attendre });
  return { stockage, faux, attendre, delais };
}

// --- Aides d'assertion ---

function valeurDe<T>(resultat: ResultatStockage<T>): T {
  if (!resultat.ok) throw new Error(`échec inattendu : ${JSON.stringify(resultat.erreur)}`);
  return resultat.valeur;
}

function erreurDe<T>(resultat: ResultatStockage<T>): ErreurStockage {
  if (resultat.ok) throw new Error('succès inattendu');
  return resultat.erreur;
}

const memesOctets = (a: Uint8Array, b: Uint8Array): boolean =>
  Buffer.from(a).equals(Buffer.from(b));

const parNom = (a: ElementStockage, b: ElementStockage): number => a.nom.localeCompare(b.nom);

const racineLecteur = () => win32.parse(base).root;

// --- verifierAcces ---

describe('creerStockageDisque — verifierAcces', () => {
  it('réussit quand IN, OUT et Journal existent', async () => {
    const { stockage } = creerStockage();
    expect(await stockage.verifierAcces()).toEqual({ ok: true });
  });

  it('signale Journal absent par une erreur dossier-absent', async () => {
    rmSync(dossiers.journal, { recursive: true });
    const { stockage } = creerStockage();
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs).toHaveLength(1);
    expect(resultat.erreurs[0]).toMatchObject({
      code: 'dossier-absent',
      emplacement: 'journal',
      chemin: dossiers.journal,
    });
    expect(resultat.erreurs[0]?.message).toContain('Flussi ne le crée pas');
  });

  it('remonte IN et Journal absents d’un coup, dans l’ordre in, out, journal', async () => {
    rmSync(dossiers.in, { recursive: true });
    rmSync(dossiers.journal, { recursive: true });
    const { stockage } = creerStockage();
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs.map((e) => [e.emplacement, e.code])).toEqual([
      ['in', 'dossier-absent'],
      ['journal', 'dossier-absent'],
    ]);
  });

  it('refuse un fichier à la place d’un dossier', async () => {
    rmSync(dossiers.out, { recursive: true });
    writeFileSync(dossiers.out, 'je suis un fichier');
    const { stockage } = creerStockage();
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs).toHaveLength(1);
    expect(resultat.erreurs[0]).toMatchObject({
      code: 'dossier-absent',
      emplacement: 'out',
      chemin: dossiers.out,
      message: "ce chemin n'est pas un dossier.",
    });
  });

  it('ne crée aucun fichier ni dossier, même quand un dossier manque', async () => {
    rmSync(dossiers.journal, { recursive: true });
    const avant = readdirSync(base, { recursive: true }).sort();
    const { stockage, faux } = creerStockage();
    await stockage.verifierAcces();
    expect(readdirSync(base, { recursive: true }).sort()).toEqual(avant);
    expect(faux.cheminsAppeles('mkdir')).toEqual([]);
    expect(faux.cheminsAppeles('appendFile')).toEqual([]);
  });

  it('ouvre chaque dossier en lecture (opendir)', async () => {
    const { stockage, faux } = creerStockage();
    await stockage.verifierAcces();
    expect(faux.cheminsAppeles('opendir')).toEqual([dossiers.in, dossiers.out, dossiers.journal]);
  });

  it.each(['ENOENT', 'UNKNOWN', 'EIO', 'ETIMEDOUT'])(
    'signale lecteur-indisponible quand la racine est absente et que la racine du lecteur répond %s',
    async (code) => {
      const lecteur = racineLecteur();
      const { stockage } = creerStockage([
        { operation: 'stat', chemin: dossiers.journal, code: 'ENOENT' },
        { operation: 'stat', chemin: lecteur, code },
      ]);
      const resultat = await stockage.verifierAcces();
      if (resultat.ok) throw new Error('succès inattendu');
      expect(resultat.erreurs).toHaveLength(1);
      expect(resultat.erreurs[0]).toMatchObject({
        code: 'lecteur-indisponible',
        emplacement: 'journal',
        chemin: dossiers.journal,
      });
      expect(resultat.erreurs[0]?.message).toBe(
        `lecteur ${lecteur.slice(0, 2)} non monté ou déconnecté.`,
      );
    },
  );

  it('signale lecteur-indisponible sur un code réseau de la racine', async () => {
    const { stockage } = creerStockage([
      { operation: 'stat', chemin: dossiers.in, code: 'ETIMEDOUT' },
    ]);
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs[0]).toMatchObject({ code: 'lecteur-indisponible', emplacement: 'in' });
  });

  it('signale dossier-absent quand la racine est absente mais que le lecteur répond', async () => {
    const { stockage, faux } = creerStockage([
      { operation: 'stat', chemin: dossiers.journal, code: 'ENOENT' },
    ]);
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs).toHaveLength(1);
    expect(resultat.erreurs[0]?.code).toBe('dossier-absent');
    expect(faux.cheminsAppeles('stat')).toContain(racineLecteur());
  });

  it('signale acces-refuse quand l’ouverture en lecture échoue en EACCES', async () => {
    const { stockage, delais } = creerStockage([
      { operation: 'opendir', chemin: dossiers.out, code: 'EACCES' },
    ]);
    const resultat = await stockage.verifierAcces();
    if (resultat.ok) throw new Error('succès inattendu');
    expect(resultat.erreurs).toHaveLength(1);
    expect(resultat.erreurs[0]).toMatchObject({
      code: 'acces-refuse',
      emplacement: 'out',
      chemin: dossiers.out,
    });
    expect(delais).toEqual([]);
  });
});

// --- ajouter ---

describe('creerStockageDisque — ajouter', () => {
  it('crée 2026/10 niveau par niveau, puis le fichier', async () => {
    const { stockage, faux } = creerStockage();
    const octets = new TextEncoder().encode('ligne 1\r\n');
    valeurDe(await stockage.ajouter('journal', '2026/10/session.txt', octets));

    expect(faux.cheminsAppeles('mkdir')).toEqual([
      win32.join(dossiers.journal, '2026'),
      win32.join(dossiers.journal, '2026', '10'),
    ]);
    expect(faux.cheminsAppeles('appendFile')).toEqual([
      win32.join(dossiers.journal, '2026', '10', 'session.txt'),
    ]);
    expect(
      memesOctets(readFileSync(join(dossiers.journal, '2026', '10', 'session.txt')), octets),
    ).toBe(true);
  });

  it('accepte les deux séparateurs dans le nom relatif', async () => {
    const { stockage } = creerStockage();
    valeurDe(await stockage.ajouter('out', '2026\\10\\x.txt', new Uint8Array([65])));
    expect(existsSync(join(dossiers.out, '2026', '10', 'x.txt'))).toBe(true);
  });

  it('concatène deux appels, octets exacts (CRLF, BOM, 0x80 à 0xFF)', async () => {
    const { stockage } = creerStockage();
    const bom = [0xef, 0xbb, 0xbf];
    const haut = Array.from({ length: 128 }, (_v, i) => 0x80 + i);
    const premier = new Uint8Array([...bom, 0x41, 0x0d, 0x0a]);
    const second = new Uint8Array([...haut, 0x0d, 0x0a, 0x00]);

    valeurDe(await stockage.ajouter('journal', '2026/10/s.txt', premier));
    valeurDe(await stockage.ajouter('journal', '2026/10/s.txt', second));

    const attendu = new Uint8Array([...premier, ...second]);
    expect(memesOctets(readFileSync(join(dossiers.journal, '2026', '10', 's.txt')), attendu)).toBe(
      true,
    );
  });

  it('n’écrase jamais un fichier existant', async () => {
    writeFileSync(join(dossiers.out, 'existant.txt'), 'AB');
    const { stockage } = creerStockage();
    valeurDe(await stockage.ajouter('out', 'existant.txt', new TextEncoder().encode('CD')));
    expect(readFileSync(join(dossiers.out, 'existant.txt'), 'utf8')).toBe('ABCD');
  });

  it('signale introuvable quand un fichier tient la place d’un sous-dossier intermédiaire', async () => {
    writeFileSync(join(dossiers.out, '2026'), 'je suis un fichier');
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.ajouter('out', '2026/x.txt', new Uint8Array([1])));
    expect(erreur.code).toBe('introuvable');
    expect(readFileSync(join(dossiers.out, '2026'), 'utf8')).toBe('je suis un fichier');
  });

  it('n’appelle pas mkdir pour un fichier à la racine', async () => {
    const { stockage, faux } = creerStockage();
    valeurDe(await stockage.ajouter('in', 'x.txt', new Uint8Array([1])));
    expect(faux.cheminsAppeles('mkdir')).toEqual([]);
  });

  it('refuse Journal absent par dossier-absent et ne crée rien', async () => {
    rmSync(dossiers.journal, { recursive: true });
    const avant = readdirSync(base, { recursive: true }).sort();
    const { stockage } = creerStockage();

    const erreur = erreurDe(
      await stockage.ajouter('journal', '2026/10/s.txt', new Uint8Array([1])),
    );

    expect(erreur).toMatchObject({
      code: 'dossier-absent',
      emplacement: 'journal',
      chemin: dossiers.journal,
    });
    expect(existsSync(dossiers.journal)).toBe(false);
    expect(existsSync(join(dossiers.journal, '2026'))).toBe(false);
    expect(readdirSync(base, { recursive: true }).sort()).toEqual(avant);
  });

  it('n’appelle jamais mkdir avec la racine elle-même', async () => {
    const { stockage, faux } = creerStockage();
    valeurDe(await stockage.ajouter('journal', '2026/10/s.txt', new Uint8Array([1])));

    rmSync(dossiers.journal, { recursive: true });
    await stockage.ajouter('journal', '2026/10/s.txt', new Uint8Array([1]));

    expect(faux.cheminsAppeles('mkdir')).not.toContain(dossiers.journal);
    expect(faux.cheminsAppeles('mkdir')).not.toContain(dossiers.journal + '\\');
  });

  it('signale lecteur-indisponible quand la racine et le lecteur ne répondent plus', async () => {
    rmSync(dossiers.journal, { recursive: true });
    const { stockage } = creerStockage([
      { operation: 'stat', chemin: racineLecteur(), code: 'UNKNOWN' },
    ]);
    const erreur = erreurDe(await stockage.ajouter('journal', 'x.txt', new Uint8Array([1])));
    expect(erreur).toMatchObject({ code: 'lecteur-indisponible', chemin: dossiers.journal });
  });
});

// --- lire ---

describe('creerStockageDisque — lire', () => {
  it('rend les octets bruts identiques à ce qui a été écrit', async () => {
    const octets = new Uint8Array(256).map((_v, i) => i);
    writeFileSync(join(dossiers.in, 'brut.bin'), octets);
    const { stockage } = creerStockage();
    const lu = valeurDe(await stockage.lire('in', 'brut.bin'));
    expect(memesOctets(lu, octets)).toBe(true);
  });

  it('rend les octets d’un fichier écrit par ajouter (aller-retour)', async () => {
    const octets = new Uint8Array([0xef, 0xbb, 0xbf, 0x80, 0xff, 0x0d, 0x0a]);
    const { stockage } = creerStockage();
    valeurDe(await stockage.ajouter('out', 'sous/rejet.txt', octets));
    const lu = valeurDe(await stockage.lire('out', 'sous/rejet.txt'));
    expect(memesOctets(lu, octets)).toBe(true);
  });

  it('signale introuvable pour un fichier absent', async () => {
    const { stockage, delais } = creerStockage();
    const erreur = erreurDe(await stockage.lire('in', 'absent.txt'));
    expect(erreur).toMatchObject({
      code: 'introuvable',
      emplacement: 'in',
      chemin: join(dossiers.in, 'absent.txt'),
    });
    expect(delais).toEqual([]);
  });

  it('signale introuvable pour un dossier lu comme un fichier', async () => {
    mkdirSync(join(dossiers.in, 'sous'));
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.lire('in', 'sous'));
    expect(erreur.code).toBe('introuvable');
    expect(erreur.chemin).toBe(join(dossiers.in, 'sous'));
  });

  it('signale dossier-absent quand la racine de l’emplacement a disparu', async () => {
    rmSync(dossiers.in, { recursive: true });
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.lire('in', 'a.txt'));
    expect(erreur).toMatchObject({ code: 'dossier-absent', chemin: dossiers.in });
  });
});

// --- lister ---

describe('creerStockageDisque — lister', () => {
  it('liste les fichiers et dossiers de la racine avec leur type', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'x');
    mkdirSync(join(dossiers.in, 'sous'));
    const { stockage } = creerStockage();

    const elements = valeurDe(await stockage.lister('in')).sort(parNom);

    expect(elements).toEqual([
      { nom: 'a.txt', type: 'fichier', copieConflitProbable: false },
      { nom: 'sous', type: 'dossier', copieConflitProbable: false },
    ]);
  });

  it('traite le sous-dossier vide comme la racine', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'x');
    const { stockage } = creerStockage();
    const sansArgument = valeurDe(await stockage.lister('in'));
    const vide = valeurDe(await stockage.lister('in', ''));
    expect(vide).toEqual(sansArgument);
    expect(vide.map((e) => e.nom)).toEqual(['a.txt']);
  });

  it('liste un sous-dossier', async () => {
    mkdirSync(join(dossiers.journal, '2026'));
    writeFileSync(join(dossiers.journal, '2026', 'session.txt'), 'x');
    writeFileSync(join(dossiers.journal, 'racine.txt'), 'x');
    const { stockage } = creerStockage();

    const elements = valeurDe(await stockage.lister('journal', '2026'));

    expect(elements).toEqual([
      { nom: 'session.txt', type: 'fichier', copieConflitProbable: false },
    ]);
  });

  it('renvoie une liste vide pour un dossier vide', async () => {
    const { stockage } = creerStockage();
    expect(valeurDe(await stockage.lister('out'))).toEqual([]);
  });

  it('signale introuvable pour un sous-dossier absent', async () => {
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.lister('journal', '2026'));
    expect(erreur).toMatchObject({
      code: 'introuvable',
      emplacement: 'journal',
      chemin: join(dossiers.journal, '2026'),
    });
  });

  it('signale introuvable pour un fichier listé comme un dossier (ENOTDIR sous Windows)', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'x');
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.lister('in', 'a.txt'));
    expect(erreur).toMatchObject({ code: 'introuvable', chemin: join(dossiers.in, 'a.txt') });
  });

  it('signale dossier-absent quand la racine a disparu', async () => {
    rmSync(dossiers.out, { recursive: true });
    const { stockage } = creerStockage();
    const erreur = erreurDe(await stockage.lister('out'));
    expect(erreur).toMatchObject({ code: 'dossier-absent', chemin: dossiers.out });
  });

  it('marque les copies de conflit probables, jamais un dossier', async () => {
    writeFileSync(join(dossiers.out, 'rapport.txt'), 'x');
    writeFileSync(join(dossiers.out, 'rapport-PC042.txt'), 'x');
    writeFileSync(join(dossiers.out, 'rapport-PC042-2.txt'), 'x');
    writeFileSync(join(dossiers.out, 'seul-PC042.txt'), 'x');
    mkdirSync(join(dossiers.out, 'rapport-PC043'));
    mkdirSync(join(dossiers.out, 'rapport-PC044.txt'));
    const { stockage } = creerStockage();

    const elements = valeurDe(await stockage.lister('out'));
    const conflits = Object.fromEntries(elements.map((e) => [e.nom, e.copieConflitProbable]));

    expect(conflits).toEqual({
      'rapport.txt': false,
      'rapport-PC042.txt': true,
      'rapport-PC042-2.txt': true,
      'seul-PC042.txt': false,
      'rapport-PC043': false,
      'rapport-PC044.txt': false,
    });
  });

  describe('entrée ni fichier ni dossier', () => {
    const entreeInconnue = (name: string): EntreeDossier => ({
      name,
      isFile: () => false,
      isDirectory: () => false,
    });

    it('classe l’entrée par stat', async () => {
      writeFileSync(join(dossiers.in, 'nuage.txt'), 'x');
      mkdirSync(join(dossiers.in, 'dossier-nuage'));
      const { stockage, faux } = creerStockage([], {
        readdir: async () => [entreeInconnue('nuage.txt'), entreeInconnue('dossier-nuage')],
      });

      const elements = valeurDe(await stockage.lister('in')).sort(parNom);

      expect(elements).toEqual([
        { nom: 'dossier-nuage', type: 'dossier', copieConflitProbable: false },
        { nom: 'nuage.txt', type: 'fichier', copieConflitProbable: false },
      ]);
      expect(faux.cheminsAppeles('stat')).toContain(join(dossiers.in, 'nuage.txt'));
    });

    it('ignore l’entrée dont le stat échoue avec ENOENT (lien cassé)', async () => {
      writeFileSync(join(dossiers.in, 'ok.txt'), 'x');
      const { stockage } = creerStockage([], {
        readdir: async () => [
          entreeInconnue('lien-casse.txt'),
          { name: 'ok.txt', isFile: () => true, isDirectory: () => false },
        ],
      });

      const elements = valeurDe(await stockage.lister('in'));

      expect(elements.map((e) => e.nom)).toEqual(['ok.txt']);
    });

    it('rejoue l’opération quand le stat de l’entrée est verrouillé (EBUSY)', async () => {
      writeFileSync(join(dossiers.in, 'nuage.txt'), 'x');
      const { stockage, delais } = creerStockage(
        [{ operation: 'stat', chemin: join(dossiers.in, 'nuage.txt'), code: 'EBUSY', fois: 1 }],
        { readdir: async () => [entreeInconnue('nuage.txt')] },
      );

      const elements = valeurDe(await stockage.lister('in'));

      expect(elements.map((e) => e.nom)).toEqual(['nuage.txt']);
      expect(delais).toEqual([500]);
    });
  });
});

// --- Nouvelles tentatives ---

describe('creerStockageDisque — nouvelles tentatives', () => {
  beforeEach(() => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'contenu');
  });

  const cheminA = () => join(dossiers.in, 'a.txt');

  it('réussit après deux EBUSY, avec les délais 500 puis 1000', async () => {
    const { stockage, faux, attendre, delais } = creerStockage([
      { operation: 'readFile', code: 'EBUSY', fois: 2 },
    ]);
    const lu = valeurDe(await stockage.lire('in', 'a.txt'));
    expect(Buffer.from(lu).toString('utf8')).toBe('contenu');
    expect(faux.cheminsAppeles('readFile')).toHaveLength(3);
    expect(delais).toEqual([500, 1000]);
    expect(attendre).toHaveBeenCalledTimes(2);
  });

  it('échoue en verrou après quatre EBUSY, avec les délais 500, 1000 puis 2000', async () => {
    const { stockage, faux, delais } = creerStockage([{ operation: 'readFile', code: 'EBUSY' }]);
    const erreur = erreurDe(await stockage.lire('in', 'a.txt'));
    expect(erreur).toMatchObject({ code: 'verrou', emplacement: 'in', chemin: cheminA() });
    expect(faux.cheminsAppeles('readFile')).toHaveLength(4);
    expect(delais).toEqual([500, 1000, 2000]);
  });

  it('échoue en acces-refuse après quatre EPERM', async () => {
    const { stockage, faux, delais } = creerStockage([{ operation: 'readFile', code: 'EPERM' }]);
    const erreur = erreurDe(await stockage.lire('in', 'a.txt'));
    expect(erreur.code).toBe('acces-refuse');
    expect(erreur.message).toContain('OneDrive');
    expect(faux.cheminsAppeles('readFile')).toHaveLength(4);
    expect(delais).toEqual([500, 1000, 2000]);
  });

  it.each([
    ['ENOENT', 'introuvable'],
    ['EACCES', 'acces-refuse'],
    ['EMFILE', 'erreur-systeme'],
    ['EISDIR', 'introuvable'],
  ])('ne rejoue pas sur %s', async (code, attendu) => {
    const { stockage, faux, attendre } = creerStockage([{ operation: 'readFile', code }]);
    const erreur = erreurDe(await stockage.lire('in', 'a.txt'));
    expect(erreur.code).toBe(attendu);
    expect(faux.cheminsAppeles('readFile')).toHaveLength(1);
    expect(attendre).not.toHaveBeenCalled();
  });

  it('rejoue ajouter en entier et n’écrit le contenu qu’une fois', async () => {
    const { stockage, faux, delais } = creerStockage([
      { operation: 'appendFile', code: 'EBUSY', fois: 2 },
    ]);
    valeurDe(await stockage.ajouter('journal', '2026/10/s.txt', new TextEncoder().encode('AB')));

    expect(faux.cheminsAppeles('appendFile')).toHaveLength(3);
    // mkdir rejoué à chaque essai : EEXIST après le premier passage, sans effet
    expect(faux.cheminsAppeles('mkdir')).toHaveLength(6);
    expect(delais).toEqual([500, 1000]);
    expect(readFileSync(join(dossiers.journal, '2026', '10', 's.txt'), 'utf8')).toBe('AB');
  });

  it('rejoue ajouter quand mkdir est verrouillé', async () => {
    const { stockage, delais } = creerStockage([{ operation: 'mkdir', code: 'EPERM', fois: 1 }]);
    valeurDe(await stockage.ajouter('journal', '2026/x.txt', new TextEncoder().encode('AB')));
    expect(delais).toEqual([500]);
    expect(readFileSync(join(dossiers.journal, '2026', 'x.txt'), 'utf8')).toBe('AB');
  });

  it('échoue en verrou pour ajouter après quatre EBUSY, sans écrire', async () => {
    const { stockage, delais } = creerStockage([{ operation: 'appendFile', code: 'EBUSY' }]);
    const erreur = erreurDe(await stockage.ajouter('out', 'r.txt', new TextEncoder().encode('AB')));
    expect(erreur.code).toBe('verrou');
    expect(delais).toEqual([500, 1000, 2000]);
    expect(existsSync(join(dossiers.out, 'r.txt'))).toBe(false);
  });

  it('rejoue lister sur EBUSY', async () => {
    const { stockage, delais } = creerStockage([{ operation: 'readdir', code: 'EBUSY', fois: 1 }]);
    const elements = valeurDe(await stockage.lister('in'));
    expect(elements.map((e) => e.nom)).toEqual(['a.txt']);
    expect(delais).toEqual([500]);
  });
});

// --- chemin-refuse ---

describe('creerStockageDisque — chemin-refuse', () => {
  const cas: [string, Emplacement, string, (s: Stockage) => Promise<ResultatStockage<unknown>>][] =
    [
      ['lire', 'journal', '../x', (s) => s.lire('journal', '../x')],
      ['ajouter', 'in', 'C:\\x', (s) => s.ajouter('in', 'C:\\x', new Uint8Array([1]))],
      ['lister', 'out', 'a/..', (s) => s.lister('out', 'a/..')],
    ];

  it.each(cas)(
    'refuse %s sur %s avec %j sans aucun appel au système de fichiers',
    async (_methode, emplacement, _nom, appeler) => {
      const { stockage, faux, attendre } = creerStockage();

      const erreur = erreurDe(await appeler(stockage));

      expect(erreur).toMatchObject({
        code: 'chemin-refuse',
        emplacement,
        chemin: dossiers[emplacement],
      });
      expect(erreur.message.length).toBeGreaterThan(0);
      expect(faux.appels).toEqual([]);
      expect(attendre).not.toHaveBeenCalled();
    },
  );

  it('refuse un nom réservé par Windows sans toucher au disque', async () => {
    const { stockage, faux } = creerStockage();
    const erreur = erreurDe(await stockage.ajouter('out', 'sous/NUL.txt', new Uint8Array([1])));
    expect(erreur.code).toBe('chemin-refuse');
    expect(faux.appels).toEqual([]);
  });

  it('refuse un nom vide pour lire et ajouter, mais pas pour lister', async () => {
    const { stockage } = creerStockage();
    expect(erreurDe(await stockage.lire('in', '')).code).toBe('chemin-refuse');
    expect(erreurDe(await stockage.ajouter('in', '', new Uint8Array([1]))).code).toBe(
      'chemin-refuse',
    );
    expect(valeurDe(await stockage.lister('in', ''))).toEqual([]);
  });
});

// --- Confidentialité ---

describe('creerStockageDisque — confidentialité', () => {
  const SENTINELLE = 'SENTINELLE-CONTENU-CONFIDENTIEL-0042';

  it.each(['EBUSY', 'EPERM', 'EACCES', 'ENOENT', 'EISDIR', 'ENOTDIR', 'EMFILE', 'ETIMEDOUT'])(
    'n’inclut jamais le contenu lu dans l’erreur (%s)',
    async (code) => {
      writeFileSync(join(dossiers.in, 'secret.txt'), SENTINELLE);
      const { stockage } = creerStockage([{ operation: 'readFile', code }]);

      const erreur = erreurDe(await stockage.lire('in', 'secret.txt'));

      expect(JSON.stringify(erreur)).not.toContain(SENTINELLE);
      expect(Object.keys(erreur).sort()).toEqual(['chemin', 'code', 'emplacement', 'message']);
    },
  );

  it('n’inclut pas le contenu quand la lecture réelle échoue (dossier lu comme fichier)', async () => {
    mkdirSync(join(dossiers.in, 'sous'));
    writeFileSync(join(dossiers.in, 'sous', 'secret.txt'), SENTINELLE);
    const { stockage } = creerStockage();

    const erreur = erreurDe(await stockage.lire('in', 'sous'));

    expect(JSON.stringify(erreur)).not.toContain(SENTINELLE);
  });

  it('n’inclut pas le contenu quand ajouter échoue sur un fichier déjà lu', async () => {
    writeFileSync(join(dossiers.out, 'secret.txt'), SENTINELLE);
    const { stockage } = creerStockage([{ operation: 'appendFile', code: 'EBUSY' }]);

    valeurDe(await stockage.lire('out', 'secret.txt'));
    const erreur = erreurDe(await stockage.ajouter('out', 'secret.txt', new Uint8Array([1])));

    expect(JSON.stringify(erreur)).not.toContain(SENTINELLE);
  });
});
