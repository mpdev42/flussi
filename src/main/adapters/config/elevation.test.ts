import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChiffrementMachine } from './dpapi';
import { ecrireSecretsDepuisCanal } from './ecriture-secrets';
import {
  ARGUMENT_ECRITURE_SECRETS,
  CODES_ECRITURE,
  cheminCanal,
  creerCanalReel,
  ecrireEnAdministrateur,
  type ApiElevationWindows,
  type CanalSecrets,
} from './elevation';
import { creerCoffreSecrets } from './secrets';
import { encoderSecrets } from './secrets-format';

// SÉCURITÉ : aucun test n'importe `api-windows` ni ne crée l'API réelle. L'API Windows est toujours
// factice : aucune invite UAC, aucun processus. Les canaux nommés réels (`node:net`) sont locaux au
// processus de test, avec un nom unique par test.

const BLOB = new Uint8Array([1, 2, 3]);
const EXECUTABLE = 'C:\\Program Files\\Flussi\\Flussi.exe';
const INEXISTANT = 'C:\\inexistant\\flussi.exe';
const DATE = '2026-10-15T08:30:00.000Z';
const OCTET_XOR = 0x5a;

function creerApiFactice(options: {
  lancement?: ReturnType<ApiElevationWindows['lancerEleve']>;
  codeSortie?: number;
}) {
  const lancerEleve = vi.fn<ApiElevationWindows['lancerEleve']>(
    () => options.lancement ?? { ok: true, processus: 'processus-factice' },
  );
  const attendreFin = vi.fn<ApiElevationWindows['attendreFin']>(
    async () => options.codeSortie ?? 0,
  );
  return {
    api: { lancerEleve, attendreFin } satisfies ApiElevationWindows,
    lancerEleve,
    attendreFin,
  };
}

function creerCanalFactice() {
  const fermer = vi.fn(async () => undefined);
  const creerCanal = vi.fn(async (): Promise<CanalSecrets> => ({ fermer }));
  return { creerCanal, fermer };
}

