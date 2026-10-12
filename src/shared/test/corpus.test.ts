import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decrireEcart, localiserEcart, resoudreCorpus } from './corpus';

const octets = (...valeurs: number[]) => new Uint8Array(valeurs);
const LF = 0x0a;
const CR = 0x0d;

describe('resoudreCorpus', () => {
  let racine: string;

  beforeEach(() => {
    racine = mkdtempSync(join(tmpdir(), 'flussi-corpus-'));
  });

  afterEach(() => {
    rmSync(racine, { recursive: true, force: true });
  });

  it('est indisponible si la variable est absente', () => {
    const resolution = resoudreCorpus({});
    expect(resolution.dossier).toBeNull();
    expect('raison' in resolution && resolution.raison).toContain('AC056_CORPUS_DIR');
  });

  it('est indisponible si la variable est vide ou ne contient que des espaces', () => {
    expect(resoudreCorpus({ AC056_CORPUS_DIR: '' }).dossier).toBeNull();
    expect(resoudreCorpus({ AC056_CORPUS_DIR: '   ' }).dossier).toBeNull();
  });

  it('est indisponible si le dossier n existe pas, et la raison cite le chemin', () => {
    const inexistant = join(racine, 'inexistant');
    const resolution = resoudreCorpus({ AC056_CORPUS_DIR: inexistant });
    expect(resolution.dossier).toBeNull();
    expect('raison' in resolution && resolution.raison).toContain(inexistant);
  });

  it('est indisponible si le sous-dossier OUT manque', () => {
    mkdirSync(join(racine, 'IN'));
    expect(resoudreCorpus({ AC056_CORPUS_DIR: racine }).dossier).toBeNull();
  });

  it('est indisponible si le sous-dossier IN manque', () => {
    mkdirSync(join(racine, 'OUT'));
    expect(resoudreCorpus({ AC056_CORPUS_DIR: racine }).dossier).toBeNull();
  });

  it('est disponible si IN et OUT existent', () => {
    mkdirSync(join(racine, 'IN'));
    mkdirSync(join(racine, 'OUT'));
    expect(resoudreCorpus({ AC056_CORPUS_DIR: racine })).toEqual({ dossier: racine });
  });

  it('ignore les espaces autour du chemin', () => {
    mkdirSync(join(racine, 'IN'));
    mkdirSync(join(racine, 'OUT'));
    expect(resoudreCorpus({ AC056_CORPUS_DIR: `  ${racine} ` }).dossier).toBe(racine);
  });

  it('lève une erreur explicite si le corpus est obligatoire et indisponible', () => {
    expect(() => resoudreCorpus({ AC056_CORPUS_OBLIGATOIRE: '1' })).toThrow(
      /Corpus AC056 obligatoire \(npm run test:corpus\) mais indisponible : .*AC056_CORPUS_DIR/,
    );
  });

  it('ne lève rien si le corpus est obligatoire et disponible', () => {
    mkdirSync(join(racine, 'IN'));
    mkdirSync(join(racine, 'OUT'));
    const resolution = resoudreCorpus({
      AC056_CORPUS_DIR: racine,
      AC056_CORPUS_OBLIGATOIRE: '1',
    });
    expect(resolution.dossier).toBe(racine);
  });
});

describe('localiserEcart', () => {
  it('renvoie null pour des contenus identiques', () => {
    expect(localiserEcart(octets(65, CR, LF, 66), octets(65, CR, LF, 66))).toBeNull();
  });

  it('renvoie null pour deux tableaux vides', () => {
    expect(localiserEcart(octets(), octets())).toBeNull();
  });

  it('localise un écart au premier octet', () => {
    expect(localiserEcart(octets(65, 66), octets(67, 66))).toEqual({ ligne: 1, octet: 1 });
  });

  it('localise un écart en ligne 2 après un CRLF', () => {
    const attendu = octets(65, 66, CR, LF, 67, 68, 69);
    const obtenu = octets(65, 66, CR, LF, 67, 70, 69);
    expect(localiserEcart(attendu, obtenu)).toEqual({ ligne: 2, octet: 2 });
  });

  it('localise un écart en ligne 2 après un LF seul', () => {
    const attendu = octets(65, 66, LF, 67, 68, 69);
    const obtenu = octets(65, 66, LF, 67, 70, 69);
    expect(localiserEcart(attendu, obtenu)).toEqual({ ligne: 2, octet: 2 });
  });

  it('localise un écart sur le CR ou le LF eux-mêmes', () => {
    expect(localiserEcart(octets(65, CR, LF), octets(65, LF))).toEqual({ ligne: 1, octet: 2 });
  });

  it('signale la position qui suit le plus court quand attendu est plus long', () => {
    expect(localiserEcart(octets(65, 66, 67), octets(65, 66))).toEqual({ ligne: 1, octet: 3 });
  });

  it('signale la position qui suit le plus court quand obtenu est plus long', () => {
    expect(localiserEcart(octets(65, 66), octets(65, 66, 67))).toEqual({ ligne: 1, octet: 3 });
  });

  it('signale une ligne suivante quand le plus court se termine par un LF', () => {
    expect(localiserEcart(octets(65, CR, LF), octets(65, CR, LF, 66))).toEqual({
      ligne: 2,
      octet: 1,
    });
  });

  it('signale un écart au premier octet si l un des tableaux est vide', () => {
    expect(localiserEcart(octets(), octets(65))).toEqual({ ligne: 1, octet: 1 });
    expect(localiserEcart(octets(65), octets())).toEqual({ ligne: 1, octet: 1 });
  });
});

describe('decrireEcart', () => {
  it('produit le format exact', () => {
    expect(decrireEcart('MATH_20260101_080000.txt', { ligne: 12, octet: 34 })).toBe(
      'MATH_20260101_080000.txt : ligne 12, octet 34',
    );
  });

  it('ne contient pas les octets comparés', () => {
    const attendu = octets(0x53, 0x45, 0x43, 0x52, 0x45, 0x54);
    const obtenu = octets(0x53, 0x45, 0x58, 0x52, 0x45, 0x54);
    const ecart = localiserEcart(attendu, obtenu);
    expect(ecart).not.toBeNull();
    const message = decrireEcart('test.txt', ecart!);
    expect(message).toBe('test.txt : ligne 1, octet 3');
    expect(message).not.toContain('SECRET');
    expect(message).not.toContain('SEXRET');
  });
});
