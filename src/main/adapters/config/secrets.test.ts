import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAILLE_MAX_CLE_PRIVEE } from './cle-privee';
import type { ChiffrementMachine } from './dpapi';
import type { ResultatEcritureElevee } from './elevation';
import { creerCoffreSecrets, lireFichierCle, type SystemeFichiersSecrets } from './secrets';
import { encoderSecrets, type ContenuSecrets } from './secrets-format';

// SÉCURITÉ : le coffre reçoit TOUJOURS une écriture élevée factice (jamais l'élévation réelle). La
// factice simule le processus élevé : elle écrit le blob dans `secrets.bin` du dossier du test.
// Dossier temporaire du test pour `dossier`, faux chiffrement réversible, valeurs fictives
// uniquement. Les erreurs disque sont injectées par un faux système de fichiers qui délègue au vrai
// disque.
// À COMPLÉTER par test-agent (refonte de l'élévation : canal nommé, plus de fichier temporaire).
const TEMOIN = 'TEMOIN-SECRET-42';
const DATE = '2026-10-15T08:30:00.000Z';

let racine: string;
/** Simule `%ProgramData%\Flussi`. */
let dossier: string;

beforeEach(() => {
  racine = mkdtempSync(join(tmpdir(), 'flussi-secrets-'));
  dossier = join(racine, 'protege');
  mkdirSync(dossier);
});

afterEach(() => {
  rmSync(racine, { recursive: true, force: true, maxRetries: 5 });
});

// --- Fausses dépendances ---

const OCTET_XOR = 0x5a;

/** Chiffrement réversible (XOR) : le clair n'apparaît pas dans le blob. */
function chiffrementXor(): ChiffrementMachine {
  const xor = (octets: Uint8Array): Uint8Array => octets.map((o) => o ^ OCTET_XOR);
  return { indisponibilite: () => null, chiffrer: xor, dechiffrer: xor };
}

function chiffrementEnPanne(options: {
  chiffrer?: string;
  dechiffrer?: string;
  indisponibilite?: string | null;
}): ChiffrementMachine {
  const base = chiffrementXor();
  return {
    indisponibilite: () => options.indisponibilite ?? null,
    chiffrer: (clair) => {
      if (options.chiffrer !== undefined) throw new Error(options.chiffrer);
      return base.chiffrer(clair);
    },
    dechiffrer: (chiffre) => {
      if (options.dechiffrer !== undefined) throw new Error(options.dechiffrer);
      return base.dechiffrer(chiffre);
    },
  };
}

const systemeReel: SystemeFichiersSecrets = {
  readFile: (chemin) => fsPromises.readFile(chemin),
  stat: (chemin) => fsPromises.stat(chemin),
};

