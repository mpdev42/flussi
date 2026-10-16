import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChiffrementMachine } from './dpapi';
import {
  CODES_ECRITURE,
  TAILLE_MAX_BLOB,
  cheminCanal,
  ARGUMENT_ECRITURE_SECRETS,
} from './elevation';
import {
  canalEcritureDemande,
  ecrireSecretsDepuisCanal,
  type SystemeFichiersEcriture,
} from './ecriture-secrets';
import { encoderSecrets } from './secrets-format';

// SÉCURITÉ : aucune élévation, aucun processus. Les canaux nommés sont réels (`node:net`, nom
// unique par test) ; le dossier protégé est un dossier temporaire ; le chiffrement est un faux XOR.

const DATE = '2026-10-15T08:30:00.000Z';
const OCTET_XOR = 0x5a;

let dossier: string;
let serveurs: Server[];

beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'flussi-ecriture-'));
  serveurs = [];
});

afterEach(async () => {
  for (const serveur of serveurs) {
    await new Promise<void>((fin) => serveur.close(() => fin()));
  }
  rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
});

const xor = (octets: Uint8Array): Uint8Array => octets.map((o) => o ^ OCTET_XOR);

const chiffrementXor: ChiffrementMachine = {
  indisponibilite: () => null,
  chiffrer: xor,
  dechiffrer: xor,
};

const blobValide = (): Uint8Array =>
  xor(encoderSecrets({ 'iga-ftp-mot-de-passe': { valeur: 'TEMOIN-42', date: DATE } }));

const nouveauNom = (): string => `flussi-secrets-${randomUUID()}`;

/** Serveur de canal nommé réel : envoie `blob` à la première connexion puis ferme. */
async function servirCanal(blob: Uint8Array): Promise<string> {
  const nom = nouveauNom();
  const serveur = createServer((connexion) => {
    connexion.on('error', () => undefined);
    connexion.end(blob);
  });
  serveurs.push(serveur);
  await new Promise<void>((resolve, reject) => {
    serveur.once('error', reject);
    serveur.listen(cheminCanal(nom), () => resolve());
  });
  return nom;
}

const contenuDuDossier = (): string[] => readdirSync(dossier).sort();

function erreurSysteme(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: erreur simulée`), { code });
}

/** Système de fichiers qui délègue au vrai disque, sauf les surcharges. */
function fsFaux(surcharges: Partial<SystemeFichiersEcriture> = {}): SystemeFichiersEcriture {
  return {
    open: (chemin, drapeaux) => fsPromises.open(chemin, drapeaux),
    rename: (ancien, nouveau) => fsPromises.rename(ancien, nouveau),
    unlink: (chemin) => fsPromises.unlink(chemin),
    ...surcharges,
  };
}

describe('canalEcritureDemande', () => {
  const nom = 'flussi-secrets-0123abcd-0123-4abc-8abc-0123456789ab';

  it('reconnaît un argument valide', () => {
    expect(canalEcritureDemande(['Flussi.exe', `${ARGUMENT_ECRITURE_SECRETS}${nom}`])).toBe(nom);
  });

  it('renvoie null sans argument de mode écriture', () => {
    expect(canalEcritureDemande([])).toBeNull();
    expect(canalEcritureDemande(['Flussi.exe', '--autre'])).toBeNull();
  });

  it.each([
    ['majuscules', nom.toUpperCase().replace('FLUSSI-SECRETS-', 'flussi-secrets-')],
    ['trop court', 'flussi-secrets-0123'],
    ['trop long', `${nom}0`],
    ['caractères hors hexadécimal', 'flussi-secrets-zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz'],
    ['mauvais préfixe', 'autre-0123abcd-0123-4abc-8abc-0123456789ab'],
    ['chemin de canal complet', `\\\\.\\pipe\\${nom}`],
    ['injection d’espace', `${nom} --autre`],
    ['injection de guillemet', `${nom}"`],
    ['nom vide', ''],
  ])('refuse un nom invalide : %s', (_libelle, valeur) => {
    expect(canalEcritureDemande([`${ARGUMENT_ECRITURE_SECRETS}${valeur}`])).toBeNull();
  });

  it('plusieurs arguments : le premier argument de mode écriture fait foi', () => {
    const autre = 'flussi-secrets-ffffffff-ffff-4fff-8fff-ffffffffffff';
    expect(
      canalEcritureDemande([
        'Flussi.exe',
        `${ARGUMENT_ECRITURE_SECRETS}${nom}`,
        `${ARGUMENT_ECRITURE_SECRETS}${autre}`,
      ]),
    ).toBe(nom);
  });

  it('plusieurs arguments : un premier invalide n’est pas contourné par le suivant', () => {
    expect(
      canalEcritureDemande([
        `${ARGUMENT_ECRITURE_SECRETS}invalide`,
        `${ARGUMENT_ECRITURE_SECRETS}${nom}`,
      ]),
    ).toBeNull();
  });
});

