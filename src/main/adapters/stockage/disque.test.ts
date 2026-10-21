import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
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

type Operation = keyof SystemeFichiers | 'sync';

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
  open: (chemin, drapeaux) => fsPromises.open(chemin, drapeaux),
  rename: (ancien, nouveau) => fsPromises.rename(ancien, nouveau),
  unlink: (chemin) => fsPromises.unlink(chemin),
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
    open: async (chemin, drapeaux) => {
      intercepter('open', chemin);
      const fichier = await (surcharges.open ?? systemeReel.open)(chemin, drapeaux);
      // Trace l'ordre des opérations sur le descripteur (sync avant rename)
      return {
        writeFile: (octets) => fichier.writeFile(octets),
        sync: async () => {
          intercepter('sync', chemin);
          await fichier.sync();
        },
        close: () => fichier.close(),
      };
    },
    rename: async (ancien, nouveau) => {
      intercepter('rename', ancien);
      return (surcharges.rename ?? systemeReel.rename)(ancien, nouveau);
    },
    unlink: async (chemin) => {
      intercepter('unlink', chemin);
      return (surcharges.unlink ?? systemeReel.unlink)(chemin);
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

/** Élément attendu pour un fichier de `taille` octets (date lue sur le disque : toute chaîne ISO). */
const fichierAttendu = (nom: string, taille: number): ElementStockage => ({
  nom,
  type: 'fichier',
  copieConflitProbable: false,
  taille,
  modification: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) as string,
});

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

// --- ecrire ---