function erreurSysteme(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: erreur simulée`), { code });
}

function faux(surcharges: Partial<SystemeFichiersSecrets> = {}): SystemeFichiersSecrets {
  return { ...systemeReel, ...surcharges };
}

type EcrireEleve = (blob: Uint8Array) => Promise<ResultatEcritureElevee>;

/** Écriture élevée simulée : écrit le blob dans `secrets.bin`. */
const ecritureSimulee: EcrireEleve = async (blob) => {
  writeFileSync(join(dossier, 'secrets.bin'), blob);
  return { ok: true };
};

interface OptionsCoffre {
  fs?: SystemeFichiersSecrets;
  chiffrement?: ChiffrementMachine;
  ecrireEleve?: EcrireEleve;
}

/** `ecrireEleve` est un espion : par défaut l'écriture simulée fidèle. */
function creer(options: OptionsCoffre = {}) {
  const ecrireEleve = vi.fn<EcrireEleve>(options.ecrireEleve ?? ecritureSimulee);
  const c = creerCoffreSecrets({
    dossier,
    chiffrement: options.chiffrement ?? chiffrementXor(),
    ecrireEleve,
    ...(options.fs ? { fs: options.fs } : {}),
  });
  return { coffre: c, ecrireEleve };
}

const coffre = (options: OptionsCoffre = {}) => creer(options).coffre;

const secretsDe = (valeur = TEMOIN): ContenuSecrets => ({
  'iga-ftp-mot-de-passe': { valeur, date: DATE },
});

const blobDe = (secrets: ContenuSecrets): Buffer =>
  Buffer.from(chiffrementXor().chiffrer(encoderSecrets(secrets)));

const fichierSecrets = () => join(dossier, 'secrets.bin');
const contenuDuDossier = () => readdirSync(dossier).sort();

describe('creerCoffreSecrets — identité', () => {
  it('expose le dossier et le fichier secrets.bin', () => {
    const c = coffre();
    expect(c.dossier).toBe(dossier);
    expect(c.fichier).toBe(join(dossier, 'secrets.bin'));
  });

  it('indisponibilite délègue au chiffrement', () => {
    expect(coffre().indisponibilite()).toBeNull();
    const c = coffre({ chiffrement: chiffrementEnPanne({ indisponibilite: 'module absent' }) });
    expect(c.indisponibilite()).toBe('module absent');
  });

  it('n’appelle pas l’écriture élevée à la création', () => {
    const { ecrireEleve } = creer();
    expect(ecrireEleve).not.toHaveBeenCalled();
  });
});

describe('CoffreSecrets.lire', () => {
  it('renvoie absent quand le fichier n’existe pas', async () => {
    expect(await coffre().lire()).toEqual({ etat: 'absent' });
  });

  it('renvoie lisible avec le contenu après ecrire', async () => {
    const c = coffre();
    expect(await c.ecrire(secretsDe())).toEqual({ ok: true });
    expect(await c.lire()).toEqual({ etat: 'lisible', secrets: secretsDe() });
  });

  it('conserve les identifiants inconnus', async () => {
    const c = coffre();
    const contenu: ContenuSecrets = {
      ...secretsDe(),
      'secret-futur': { valeur: 'autre-valeur-fictive', date: DATE },
    };
    await c.ecrire(contenu);
    expect(await c.lire()).toEqual({ etat: 'lisible', secrets: contenu });
  });

  it('renvoie illisible avec le message natif quand le déchiffrement lève', async () => {
    await coffre().ecrire(secretsDe());
    const c = coffre({ chiffrement: chiffrementEnPanne({ dechiffrer: 'blob étranger' }) });
    expect(await c.lire()).toEqual({ etat: 'illisible', cause: 'blob étranger' });
  });

  it('renvoie illisible avec « contenu invalide » quand le clair n’est pas un contenu valide', async () => {
    const octets = new TextEncoder().encode('ceci n’est pas du JSON');
    writeFileSync(fichierSecrets(), chiffrementXor().chiffrer(octets));
    expect(await coffre().lire()).toEqual({ etat: 'illisible', cause: 'contenu invalide' });
  });

  it('renvoie illisible « contenu invalide » pour un JSON de mauvais format', async () => {
    const octets = new TextEncoder().encode(JSON.stringify({ format: 2, secrets: {} }));
    writeFileSync(fichierSecrets(), chiffrementXor().chiffrer(octets));
    expect(await coffre().lire()).toEqual({ etat: 'illisible', cause: 'contenu invalide' });
  });

  it('n’expose pas le clair dans la cause d’un contenu invalide', async () => {
    const octets = new TextEncoder().encode(`{ "format": 1, "secrets": ${TEMOIN}`);
    writeFileSync(fichierSecrets(), chiffrementXor().chiffrer(octets));
    const resultat = await coffre().lire();
    expect(JSON.stringify(resultat)).not.toContain(TEMOIN);
  });

  it.each(['EACCES', 'EPERM', 'EBUSY'])('renvoie erreur avec le code %s', async (code) => {
    const c = coffre({ fs: faux({ readFile: () => Promise.reject(erreurSysteme(code)) }) });
    expect(await c.lire()).toEqual({ etat: 'erreur', code });
  });

  it('renvoie erreur « erreur inconnue » pour une exception sans code', async () => {
    const c = coffre({ fs: faux({ readFile: () => Promise.reject(new Error('sans code')) }) });
    expect(await c.lire()).toEqual({ etat: 'erreur', code: 'erreur inconnue' });
  });

  it('ne lève jamais : un dossier à la place du fichier donne erreur', async () => {
    await fsPromises.mkdir(fichierSecrets());
    const resultat = await coffre().lire();
    expect(resultat.etat).toBe('erreur');
  });

  it('ne lève jamais : le déchiffrement ne reçoit pas d’exception non traitée', async () => {
    writeFileSync(fichierSecrets(), Buffer.from([1, 2, 3]));
    const c = coffre({ chiffrement: chiffrementEnPanne({ dechiffrer: 'illisible' }) });
    await expect(c.lire()).resolves.toMatchObject({ etat: 'illisible' });
  });
});

describe('CoffreSecrets.ecrire — succès', () => {
  it('confie le blob chiffré à l’écriture élevée, restitué par lire', async () => {
    const { coffre: c, ecrireEleve } = creer();
    expect(await c.ecrire(secretsDe())).toEqual({ ok: true });
    expect(ecrireEleve).toHaveBeenCalledTimes(1);
    expect(Buffer.from(ecrireEleve.mock.calls[0]?.[0] ?? []).equals(blobDe(secretsDe()))).toBe(
      true,
    );
    expect(readFileSync(fichierSecrets()).equals(blobDe(secretsDe()))).toBe(true);
    expect(await c.lire()).toEqual({ etat: 'lisible', secrets: secretsDe() });
  });

  it('transmet le blob chiffré, jamais le JSON en clair', async () => {
    const { coffre: c, ecrireEleve } = creer();
    await c.ecrire(secretsDe());
    const blob = Buffer.from(ecrireEleve.mock.calls[0]?.[0] ?? []);
    expect(blob.includes(Buffer.from(TEMOIN))).toBe(false);
    expect(blob.includes(Buffer.from('format'))).toBe(false);
  });

  it('remplace le contenu à chaque écriture', async () => {
    const c = coffre();
    expect(await c.ecrire(secretsDe('valeur-un'))).toEqual({ ok: true });
    expect(await c.ecrire(secretsDe('valeur-deux'))).toEqual({ ok: true });
    expect(await c.lire()).toEqual({ etat: 'lisible', secrets: secretsDe('valeur-deux') });
  });

  it('ne laisse aucun autre fichier dans le dossier protégé', async () => {
    const c = coffre();
    await c.ecrire(secretsDe());
    await c.ecrire(secretsDe('autre'));
    expect(contenuDuDossier()).toEqual(['secrets.bin']);
  });
});

describe('CoffreSecrets.ecrire — annulation de l’invite', () => {
  it('renvoie annule, secrets.bin inchangé', async () => {
    await coffre().ecrire(secretsDe('ancienne-valeur'));
    const avant = readFileSync(fichierSecrets());

    const { coffre: c, ecrireEleve } = creer({
      ecrireEleve: async () => ({ ok: false, annule: true }),
    });

    expect(await c.ecrire(secretsDe('nouvelle-valeur'))).toEqual({ ok: false, raison: 'annule' });
    expect(ecrireEleve).toHaveBeenCalledTimes(1);
    expect(readFileSync(fichierSecrets()).equals(avant)).toBe(true);
    expect(contenuDuDossier()).toEqual(['secrets.bin']);
  });

  it('renvoie annule sans secrets.bin préexistant : le fichier n’est pas créé', async () => {
    const c = coffre({ ecrireEleve: async () => ({ ok: false, annule: true }) });
    expect(await c.ecrire(secretsDe())).toEqual({ ok: false, raison: 'annule' });
    expect(contenuDuDossier()).toEqual([]);
  });
});

describe('CoffreSecrets.ecrire — échec de l’élévation', () => {
  it('renvoie elevation avec le détail, secrets.bin inchangé', async () => {
    await coffre().ecrire(secretsDe('ancienne-valeur'));
    const avant = readFileSync(fichierSecrets());

    const c = coffre({
      ecrireEleve: async () => ({ ok: false, annule: false, detail: 'contenu refusé (code 3)' }),
    });

    expect(await c.ecrire(secretsDe('nouvelle-valeur'))).toEqual({
      ok: false,
      raison: 'elevation',
      detail: 'contenu refusé (code 3)',
    });
    expect(readFileSync(fichierSecrets()).equals(avant)).toBe(true);
  });

  it('renvoie elevation quand l’écriture élevée lève', async () => {
    const c = coffre({
      ecrireEleve: () => Promise.reject(new Error('API indisponible')),
    });
    expect(await c.ecrire(secretsDe())).toEqual({
      ok: false,
      raison: 'elevation',
      detail: 'API indisponible',
    });
  });
});

describe('CoffreSecrets.ecrire — vérification', () => {
  it('renvoie verification « contenu différent » si d’autres octets ont été écrits', async () => {
    const c = coffre({
      ecrireEleve: async () => {
        writeFileSync(fichierSecrets(), Buffer.from('autre contenu'));
        return { ok: true };
      },
    });

    expect(await c.ecrire(secretsDe())).toEqual({
      ok: false,
      raison: 'verification',
      detail: 'contenu différent',
    });
  });

  it('renvoie verification « contenu différent » si l’ancien fichier est resté en place', async () => {
    await coffre().ecrire(secretsDe('ancienne-valeur'));
    const c = coffre({ ecrireEleve: async () => ({ ok: true }) });

    expect(await c.ecrire(secretsDe('nouvelle-valeur'))).toEqual({
      ok: false,
      raison: 'verification',
      detail: 'contenu différent',
    });
  });

  it('renvoie verification « ENOENT » si l’écriture ne fait rien (fichier absent)', async () => {
    const c = coffre({ ecrireEleve: async () => ({ ok: true }) });

    expect(await c.ecrire(secretsDe())).toEqual({
      ok: false,
      raison: 'verification',
      detail: 'ENOENT',
    });
    expect(contenuDuDossier()).toEqual([]);
  });

  it('renvoie verification avec le code si la relecture de secrets.bin échoue', async () => {
    const c = coffre({
      fs: faux({
        readFile: (chemin) =>
          chemin === fichierSecrets()
            ? Promise.reject(erreurSysteme('EBUSY'))
            : fsPromises.readFile(chemin),
      }),
    });

    expect(await c.ecrire(secretsDe())).toEqual({
      ok: false,
      raison: 'verification',
      detail: 'EBUSY',
    });
  });
});

describe('CoffreSecrets.ecrire — chiffrement', () => {
  it('renvoie chiffrement quand chiffrer lève : écriture élevée jamais appelée', async () => {
    const { coffre: c, ecrireEleve } = creer({
      chiffrement: chiffrementEnPanne({ chiffrer: 'DPAPI a échoué' }),
    });

    expect(await c.ecrire(secretsDe())).toEqual({
      ok: false,
      raison: 'chiffrement',
      detail: 'DPAPI a échoué',
    });
    expect(ecrireEleve).not.toHaveBeenCalled();
    expect(contenuDuDossier()).toEqual([]);
  });
});

describe('CoffreSecrets.ecrire — confidentialité', () => {
  it('n’expose la valeur du secret dans aucun résultat d’échec', async () => {
    const variantes: OptionsCoffre[] = [
      { chiffrement: chiffrementEnPanne({ chiffrer: 'DPAPI a échoué' }) },
      { ecrireEleve: async () => ({ ok: false, annule: true }) },
      { ecrireEleve: async () => ({ ok: false, annule: false, detail: 'code 5' }) },
      { ecrireEleve: async () => ({ ok: true }) },
      {
        ecrireEleve: async () => {
          writeFileSync(fichierSecrets(), Buffer.from('autre contenu'));
          return { ok: true };
        },
      },
    ];
    for (const options of variantes) {
      expect(JSON.stringify(await coffre(options).ecrire(secretsDe()))).not.toContain(TEMOIN);
    }
  });

  it('ne transmet jamais la valeur du secret en clair à l’écriture élevée', async () => {
    const { coffre: c, ecrireEleve } = creer();
    await c.ecrire(secretsDe());
    expect(JSON.stringify(ecrireEleve.mock.calls)).not.toContain(TEMOIN);
  });
});

describe('lireFichierCle', () => {
  it('renvoie les octets exacts du fichier', async () => {
    const chemin = join(racine, 'cle-fictive.ppk');
    const octets = Uint8Array.from([0, 1, 2, 250, 251, 252, 255]);
    writeFileSync(chemin, octets);
    const resultat = await lireFichierCle(chemin);
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(Buffer.from(resultat.octets).equals(Buffer.from(octets))).toBe(true);
  });

  it('accepte un fichier de exactement 64 Ko', async () => {
    const chemin = join(racine, 'cle-limite.ppk');
    writeFileSync(chemin, new Uint8Array(TAILLE_MAX_CLE_PRIVEE).fill(97));
    const resultat = await lireFichierCle(chemin);
    expect(resultat.ok).toBe(true);
  });

  it('refuse un fichier de plus de 64 Ko sans le lire', async () => {
    const readFile = vi.fn(systemeReel.readFile);
    const stat = vi.fn(async () => ({ size: TAILLE_MAX_CLE_PRIVEE + 1 }));
    const resultat = await lireFichierCle(join(racine, 'gros.ppk'), faux({ readFile, stat }));
    expect(resultat).toEqual({ ok: false, refus: 'trop-volumineux' });
    expect(readFile).not.toHaveBeenCalled();
  });

  it('renvoie ENOENT pour un fichier absent', async () => {
    expect(await lireFichierCle(join(racine, 'absent.ppk'))).toEqual({
      ok: false,
      code: 'ENOENT',
    });
  });

  it('renvoie le code d’une erreur de lecture', async () => {
    const stat = vi.fn(async () => ({ size: 10 }));
    const readFile = vi.fn(() => Promise.reject(erreurSysteme('EACCES')));
    const resultat = await lireFichierCle(join(racine, 'x.ppk'), faux({ stat, readFile }));
    expect(resultat).toEqual({ ok: false, code: 'EACCES' });
  });

  it('ne lève jamais pour un chemin qui est un dossier', async () => {
    const resultat = await lireFichierCle(racine);
    expect(resultat.ok).toBe(false);
  });
});