describe('ecrireSecretsDepuisCanal', () => {
  it('succès : code 0, secrets.bin égal au blob reçu, aucun temporaire restant', async () => {
    const blob = blobValide();
    const nomCanal = await servirCanal(blob);

    const code = await ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement: chiffrementXor });

    expect(code).toBe(CODES_ECRITURE.ok);
    expect(Buffer.from(readFileSync(join(dossier, 'secrets.bin'))).equals(Buffer.from(blob))).toBe(
      true,
    );
    expect(contenuDuDossier()).toEqual(['secrets.bin']);
  });

  it('remplace un secrets.bin existant', async () => {
    writeFileSync(join(dossier, 'secrets.bin'), 'ancien contenu');
    const blob = blobValide();
    const nomCanal = await servirCanal(blob);

    const code = await ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement: chiffrementXor });

    expect(code).toBe(CODES_ECRITURE.ok);
    expect(Buffer.from(readFileSync(join(dossier, 'secrets.bin'))).equals(Buffer.from(blob))).toBe(
      true,
    );
    expect(contenuDuDossier()).toEqual(['secrets.bin']);
  });

  it('blob indéchiffrable : code contenu, rien d’écrit', async () => {
    const nomCanal = await servirCanal(blobValide());
    const chiffrementCasse: ChiffrementMachine = {
      ...chiffrementXor,
      dechiffrer: () => {
        throw new Error('blob étranger');
      },
    };

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementCasse,
    });

    expect(code).toBe(CODES_ECRITURE.contenu);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('blob déchiffrable mais JSON invalide : code contenu, rien d’écrit', async () => {
    const nomCanal = await servirCanal(xor(new TextEncoder().encode('ceci n’est pas du JSON')));

    const code = await ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement: chiffrementXor });

    expect(code).toBe(CODES_ECRITURE.contenu);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('blob déchiffrable, JSON valide mais format inconnu : code contenu', async () => {
    const nomCanal = await servirCanal(
      xor(new TextEncoder().encode(JSON.stringify({ format: 2, secrets: {} }))),
    );

    const code = await ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement: chiffrementXor });

    expect(code).toBe(CODES_ECRITURE.contenu);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('canal inexistant : code canal', async () => {
    const code = await ecrireSecretsDepuisCanal({
      nomCanal: nouveauNom(),
      dossier,
      chiffrement: chiffrementXor,
    });

    expect(code).toBe(CODES_ECRITURE.canal);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('blob de plus de 1 Mio : code canal, rien d’écrit', async () => {
    const nomCanal = await servirCanal(new Uint8Array(TAILLE_MAX_BLOB + 1));

    const code = await ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement: chiffrementXor });

    expect(code).toBe(CODES_ECRITURE.canal);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('open en EPERM : code droits', async () => {
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementXor,
      fs: fsFaux({
        open: () => Promise.reject(erreurSysteme('EPERM')),
      }),
    });

    expect(code).toBe(CODES_ECRITURE.droits);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('open en EACCES : code droits', async () => {
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementXor,
      fs: fsFaux({ open: () => Promise.reject(erreurSysteme('EACCES')) }),
    });

    expect(code).toBe(CODES_ECRITURE.droits);
  });

  it('rename en échec (autre que droits) : code système, temporaire supprimé, ancien fichier intact', async () => {
    writeFileSync(join(dossier, 'secrets.bin'), 'ancien contenu');
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementXor,
      fs: fsFaux({ rename: () => Promise.reject(erreurSysteme('EBUSY')) }),
    });

    expect(code).toBe(CODES_ECRITURE.systeme);
    expect(contenuDuDossier()).toEqual(['secrets.bin']);
    expect(readFileSync(join(dossier, 'secrets.bin'), 'utf8')).toBe('ancien contenu');
  });

  it('rename en EPERM : code droits, temporaire supprimé', async () => {
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementXor,
      fs: fsFaux({ rename: () => Promise.reject(erreurSysteme('EPERM')) }),
    });

    expect(code).toBe(CODES_ECRITURE.droits);
    expect(contenuDuDossier()).toEqual([]);
  });

  it('ne lève jamais : un fs qui lève de façon synchrone donne un code, pas une exception', async () => {
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier,
      chiffrement: chiffrementXor,
      fs: fsFaux({
        open: () => {
          throw new Error('panne synchrone');
        },
      }),
    });

    expect(typeof code).toBe('number');
    expect(code).not.toBe(CODES_ECRITURE.ok);
  });

  it('ne lève jamais : dossier inexistant donne un code système', async () => {
    const nomCanal = await servirCanal(blobValide());

    const code = await ecrireSecretsDepuisCanal({
      nomCanal,
      dossier: join(dossier, 'absent'),
      chiffrement: chiffrementXor,
    });

    expect(code).toBe(CODES_ECRITURE.systeme);
  });
});