describe('creerStockageDisque — ecrire', () => {
  const octets = new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x0d, 0x0a, 0x80, 0xff, 0x00]);
  const cible = () => join(dossiers.out, 'FICHIER.txt');
  /** Fichiers du dossier OUT : détecte tout temporaire oublié. */
  const contenuOut = () => readdirSync(dossiers.out).sort();

  it('écrit un nouveau fichier, octets exacts, sans temporaire restant', async () => {
    const { stockage } = creerStockage();
    expect(valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'))).toBe(
      'ecrit',
    );
    expect(memesOctets(readFileSync(cible()), octets)).toBe(true);
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it('passe par un temporaire du même dossier, synchronisé avant le renommage', async () => {
    const { stockage, faux } = creerStockage();
    valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));

    const [temporaire] = faux.cheminsAppeles('open');
    expect(win32.dirname(temporaire as string)).toBe(dossiers.out);
    expect(win32.basename(temporaire as string)).toMatch(/^FICHIER\.txt\.[0-9a-f-]{36}\.tmp$/);
    expect(faux.cheminsAppeles('rename')).toEqual([temporaire]);
    const operations = faux.appels.map((a) => a.operation);
    expect(operations.indexOf('sync')).toBeGreaterThan(operations.indexOf('open'));
    expect(operations.indexOf('rename')).toBeGreaterThan(operations.indexOf('sync'));
    expect(faux.cheminsAppeles('unlink')).toEqual([]);
  });

  it('remplace un fichier existant', async () => {
    writeFileSync(cible(), 'ancien contenu plus long que le nouveau');
    const { stockage } = creerStockage();
    expect(valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'))).toBe(
      'ecrit',
    );
    expect(memesOctets(readFileSync(cible()), octets)).toBe(true);
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it('mode creer : écrit quand la cible est absente', async () => {
    const { stockage } = creerStockage();
    expect(valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'creer'))).toBe('ecrit');
    expect(memesOctets(readFileSync(cible()), octets)).toBe(true);
  });

  it('mode creer : cible existante → deja-present, rien n’est écrit', async () => {
    writeFileSync(cible(), 'original');
    const { stockage, faux } = creerStockage();
    expect(valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'creer'))).toBe(
      'deja-present',
    );
    expect(readFileSync(cible(), 'utf8')).toBe('original');
    expect(faux.cheminsAppeles('open')).toEqual([]);
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it('crée les sous-dossiers intermédiaires, jamais la racine', async () => {
    const { stockage, faux } = creerStockage();
    valeurDe(await stockage.ecrire('out', 'a/b/FICHIER.txt', octets, 'remplacer'));
    expect(faux.cheminsAppeles('mkdir')).toEqual([
      win32.join(dossiers.out, 'a'),
      win32.join(dossiers.out, 'a', 'b'),
    ]);
    expect(existsSync(join(dossiers.out, 'a', 'b', 'FICHIER.txt'))).toBe(true);
  });

  it('racine absente : dossier-absent, la racine n’est pas recréée', async () => {
    rmSync(dossiers.out, { recursive: true });
    const { stockage, faux } = creerStockage();
    const erreur = erreurDe(await stockage.ecrire('out', 'a/FICHIER.txt', octets, 'remplacer'));
    expect(erreur).toMatchObject({ code: 'dossier-absent', emplacement: 'out' });
    expect(existsSync(dossiers.out)).toBe(false);
    expect(faux.cheminsAppeles('mkdir')).not.toContain(dossiers.out);
  });

  it('rejoue le seul renommage sur EBUSY, puis réussit', async () => {
    const { stockage, faux, delais } = creerStockage([
      { operation: 'rename', code: 'EBUSY', fois: 2 },
    ]);
    expect(valeurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'))).toBe(
      'ecrit',
    );
    expect(faux.cheminsAppeles('rename')).toHaveLength(3);
    // Une seule écriture : seul le renommage est rejoué
    expect(faux.cheminsAppeles('open')).toHaveLength(1);
    expect(faux.cheminsAppeles('readFile')).toHaveLength(1);
    expect(delais).toEqual([500, 1000]);
    expect(memesOctets(readFileSync(cible()), octets)).toBe(true);
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it('échec final du renommage : temporaire supprimé, cible intacte, erreur typée', async () => {
    writeFileSync(cible(), 'original');
    const { stockage, faux, delais } = creerStockage([{ operation: 'rename', code: 'EPERM' }]);
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur).toMatchObject({ code: 'acces-refuse', emplacement: 'out' });
    expect(faux.cheminsAppeles('rename')).toHaveLength(4);
    expect(delais).toEqual([500, 1000, 2000]);
    expect(faux.cheminsAppeles('unlink')).toEqual(faux.cheminsAppeles('open'));
    expect(readFileSync(cible(), 'utf8')).toBe('original');
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it.each([
    ['open', 'EACCES', 'acces-refuse', false],
    ['sync', 'EIO', 'erreur-systeme', true],
    ['readFile', 'ETIMEDOUT', 'lecteur-indisponible', true],
  ] as const)(
    'échec de %s (%s) : erreur typée, plus de temporaire',
    async (operation, code, attendu, temporaireCree) => {
      const { stockage, faux } = creerStockage([{ operation, code }]);
      const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
      expect(erreur.code).toBe(attendu);
      expect(faux.cheminsAppeles('rename')).toEqual([]);
      expect(faux.cheminsAppeles('unlink')).toHaveLength(temporaireCree ? 1 : 0);
      expect(contenuOut()).toEqual([]);
    },
  );

  it('relecture différente : erreur système, temporaire supprimé, rien de renommé', async () => {
    const { stockage, faux } = creerStockage([], {
      readFile: async () => new Uint8Array([1, 2, 3]),
    });
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('erreur-systeme');
    expect(faux.cheminsAppeles('rename')).toEqual([]);
    expect(faux.cheminsAppeles('unlink')).toHaveLength(1);
    expect(contenuOut()).toEqual([]);
  });

  it('une erreur de suppression du temporaire ne masque pas l’erreur d’origine', async () => {
    const { stockage } = creerStockage([
      { operation: 'rename', code: 'EACCES' },
      { operation: 'unlink', code: 'EACCES' },
    ]);
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('acces-refuse');
  });

  it('mode creer : une cible qui est un dossier est une erreur, pas deja-present', async () => {
    mkdirSync(cible());
    const { stockage, faux } = creerStockage();
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'creer'));
    expect(erreur).toMatchObject({ code: 'introuvable', chemin: cible() });
    expect(faux.cheminsAppeles('open')).toEqual([]);
    expect(contenuOut()).toEqual(['FICHIER.txt']);
  });

  it('mode creer : un stat de la cible en échec autre que ENOENT est une erreur typée', async () => {
    const { stockage, faux } = creerStockage([
      { operation: 'stat', chemin: cible(), code: 'EACCES' },
    ]);
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'creer'));
    expect(erreur).toMatchObject({ code: 'acces-refuse', emplacement: 'out' });
    expect(faux.cheminsAppeles('open')).toEqual([]);
    expect(contenuOut()).toEqual([]);
  });

  /** Descripteur dont certaines opérations échouent (les autres sont réelles). */
  function ouvrirAvecPannes(pannes: { writeFile?: string; close?: string }) {
    return async (chemin: string, drapeaux: 'wx') => {
      const reel = await systemeReel.open(chemin, drapeaux);
      return {
        writeFile: async (contenu: Uint8Array) => {
          if (pannes.writeFile) {
            throw Object.assign(new Error('panne simulée'), { code: pannes.writeFile });
          }
          await reel.writeFile(contenu);
        },
        sync: () => reel.sync(),
        close: async () => {
          await reel.close();
          if (pannes.close) throw Object.assign(new Error('panne simulée'), { code: pannes.close });
        },
      };
    };
  }

  it('échec de l’écriture : erreur typée, temporaire supprimé, jamais renommé', async () => {
    const { stockage, faux } = creerStockage([], { open: ouvrirAvecPannes({ writeFile: 'EIO' }) });
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('erreur-systeme');
    expect(faux.cheminsAppeles('rename')).toEqual([]);
    expect(faux.cheminsAppeles('unlink')).toHaveLength(1);
    expect(contenuOut()).toEqual([]);
  });

  it('échec de l’écriture puis de la fermeture : l’erreur d’origine prime', async () => {
    const { stockage } = creerStockage([], {
      open: ouvrirAvecPannes({ writeFile: 'EACCES', close: 'EIO' }),
    });
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('acces-refuse');
    expect(contenuOut()).toEqual([]);
  });

  it('échec de la fermeture : erreur typée, temporaire supprimé, jamais renommé', async () => {
    const { stockage, faux } = creerStockage([], { open: ouvrirAvecPannes({ close: 'EIO' }) });
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('erreur-systeme');
    expect(faux.cheminsAppeles('rename')).toEqual([]);
    expect(faux.cheminsAppeles('unlink')).toHaveLength(1);
    expect(contenuOut()).toEqual([]);
  });

  it('rejoue la suppression du temporaire sur EBUSY, comme le renommage', async () => {
    const { stockage, faux, delais } = creerStockage([
      { operation: 'rename', code: 'EACCES' },
      { operation: 'unlink', code: 'EBUSY', fois: 2 },
    ]);
    const erreur = erreurDe(await stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'));
    expect(erreur.code).toBe('acces-refuse');
    expect(faux.cheminsAppeles('unlink')).toHaveLength(3);
    expect(delais).toEqual([500, 1000]);
    expect(contenuOut()).toEqual([]);
  });

  it('cite les nouvelles tentatives dans le message de verrou seulement si le renommage en a fait', async () => {
    const rejoue = creerStockage([{ operation: 'rename', code: 'EBUSY' }]);
    const apresTentatives = erreurDe(
      await rejoue.stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'),
    );
    expect(apresTentatives.code).toBe('verrou');
    expect(apresTentatives.message).toContain('3 nouvelles tentatives');

    // Le stat de la cible n'est pas rejoué : un verrou y est signalé sans mention de tentatives
    const sansRejeu = creerStockage([{ operation: 'open', code: 'EBUSY' }]);
    const sansTentatives = erreurDe(
      await sansRejeu.stockage.ecrire('out', 'FICHIER.txt', octets, 'remplacer'),
    );
    expect(sansTentatives.code).toBe('verrou');
    expect(sansTentatives.message).not.toContain('tentatives');
    expect(sansRejeu.delais).toEqual([]);
  });

  it('refuse un nom invalide sans aucun appel au système de fichiers', async () => {
    const { stockage, faux } = creerStockage();
    for (const nom of ['../x.txt', 'C:\\x.txt', 'sous/NUL.txt', '']) {
      expect(erreurDe(await stockage.ecrire('out', nom, octets, 'remplacer')).code).toBe(
        'chemin-refuse',
      );
    }
    expect(faux.appels).toEqual([]);
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

    const elements = valeurDe(await stockage.lister('in', '', { avecInfos: true })).sort(parNom);

    expect(elements).toEqual([
      fichierAttendu('a.txt', 1),
      {
        nom: 'sous',
        type: 'dossier',
        copieConflitProbable: false,
        taille: null,
        modification: null,
      },
    ]);
  });

  it('renvoie la taille en octets et la date de modification ISO d’un fichier', async () => {
    const chemin = join(dossiers.in, 'a.txt');
    writeFileSync(chemin, new Uint8Array(1234));
    const date = new Date('2026-10-14T09:15:30.000Z');
    utimesSync(chemin, date, date);
    const { stockage } = creerStockage();

    expect(valeurDe(await stockage.lister('in', '', { avecInfos: true }))).toEqual([
      {
        nom: 'a.txt',
        type: 'fichier',
        copieConflitProbable: false,
        taille: 1234,
        modification: '2026-10-14T09:15:30.000Z',
      },
    ]);
  });

  it('renvoie taille et date null pour un dossier', async () => {
    mkdirSync(join(dossiers.in, 'sous'));
    const { stockage } = creerStockage();
    const [dossier] = valeurDe(await stockage.lister('in', '', { avecInfos: true }));
    expect(dossier).toMatchObject({ type: 'dossier', taille: null, modification: null });
  });

  it('fait un stat par fichier, aucun pour un dossier', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'x');
    writeFileSync(join(dossiers.in, 'b.txt'), 'x');
    mkdirSync(join(dossiers.in, 'sous'));
    const { stockage, faux } = creerStockage();

    valeurDe(await stockage.lister('in', '', { avecInfos: true }));

    expect(faux.cheminsAppeles('stat').sort()).toEqual([
      join(dossiers.in, 'a.txt'),
      join(dossiers.in, 'b.txt'),
    ]);
  });

  it('ne fait aucun stat sans l’option avecInfos : taille et date null', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'xyz');
    writeFileSync(join(dossiers.in, 'b.txt'), 'x');
    mkdirSync(join(dossiers.in, 'sous'));
    const { stockage, faux } = creerStockage();

    const elements = valeurDe(await stockage.lister('in')).sort(parNom);

    expect(faux.cheminsAppeles('stat')).toEqual([]);
    expect(elements.map((e) => [e.nom, e.type, e.taille, e.modification])).toEqual([
      ['a.txt', 'fichier', null, null],
      ['b.txt', 'fichier', null, null],
      ['sous', 'dossier', null, null],
    ]);
    const explicite = valeurDe(await stockage.lister('in', '', { avecInfos: false }));
    expect(explicite.every((e) => e.taille === null && e.modification === null)).toBe(true);
    expect(faux.cheminsAppeles('stat')).toEqual([]);
  });

  it('classe une entrée de type inconnu par stat sans l’option, taille et date null', async () => {
    writeFileSync(join(dossiers.in, 'nuage.txt'), 'x');
    const { stockage } = creerStockage([], {
      readdir: async () => [{ name: 'nuage.txt', isFile: () => false, isDirectory: () => false }],
    });

    const elements = valeurDe(await stockage.lister('in'));

    expect(elements).toEqual([
      {
        nom: 'nuage.txt',
        type: 'fichier',
        copieConflitProbable: false,
        taille: null,
        modification: null,
      },
    ]);
  });

  it('garde un fichier dont le stat échoue, avec taille et date null, sans faire échouer la liste', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'x');
    writeFileSync(join(dossiers.in, 'b.txt'), 'xy');
    const { stockage, delais } = creerStockage([
      { operation: 'stat', chemin: join(dossiers.in, 'a.txt'), code: 'EACCES' },
    ]);

    const elements = valeurDe(await stockage.lister('in', '', { avecInfos: true })).sort(parNom);

    expect(elements).toEqual([
      {
        nom: 'a.txt',
        type: 'fichier',
        copieConflitProbable: false,
        taille: null,
        modification: null,
      },
      fichierAttendu('b.txt', 2),
    ]);
    expect(delais).toEqual([]);
  });

  it('garde un fichier dont la date est invalide, avec la taille et une date null', async () => {
    writeFileSync(join(dossiers.in, 'a.txt'), 'xyz');
    const { stockage } = creerStockage([], {
      stat: async () => ({ isFile: () => true, isDirectory: () => false, size: 3, mtimeMs: NaN }),
    });

    const [element] = valeurDe(await stockage.lister('in', '', { avecInfos: true }));

    expect(element).toMatchObject({ nom: 'a.txt', taille: 3, modification: null });
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

    const elements = valeurDe(await stockage.lister('journal', '2026', { avecInfos: true }));

    expect(elements).toEqual([fichierAttendu('session.txt', 1)]);
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

      const elements = valeurDe(await stockage.lister('in', '', { avecInfos: true })).sort(parNom);

      expect(elements).toEqual([
        {
          nom: 'dossier-nuage',
          type: 'dossier',
          copieConflitProbable: false,
          taille: null,
          modification: null,
        },
        fichierAttendu('nuage.txt', 1),
      ]);
      // Un seul stat par entrée : il sert au type, à la taille et à la date
      expect(
        faux.cheminsAppeles('stat').filter((c) => c === join(dossiers.in, 'nuage.txt')),
      ).toHaveLength(1);
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

    it.each([
      ['EACCES', 'acces-refuse'],
      ['EIO', 'erreur-systeme'],
    ])(
      'fait échouer lister quand le stat de l’entrée échoue en %s (jamais de disparition silencieuse)',
      async (code, attendu) => {
        writeFileSync(join(dossiers.in, 'ok.txt'), 'x');
        const { stockage, delais } = creerStockage(
          [{ operation: 'stat', chemin: join(dossiers.in, 'illisible.txt'), code }],
          {
            readdir: async () => [
              { name: 'ok.txt', isFile: () => true, isDirectory: () => false },
              entreeInconnue('illisible.txt'),
            ],
          },
        );

        const erreur = erreurDe(await stockage.lister('in'));

        expect(erreur).toMatchObject({ code: attendu, emplacement: 'in' });
        expect(delais).toEqual([]);
      },
    );

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
      ['ecrire', 'out', '../x', (s) => s.ecrire('out', '../x', new Uint8Array([1]), 'creer')],
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