describe('ecrireEnAdministrateur', () => {
  it('lance l’exécutable avec le seul nom du canal en argument, attend la fin, ferme le canal', async () => {
    const { api, lancerEleve, attendreFin } = creerApiFactice({});
    const { creerCanal, fermer } = creerCanalFactice();

    const resultat = await ecrireEnAdministrateur(
      { blob: BLOB, executable: EXECUTABLE },
      api,
      creerCanal,
    );

    expect(resultat).toEqual({ ok: true });
    const [executable, parametres] = lancerEleve.mock.calls[0] ?? [];
    expect(executable).toBe(EXECUTABLE);
    expect(parametres).toMatch(
      new RegExp(`^${ARGUMENT_ECRITURE_SECRETS}flussi-secrets-[0-9a-f-]{36}$`),
    );
    expect(attendreFin).toHaveBeenCalledWith('processus-factice');
    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it('invite refusée (1223) : annulé', async () => {
    const { api, attendreFin } = creerApiFactice({ lancement: { ok: false, code: 1223 } });
    const { creerCanal, fermer } = creerCanalFactice();

    expect(
      await ecrireEnAdministrateur({ blob: BLOB, executable: EXECUTABLE }, api, creerCanal),
    ).toEqual({ ok: false, annule: true });
    expect(attendreFin).not.toHaveBeenCalled();
    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it('autre échec de lancement : détail « lancement (code N) »', async () => {
    const { api } = creerApiFactice({ lancement: { ok: false, code: 740 } });
    const { creerCanal } = creerCanalFactice();

    expect(
      await ecrireEnAdministrateur({ blob: BLOB, executable: EXECUTABLE }, api, creerCanal),
    ).toEqual({ ok: false, annule: false, detail: 'lancement (code 740)' });
  });

  it.each([
    [CODES_ECRITURE.contenu, 'contenu refusé (code 3)'],
    [CODES_ECRITURE.droits, 'écriture refusée (droits) (code 4)'],
    [CODES_ECRITURE.canal, 'canal (code 5)'],
    [CODES_ECRITURE.systeme, 'erreur système (code 6)'],
    [CODES_ECRITURE.inattendu, 'erreur inattendue (code 2)'],
    [99, 'code 99'],
  ])('code de sortie %i : détail « %s »', async (codeSortie, detail) => {
    const { api } = creerApiFactice({ codeSortie });
    const { creerCanal, fermer } = creerCanalFactice();

    expect(
      await ecrireEnAdministrateur({ blob: BLOB, executable: EXECUTABLE }, api, creerCanal),
    ).toEqual({ ok: false, annule: false, detail });
    expect(fermer).toHaveBeenCalledTimes(1);
  });

  it('création du canal en échec : détail « canal (…) », rien n’est lancé', async () => {
    const { api, lancerEleve } = creerApiFactice({});

    const resultat = await ecrireEnAdministrateur({ blob: BLOB, executable: EXECUTABLE }, api, () =>
      Promise.reject(new Error('EADDRINUSE')),
    );

    expect(resultat).toEqual({ ok: false, annule: false, detail: 'canal (EADDRINUSE)' });
    expect(lancerEleve).not.toHaveBeenCalled();
  });

  it('attendreFin qui rejette : détail = message, canal fermé', async () => {
    const { api, attendreFin } = creerApiFactice({});
    attendreFin.mockRejectedValueOnce(new Error('attente échouée'));
    const { creerCanal, fermer } = creerCanalFactice();

    expect(
      await ecrireEnAdministrateur({ blob: BLOB, executable: EXECUTABLE }, api, creerCanal),
    ).toEqual({ ok: false, annule: false, detail: 'attente échouée' });
    expect(fermer).toHaveBeenCalledTimes(1);
  });
});

describe('creerCanalReel', () => {
  const nouveauNom = (): string => `flussi-secrets-${randomUUID()}`;

  function lireClient(nom: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const morceaux: Buffer[] = [];
      const client = connect(cheminCanal(nom));
      client.on('data', (m: Buffer) => morceaux.push(m));
      client.on('end', () => resolve(Buffer.concat(morceaux)));
      client.on('error', reject);
    });
  }

  it('un client reçoit exactement le blob', async () => {
    const nom = nouveauNom();
    const blob = new Uint8Array([0, 1, 2, 250, 251, 252, 255]);
    const canal = await creerCanalReel(nom, blob);
    try {
      const recu = await lireClient(nom);
      expect(recu.equals(Buffer.from(blob))).toBe(true);
    } finally {
      await canal.fermer();
    }
  });

  it('une seconde connexion est refusée ou ne reçoit rien', async () => {
    const nom = nouveauNom();
    const canal = await creerCanalReel(nom, BLOB);
    try {
      await lireClient(nom);
      // Le serveur a cessé d'écouter à la première connexion
      const second = await lireClient(nom).then(
        (octets) => octets,
        () => null,
      );
      expect(second === null || second.length === 0).toBe(true);
    } finally {
      await canal.fermer();
    }
  });

  it('fermer() libère le nom : un nouveau serveur peut le réutiliser', async () => {
    const nom = nouveauNom();
    const canal = await creerCanalReel(nom, BLOB);
    await canal.fermer();

    const serveur = createServer();
    try {
      await new Promise<void>((resolve, reject) => {
        serveur.once('error', reject);
        serveur.listen(cheminCanal(nom), () => resolve());
      });
      expect(serveur.listening).toBe(true);
    } finally {
      await new Promise<void>((fin) => serveur.close(() => fin()));
    }
  });

  it('fermer() peut être appelé deux fois sans lever', async () => {
    const canal = await creerCanalReel(nouveauNom(), BLOB);
    await canal.fermer();
    await expect(canal.fermer()).resolves.toBeUndefined();
  });

  it('nom déjà pris : la création rejette', async () => {
    const nom = nouveauNom();
    const canal = await creerCanalReel(nom, BLOB);
    try {
      await expect(creerCanalReel(nom, BLOB)).rejects.toThrow();
    } finally {
      await canal.fermer();
    }
  });
});

describe('chaîne complète sans élévation réelle', () => {
  let dossier: string;

  beforeEach(() => {
    dossier = mkdtempSync(join(tmpdir(), 'flussi-chaine-'));
  });

  afterEach(() => {
    rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  });

  const xor = (octets: Uint8Array): Uint8Array => octets.map((o) => o ^ OCTET_XOR);
  const chiffrementXor: ChiffrementMachine = {
    indisponibilite: () => null,
    chiffrer: xor,
    dechiffrer: xor,
  };

  /**
   * API factice : `lancerEleve` capture l'argument, `attendreFin` exécute réellement le mode
   * écriture dans le même processus (au lieu d'un Flussi élevé) et renvoie son code.
   */
  function creerApiMemeProcessus(chiffrement: ChiffrementMachine) {
    const lancerEleve = vi.fn<ApiElevationWindows['lancerEleve']>(() => ({
      ok: true,
      processus: 'processus-factice',
    }));
    const attendreFin = vi.fn<ApiElevationWindows['attendreFin']>(() => {
      const [, parametres] = lancerEleve.mock.calls[0] ?? [];
      const nomCanal = String(parametres).slice(ARGUMENT_ECRITURE_SECRETS.length);
      return ecrireSecretsDepuisCanal({ nomCanal, dossier, chiffrement });
    });
    return { api: { lancerEleve, attendreFin } satisfies ApiElevationWindows, lancerEleve };
  }

  it('blob accepté : ok, secrets.bin écrit, argument = mode écriture + nom de canal seulement', async () => {
    const blob = xor(
      encoderSecrets({ 'iga-ftp-mot-de-passe': { valeur: 'TEMOIN-42', date: DATE } }),
    );
    const { api, lancerEleve } = creerApiMemeProcessus(chiffrementXor);

    const resultat = await ecrireEnAdministrateur({ blob, executable: INEXISTANT }, api);

    expect(resultat).toEqual({ ok: true });
    expect(lancerEleve).toHaveBeenCalledTimes(1);
    const [executable, parametres] = lancerEleve.mock.calls[0] ?? [];
    expect(executable).toBe(INEXISTANT);
    expect(parametres).toMatch(
      new RegExp(`^${ARGUMENT_ECRITURE_SECRETS}flussi-secrets-[0-9a-f-]{36}$`),
    );
    expect(Buffer.from(readFileSync(join(dossier, 'secrets.bin'))).equals(Buffer.from(blob))).toBe(
      true,
    );
    expect(readdirSync(dossier)).toEqual(['secrets.bin']);
  });

  it('blob refusé : détail « contenu refusé », rien d’écrit', async () => {
    const blob = xor(new TextEncoder().encode('pas du JSON'));
    const { api } = creerApiMemeProcessus(chiffrementXor);

    const resultat = await ecrireEnAdministrateur({ blob, executable: INEXISTANT }, api);

    expect(resultat.ok).toBe(false);
    if (resultat.ok || resultat.annule) return;
    expect(resultat.detail).toContain('contenu refusé');
    expect(readdirSync(dossier)).toEqual([]);
  });

  it('coffre → canal → mode écriture → vérification : ecrire() ok puis lire() restitue le contenu', async () => {
    const { api } = creerApiMemeProcessus(chiffrementXor);
    const coffre = creerCoffreSecrets({
      dossier,
      chiffrement: chiffrementXor,
      ecrireEleve: (blob) => ecrireEnAdministrateur({ blob, executable: INEXISTANT }, api),
    });
    const secrets = {
      'iga-ftp-mot-de-passe': { valeur: 'TEMOIN-42', date: DATE },
      'msp-sftp-mot-de-passe': { valeur: 'TEMOIN-43', date: DATE },
    };

    expect(await coffre.ecrire(secrets)).toEqual({ ok: true });
    expect(await coffre.lire()).toEqual({ etat: 'lisible', secrets });
    expect(readdirSync(dossier)).toEqual(['secrets.bin']);
  });
});
