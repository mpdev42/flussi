import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NiveauJournal } from '@shared/schemas/journal';
import type {
  DemandeEnregistrementSecrets,
  EtatSecrets,
  ResultatSecret,
  SecretTechnique,
} from '@shared/types';
import type {
  CoffreSecrets,
  ContenuSecrets,
  EcritureSecrets,
  LectureFichierCle,
  LectureSecrets,
} from '../../adapters/config';
import { creerServiceSecrets, type ServiceSecrets } from './secrets';

// SÉCURITÉ : le coffre est simulé en mémoire. Aucune copie élevée, aucun lanceur, aucun processus.
// Valeurs fictives uniquement : aucune vraie clé, tout est fabriqué ici.
const TEMOIN_MDP = 'TEMOIN-MOT-DE-PASSE-42';
const CORPS_CLE = 'CORPS-CLE-FICTIF-77';
const CHEMIN_CLE = 'D:\\Dossier-prive\\chemin-cle-fictif.ppk';
const DOSSIER = 'C:\\ProgramData\\Flussi';
const FICHIER = `${DOSSIER}\\secrets.bin`;
const DATE_FIXE = '2026-10-15T09:30:00.000Z';

const IGA = 'iga-ftp-mot-de-passe';
const MSP = 'msp-sftp-mot-de-passe';
const CLE = 'msp-sftp-cle-privee';

// --- Messages attendus (copiés à la lettre : un changement de texte doit casser le test) ---

const MESSAGE_DEV =
  'Les secrets ne sont pas modifiables en développement : ils sont lus dans le fichier .env.';
const MESSAGE_CLE_NON_CHOISIE = "Aucune clé choisie : choisissez d'abord le fichier de la clé.";
const MESSAGE_AUCUN_CHANGEMENT = 'Aucun changement à enregistrer.';
const messageDpapi = (cause: string) =>
  `Le chiffrement Windows (DPAPI) n'est pas disponible : les secrets ne peuvent être ni lus ni enregistrés. Contactez le service informatique. Détail : ${cause}`;
const messageLecture = (code: string) =>
  `Le fichier des secrets n'a pas pu être lu (${code}). Réessayez.`;
const messageIllisible = (cause: string) =>
  `Le fichier des secrets (${FICHIER}) ne peut pas être déchiffré sur ce poste : il a été copié depuis un autre poste ou il est endommagé. Les secrets sont à saisir de nouveau par un administrateur. Détail : ${cause}`;
const LIGNE_INFO_ILLISIBLE =
  'Fichier des secrets illisible sur ce poste : il est recréé, les autres secrets sont à saisir de nouveau.';

const DESIGNATION_IGA = 'Mot de passe FTP IGA';
const DESIGNATION_MSP = 'Mot de passe SFTP MSP';
const DESIGNATION_CLE = 'Clé privée SFTP MSP';

// --- Fabriques de clés fictives ---

const PPK_V2 = [
  'PuTTY-User-Key-File-2: ssh-rsa',
  'Encryption: none',
  `Comment: ${CORPS_CLE}`,
  'Public-Lines: 1',
  'AAAAB3NzaC1yc2EAAAADAQAB',
  'Private-Lines: 1',
  'AAAAgBvUc3',
  'Private-MAC: 00112233445566778899aabbccddeeff00112233',
  '',
].join('\n');

const PPK_V3 = PPK_V2.replace('File-2', 'File-3');
const PPK_CHIFFREE = PPK_V2.replace('Encryption: none', 'Encryption: aes256-cbc');

function opensshAvecCorps(): string {
  const nom = Buffer.from('none', 'latin1');
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(nom.length);
  const corps = Buffer.concat([
    Buffer.from('openssh-key-v1\0', 'latin1'),
    longueur,
    nom,
    Buffer.from(CORPS_CLE, 'latin1'),
  ]);
  return [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    ...(corps.toString('base64').match(/.{1,70}/g) ?? []),
    '-----END OPENSSH PRIVATE KEY-----',
    '',
  ].join('\n');
}

const OPENSSH = opensshAvecCorps();

const PEM_RSA = [
  '-----BEGIN RSA PRIVATE KEY-----',
  'MIIBFAKEFAKEFAKEFAKE',
  '-----END RSA PRIVATE KEY-----',
  '',
].join('\n');

const octets = (texte: string) => new TextEncoder().encode(texte);

// --- Faux coffre en mémoire (CoffreSecrets) ---

type EchecEcriture = Extract<EcritureSecrets, { ok: false }>;

interface OptionsCoffre {
  indisponibilite?: string | null;
  lecture?: LectureSecrets;
  echecEcriture?: EchecEcriture;
  /** Délai de chaque lecture et écriture, pour provoquer des entrelacements. */
  delaiMs?: number;
}

function creerCoffre(options: OptionsCoffre = {}) {
  let courant: LectureSecrets = options.lecture ?? { etat: 'absent' };
  let echec = options.echecEcriture;
  const ecritures: ContenuSecrets[] = [];
  const attendre = () =>
    options.delaiMs ? new Promise<void>((fin) => setTimeout(fin, options.delaiMs)) : undefined;

  const lire = vi.fn(async (): Promise<LectureSecrets> => {
    await attendre();
    return courant;
  });
  const ecrire = vi.fn(async (secrets: ContenuSecrets): Promise<EcritureSecrets> => {
    await attendre();
    ecritures.push(structuredClone(secrets));
    if (echec) return echec;
    courant = { etat: 'lisible', secrets: structuredClone(secrets) };
    return { ok: true };
  });
  const indisponibilite = vi.fn(() => options.indisponibilite ?? null);

  const coffre: CoffreSecrets = {
    dossier: DOSSIER,
    fichier: FICHIER,
    indisponibilite,
    lire,
    ecrire,
  };
  return {
    coffre,
    lire,
    ecrire,
    indisponibilite,
    ecritures,
    contenu: () => courant,
    definirEchec: (nouveau: EchecEcriture | undefined) => {
      echec = nouveau;
    },
  };
}

// --- Contexte de test ---

interface LigneJournal {
  niveau: NiveauJournal;
  message: string;
}

let lignes: LigneJournal[];
let horloge: Date;
let choisirFichierCle: ReturnType<typeof vi.fn<() => Promise<string | null>>>;
let lireFichierCle: ReturnType<typeof vi.fn<(chemin: string) => Promise<LectureFichierCle>>>;
/** Toutes les réponses d'un test : contrôlées en fin de test (confidentialité). */
let reponses: unknown[];

const PRESENCE_ENV_VIDE: Record<SecretTechnique, boolean> = {
  [IGA]: false,
  [MSP]: false,
  [CLE]: false,
};

beforeEach(() => {
  lignes = [];
  reponses = [];
  horloge = new Date(DATE_FIXE);
  choisirFichierCle = vi.fn<() => Promise<string | null>>(async () => CHEMIN_CLE);
  lireFichierCle = vi.fn<(chemin: string) => Promise<LectureFichierCle>>(async () => ({
    ok: true,
    octets: octets(PPK_V2),
  }));
});

afterEach(() => {
  // Confidentialité : ni la valeur témoin, ni le corps de la clé, ni son chemin, nulle part
  const sortie = JSON.stringify({ reponses, lignes });
  expect(sortie).not.toContain(TEMOIN_MDP);
  expect(sortie).not.toContain(CORPS_CLE);
  expect(sortie).not.toContain('chemin-cle-fictif');
  expect(sortie).not.toContain('Dossier-prive');
});

function creerService(coffre: CoffreSecrets | null, presenceEnv = PRESENCE_ENV_VIDE) {
  const service = creerServiceSecrets({
    presenceEnv,
    coffre,
    choisirFichierCle,
    lireFichierCle,
    journal: {
      ajouter: async (niveau, message) => {
        lignes.push({ niveau, message });
      },
    },
    maintenant: () => horloge,
  });
  return enregistrante(service);
}

/** Service dont chaque réponse est consignée pour le contrôle de confidentialité. */
function enregistrante(service: ServiceSecrets): ServiceSecrets {
  const noter = async <T>(promesse: Promise<T>): Promise<T> => {
    const reponse = await promesse;
    reponses.push(reponse);
    return reponse;
  };
  return {
    etat: () => noter(service.etat()),
    preparerCle: () => noter(service.preparerCle()),
    abandonnerCle: () => {
      service.abandonnerCle();
    },
    enregistrer: (demande) => noter(service.enregistrer(demande)),
  };
}

/** Date AAAA-MM-JJ locale du poste, comme la voit l'utilisateur. */
function dateLocaleDe(iso: string): string {
  const d = new Date(iso);
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

const secretStocke = (valeur: string, date = DATE_FIXE) => ({ valeur, date });

function etatDe(resultat: ResultatSecret): EtatSecrets {
  if (resultat.statut !== 'enregistre') throw new Error(`statut inattendu : ${resultat.statut}`);
  return resultat.etat;
}

const demandeIga = (valeur = TEMOIN_MDP): DemandeEnregistrementSecrets => ({
  motsDePasse: { [IGA]: valeur },
  cle: false,
});

const DEMANDE_CLE: DemandeEnregistrementSecrets = { motsDePasse: {}, cle: true };

// --- etat() ---

describe('ServiceSecrets.etat — développement', () => {
  it('lit la présence dans le .env, sans coffre', async () => {
    const service = creerService(null, { [IGA]: true, [MSP]: false, [CLE]: true });
    expect(await service.etat()).toEqual({
      source: 'env',
      modifiable: false,
      anomalie: null,
      secrets: {
        [IGA]: { etat: 'env' },
        [MSP]: { etat: 'non-renseigne' },
        [CLE]: { etat: 'env' },
      },
    });
  });

  it('donne trois « non renseigné » quand le .env ne porte aucun secret', async () => {
    const etat = await creerService(null).etat();
    expect(Object.values(etat.secrets)).toEqual([
      { etat: 'non-renseigne' },
      { etat: 'non-renseigne' },
      { etat: 'non-renseigne' },
    ]);
    expect(etat.modifiable).toBe(false);
  });
});

describe('ServiceSecrets.etat — application installée', () => {
  it('signale DPAPI indisponible : anomalie exacte, non modifiable, coffre non lu', async () => {
    const faux = creerCoffre({ indisponibilite: 'binaire absent' });
    const etat = await creerService(faux.coffre).etat();
    expect(etat).toEqual({
      source: 'secrets-bin',
      modifiable: false,
      anomalie: messageDpapi('binaire absent'),
      secrets: {
        [IGA]: { etat: 'non-renseigne' },
        [MSP]: { etat: 'non-renseigne' },
        [CLE]: { etat: 'non-renseigne' },
      },
    });
    expect(faux.lire).not.toHaveBeenCalled();
  });

  it('fichier absent : trois « non renseigné », modifiable', async () => {
    const etat = await creerService(creerCoffre().coffre).etat();
    expect(etat).toEqual({
      source: 'secrets-bin',
      modifiable: true,
      anomalie: null,
      secrets: {
        [IGA]: { etat: 'non-renseigne' },
        [MSP]: { etat: 'non-renseigne' },
        [CLE]: { etat: 'non-renseigne' },
      },
    });
  });

  it('fichier lisible : « renseigné » avec la date locale AAAA-MM-JJ', async () => {
    const faux = creerCoffre({
      lecture: {
        etat: 'lisible',
        secrets: {
          [IGA]: secretStocke(TEMOIN_MDP, '2026-03-04T10:00:00.000Z'),
          [CLE]: secretStocke(CORPS_CLE, DATE_FIXE),
        },
      },
    });
    const etat = await creerService(faux.coffre).etat();
    expect(etat.secrets).toEqual({
      [IGA]: { etat: 'renseigne', date: dateLocaleDe('2026-03-04T10:00:00.000Z') },
      [MSP]: { etat: 'non-renseigne' },
      [CLE]: { etat: 'renseigne', date: dateLocaleDe(DATE_FIXE) },
    });
    expect(etat.anomalie).toBeNull();
    expect(etat.modifiable).toBe(true);
  });

  it('la date est au format AAAA-MM-JJ', async () => {
    const faux = creerCoffre({
      lecture: { etat: 'lisible', secrets: { [MSP]: secretStocke(TEMOIN_MDP) } },
    });
    const etat = await creerService(faux.coffre).etat();
    expect(etat.secrets[MSP]).toMatchObject({
      etat: 'renseigne',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('ignore les identifiants inconnus du coffre', async () => {
    const faux = creerCoffre({
      lecture: { etat: 'lisible', secrets: { 'secret-futur': secretStocke('autre') } },
    });
    const etat = await creerService(faux.coffre).etat();
    expect(Object.keys(etat.secrets).sort()).toEqual([CLE, IGA, MSP].sort());
    expect(Object.values(etat.secrets).every((s) => s.etat === 'non-renseigne')).toBe(true);
  });

  it('fichier illisible : modifiable, anomalie exacte avec le chemin du fichier, secrets vides', async () => {
    const faux = creerCoffre({ lecture: { etat: 'illisible', cause: 'blob étranger' } });
    const etat = await creerService(faux.coffre).etat();
    expect(etat.source).toBe('secrets-bin');
    expect(etat.anomalie).toBe(messageIllisible('blob étranger'));
    expect(etat.modifiable).toBe(true);
    expect(Object.values(etat.secrets).every((s) => s.etat === 'non-renseigne')).toBe(true);
  });

  it('erreur de lecture : anomalie exacte, non modifiable, secrets vides', async () => {
    const faux = creerCoffre({ lecture: { etat: 'erreur', code: 'EACCES' } });
    const etat = await creerService(faux.coffre).etat();
    expect(etat.anomalie).toBe(messageLecture('EACCES'));
    expect(etat.modifiable).toBe(false);
    expect(etat.source).toBe('secrets-bin');
    expect(Object.values(etat.secrets).every((s) => s.etat === 'non-renseigne')).toBe(true);
  });

  it('n’écrit jamais dans le coffre et ne journalise rien', async () => {
    const faux = creerCoffre();
    await creerService(faux.coffre).etat();
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });
});

// --- preparerCle() ---

describe('ServiceSecrets.preparerCle', () => {
  it('refuse en développement : sélecteur jamais ouvert, rien au journal', async () => {
    const resultat = await creerService(null).preparerCle();
    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_DEV });
    expect(choisirFichierCle).not.toHaveBeenCalled();
    expect(lireFichierCle).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });

  it('annulation du sélecteur : « annulé », rien lu, rien écrit, rien au journal', async () => {
    choisirFichierCle.mockResolvedValueOnce(null);
    const faux = creerCoffre();

    const resultat = await creerService(faux.coffre).preparerCle();

    expect(resultat).toEqual({ statut: 'annule' });
    expect(lireFichierCle).not.toHaveBeenCalled();
    expect(faux.lire).not.toHaveBeenCalled();
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });

  it('une annulation ultérieure laisse la clé déjà préparée utilisable', async () => {
    const faux = creerCoffre();
    const service = creerService(faux.coffre);

    expect((await service.preparerCle()).statut).toBe('preparee');
    choisirFichierCle.mockResolvedValueOnce(null);
    expect(await service.preparerCle()).toEqual({ statut: 'annule' });

    const resultat = await service.enregistrer(DEMANDE_CLE);

    expect(resultat.statut).toBe('enregistre');
    expect(faux.ecritures).toEqual([{ [CLE]: { valeur: PPK_V2, date: DATE_FIXE } }]);
  });

  it('lit le fichier au chemin choisi par le sélecteur, sans écrire dans le coffre', async () => {
    const faux = creerCoffre();
    await creerService(faux.coffre).preparerCle();
    expect(choisirFichierCle).toHaveBeenCalledTimes(1);
    expect(lireFichierCle).toHaveBeenCalledWith(CHEMIN_CLE);
    expect(faux.lire).not.toHaveBeenCalled();
    expect(faux.ecrire).not.toHaveBeenCalled();
  });

  it('refuse une clé trop volumineuse avec le message exact', async () => {
    lireFichierCle.mockResolvedValueOnce({ ok: false, refus: 'trop-volumineux' });

    const resultat = await creerService(creerCoffre().coffre).preparerCle();

    expect(resultat).toEqual({
      statut: 'refuse',
      message: 'Fichier trop volumineux pour une clé privée (plus de 64 Ko).',
    });
  });

  it('refuse un fichier illisible avec son code', async () => {
    lireFichierCle.mockResolvedValueOnce({ ok: false, code: 'ENOENT' });

    const resultat = await creerService(creerCoffre().coffre).preparerCle();

    expect(resultat).toEqual({
      statut: 'refuse',
      message: "Le fichier de clé n'a pas pu être lu (ENOENT).",
    });
  });

  it.each([
    [
      'PPK version 3',
      PPK_V3,
      'Clé au format PPK version 3, non prise en charge. Convertissez-la en version 2 avec PuTTYgen.',
    ],
    [
      'phrase secrète (PPK)',
      PPK_CHIFFREE,
      'Clé protégée par une phrase secrète, non prise en charge.',
    ],
    [
      'PKCS#8',
      `-----BEGIN PRIVATE KEY-----\n${CORPS_CLE}\n-----END PRIVATE KEY-----\n`,
      'Clé au format PKCS#8, non prise en charge. Exportez-la au format OpenSSH avec PuTTYgen (menu Conversions).',
    ],
    [
      'clé publique',
      `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAKE ${CORPS_CLE}\n`,
      'Ce fichier contient une clé publique. Choisissez le fichier de la clé privée.',
    ],
    [
      'type PPK ed25519',
      PPK_V2.replace('ssh-rsa', 'ssh-ed25519'),
      'Clé PPK de type ssh-ed25519, non prise en charge. Exportez-la au format OpenSSH avec PuTTYgen (menu Conversions).',
    ],
    [
      'fichier non reconnu',
      `${CORPS_CLE}\nrien d’une clé\n`,
      'Fichier non reconnu comme clé privée. Formats acceptés : PPK version 2 ou OpenSSH, sans phrase secrète.',
    ],
  ])(
    'refuse le format « %s » : message exact et ligne « Secret refusé »',
    async (_nom, texte, message) => {
      lireFichierCle.mockResolvedValueOnce({ ok: true, octets: octets(texte) });
      const faux = creerCoffre();

      const resultat = await creerService(faux.coffre).preparerCle();

      expect(resultat).toEqual({ statut: 'refuse', message });
      expect(faux.ecrire).not.toHaveBeenCalled();
      expect(lignes).toEqual([
        { niveau: 'ERREUR', message: `Secret refusé : ${DESIGNATION_CLE}. ${message}` },
      ]);
    },
  );

  it('refuse un fichier vide comme non reconnu', async () => {
    lireFichierCle.mockResolvedValueOnce({ ok: true, octets: new Uint8Array(0) });
    const resultat = await creerService(creerCoffre().coffre).preparerCle();
    expect(resultat).toMatchObject({ statut: 'refuse' });
    expect(lignes[0]?.niveau).toBe('ERREUR');
  });

  it.each([
    ['PPK version 2', PPK_V2, 'PPK version 2'],
    ['OpenSSH', OPENSSH, 'OpenSSH'],
    ['PEM (OpenSSH, ancien format)', PEM_RSA, 'PEM (OpenSSH, ancien format)'],
  ])(
    'prépare une clé %s : renvoie le libellé du format, rien au journal',
    async (_nom, texte, format) => {
      lireFichierCle.mockResolvedValueOnce({ ok: true, octets: octets(texte) });
      const faux = creerCoffre();

      const resultat = await creerService(faux.coffre).preparerCle();

      expect(resultat).toEqual({ statut: 'preparee', format });
      expect(lignes).toEqual([]);
      expect(faux.ecrire).not.toHaveBeenCalled();
    },
  );

  it('une seconde préparation remplace la première', async () => {
    const faux = creerCoffre();
    const service = creerService(faux.coffre);

    await service.preparerCle();
    lireFichierCle.mockResolvedValueOnce({ ok: true, octets: octets(OPENSSH) });
    expect(await service.preparerCle()).toEqual({ statut: 'preparee', format: 'OpenSSH' });

    await service.enregistrer(DEMANDE_CLE);

    expect(faux.ecritures).toEqual([{ [CLE]: { valeur: OPENSSH, date: DATE_FIXE } }]);
    expect(lignes).toEqual([
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_CLE} (OpenSSH)` },
    ]);
  });
});

// --- abandonnerCle() ---

describe('ServiceSecrets.abandonnerCle', () => {
  it('oublie la clé préparée : l’enregistrement demande de choisir le fichier', async () => {
    const faux = creerCoffre();
    const service = creerService(faux.coffre);

    await service.preparerCle();
    service.abandonnerCle();
    const resultat = await service.enregistrer(DEMANDE_CLE);

    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_CLE_NON_CHOISIE });
    expect(faux.lire).not.toHaveBeenCalled();
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });

  it('est sans effet quand aucune clé n’est préparée', async () => {
    const service = creerService(creerCoffre().coffre);
    expect(() => service.abandonnerCle()).not.toThrow();
  });
});

// --- enregistrer() : refus avant écriture ---

describe('ServiceSecrets.enregistrer — refus avant écriture', () => {
  it('refuse en développement : rien lu, rien au journal', async () => {
    const resultat = await creerService(null).enregistrer(demandeIga());
    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_DEV });
    expect(choisirFichierCle).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });

  it('refuse quand DPAPI est indisponible : ligne ERREUR, ni lecture ni écriture', async () => {
    const faux = creerCoffre({ indisponibilite: 'binaire absent' });
    const message = messageDpapi('binaire absent');

    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(resultat).toEqual({ statut: 'refuse', message });
    expect(faux.lire).not.toHaveBeenCalled();
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([
      { niveau: 'ERREUR', message: `Secrets non enregistrés : ${DESIGNATION_IGA}. ${message}` },
    ]);
  });

  it('refuse sans aucun changement demandé, sans lecture ni écriture', async () => {
    const faux = creerCoffre();

    const resultat = await creerService(faux.coffre).enregistrer({ motsDePasse: {}, cle: false });

    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_AUCUN_CHANGEMENT });
    expect(faux.lire).not.toHaveBeenCalled();
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([]);
  });

  it('refuse la clé demandée sans clé préparée', async () => {
    const faux = creerCoffre();

    const resultat = await creerService(faux.coffre).enregistrer(DEMANDE_CLE);

    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_CLE_NON_CHOISIE });
    expect(faux.ecrire).not.toHaveBeenCalled();
  });

  it('refuse quand la lecture du coffre échoue : ligne ERREUR, rien écrit', async () => {
    const faux = creerCoffre({ lecture: { etat: 'erreur', code: 'EIO' } });
    const message = messageLecture('EIO');

    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(resultat).toEqual({ statut: 'refuse', message });
    expect(faux.ecrire).not.toHaveBeenCalled();
    expect(lignes).toEqual([
      { niveau: 'ERREUR', message: `Secrets non enregistrés : ${DESIGNATION_IGA}. ${message}` },
    ]);
  });

  it('repart de zéro quand le fichier est illisible : ligne INFO, autres secrets perdus', async () => {
    const faux = creerCoffre({ lecture: { etat: 'illisible', cause: 'blob étranger' } });

    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(resultat.statut).toBe('enregistre');
    expect(faux.ecritures).toEqual([{ [IGA]: { valeur: TEMOIN_MDP, date: DATE_FIXE } }]);
    expect(lignes).toEqual([
      { niveau: 'INFO', message: LIGNE_INFO_ILLISIBLE },
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_IGA}` },
    ]);
  });
});

// --- enregistrer() : succès ---

describe('ServiceSecrets.enregistrer — succès', () => {
  it('écrit un mot de passe avec la date de l’horloge, puis relit l’état', async () => {
    const faux = creerCoffre();
    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(faux.ecritures).toEqual([{ [IGA]: { valeur: TEMOIN_MDP, date: DATE_FIXE } }]);
    expect(resultat).toEqual({
      statut: 'enregistre',
      etat: {
        source: 'secrets-bin',
        modifiable: true,
        anomalie: null,
        secrets: {
          [IGA]: { etat: 'renseigne', date: dateLocaleDe(DATE_FIXE) },
          [MSP]: { etat: 'non-renseigne' },
          [CLE]: { etat: 'non-renseigne' },
        },
      },
    });
  });

  it('deux mots de passe et la clé : UN SEUL ecrire, contenu exact, inconnus conservés', async () => {
    const faux = creerCoffre({
      lecture: {
        etat: 'lisible',
        secrets: { 'secret-futur': secretStocke('valeur-future', '2026-02-02T10:00:00.000Z') },
      },
    });
    const service = creerService(faux.coffre);
    await service.preparerCle();

    const resultat = await service.enregistrer({
      motsDePasse: { [IGA]: TEMOIN_MDP, [MSP]: 'valeur-msp' },
      cle: true,
    });

    expect(faux.ecrire).toHaveBeenCalledTimes(1);
    expect(faux.ecritures).toEqual([
      {
        'secret-futur': { valeur: 'valeur-future', date: '2026-02-02T10:00:00.000Z' },
        [IGA]: { valeur: TEMOIN_MDP, date: DATE_FIXE },
        [MSP]: { valeur: 'valeur-msp', date: DATE_FIXE },
        [CLE]: { valeur: PPK_V2, date: DATE_FIXE },
      },
    ]);
    expect(etatDe(resultat).secrets).toEqual({
      [IGA]: { etat: 'renseigne', date: dateLocaleDe(DATE_FIXE) },
      [MSP]: { etat: 'renseigne', date: dateLocaleDe(DATE_FIXE) },
      [CLE]: { etat: 'renseigne', date: dateLocaleDe(DATE_FIXE) },
    });
  });

  it('un seul mot de passe : les autres secrets existants sont conservés tels quels', async () => {
    const faux = creerCoffre({
      lecture: {
        etat: 'lisible',
        secrets: {
          [MSP]: secretStocke('valeur-msp', '2026-01-01T10:00:00.000Z'),
          [CLE]: secretStocke('ancienne-cle', '2026-01-02T10:00:00.000Z'),
        },
      },
    });

    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(faux.ecritures).toEqual([
      {
        [MSP]: { valeur: 'valeur-msp', date: '2026-01-01T10:00:00.000Z' },
        [CLE]: { valeur: 'ancienne-cle', date: '2026-01-02T10:00:00.000Z' },
        [IGA]: { valeur: TEMOIN_MDP, date: DATE_FIXE },
      },
    ]);
    expect(etatDe(resultat).secrets[MSP]).toEqual({
      etat: 'renseigne',
      date: dateLocaleDe('2026-01-01T10:00:00.000Z'),
    });
    expect(lignes).toEqual([
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_IGA}` },
    ]);
  });

  it('la clé seule : les mots de passe existants sont conservés', async () => {
    const faux = creerCoffre({
      lecture: { etat: 'lisible', secrets: { [IGA]: secretStocke('mdp-existant') } },
    });
    const service = creerService(faux.coffre);
    await service.preparerCle();

    await service.enregistrer(DEMANDE_CLE);

    expect(faux.ecritures).toEqual([
      {
        [IGA]: { valeur: 'mdp-existant', date: DATE_FIXE },
        [CLE]: { valeur: PPK_V2, date: DATE_FIXE },
      },
    ]);
  });

  it('journalise des lignes SUCCES dans l’ordre de SECRETS_TECHNIQUES, puis « remplacé »', async () => {
    const faux = creerCoffre();
    const service = creerService(faux.coffre);
    const demande: DemandeEnregistrementSecrets = {
      // Ordre de saisie inversé : l'ordre du journal suit SECRETS_TECHNIQUES
      motsDePasse: { [MSP]: 'valeur-msp', [IGA]: TEMOIN_MDP },
      cle: true,
    };

    await service.preparerCle();
    await service.enregistrer(demande);
    horloge = new Date('2026-11-02T14:00:00.000Z');
    await service.preparerCle();
    await service.enregistrer(demande);

    expect(lignes).toEqual([
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_IGA}` },
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_MSP}` },
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_CLE} (PPK version 2)` },
      { niveau: 'SUCCES', message: `Secret remplacé : ${DESIGNATION_IGA}` },
      { niveau: 'SUCCES', message: `Secret remplacé : ${DESIGNATION_MSP}` },
      { niveau: 'SUCCES', message: `Secret remplacé : ${DESIGNATION_CLE} (PPK version 2)` },
    ]);
    expect(faux.ecritures[1]?.[IGA]).toEqual({
      valeur: TEMOIN_MDP,
      date: '2026-11-02T14:00:00.000Z',
    });
  });

  it('le suffixe de la ligne de la clé suit son format', async () => {
    lireFichierCle.mockResolvedValueOnce({ ok: true, octets: octets(PEM_RSA) });
    const service = creerService(creerCoffre().coffre);
    await service.preparerCle();

    await service.enregistrer(DEMANDE_CLE);

    expect(lignes).toEqual([
      {
        niveau: 'SUCCES',
        message: `Secret renseigné : ${DESIGNATION_CLE} (PEM (OpenSSH, ancien format))`,
      },
    ]);
  });

  it('oublie la clé après un succès', async () => {
    const faux = creerCoffre();
    const service = creerService(faux.coffre);
    await service.preparerCle();
    expect((await service.enregistrer(DEMANDE_CLE)).statut).toBe('enregistre');

    const resultat = await service.enregistrer(DEMANDE_CLE);

    expect(resultat).toEqual({ statut: 'refuse', message: MESSAGE_CLE_NON_CHOISIE });
    expect(faux.ecrire).toHaveBeenCalledTimes(1);
  });

  it('n’ouvre pas le sélecteur de fichier pour un mot de passe', async () => {
    await creerService(creerCoffre().coffre).enregistrer(demandeIga());
    expect(choisirFichierCle).not.toHaveBeenCalled();
    expect(lireFichierCle).not.toHaveBeenCalled();
  });
});

// --- enregistrer() : annulation et échecs d'écriture ---

describe('ServiceSecrets.enregistrer — invite annulée', () => {
  it('renvoie « annulé », rien au journal', async () => {
    const faux = creerCoffre({ echecEcriture: { ok: false, raison: 'annule' } });

    const resultat = await creerService(faux.coffre).enregistrer(demandeIga());

    expect(resultat).toEqual({ statut: 'annule' });
    expect(faux.ecrire).toHaveBeenCalledTimes(1);
    expect(lignes).toEqual([]);
  });

  it('conserve la clé préparée : un second enregistrement la réutilise', async () => {
    const faux = creerCoffre({ echecEcriture: { ok: false, raison: 'annule' } });
    const service = creerService(faux.coffre);
    await service.preparerCle();

    expect(await service.enregistrer({ motsDePasse: { [IGA]: TEMOIN_MDP }, cle: true })).toEqual({
      statut: 'annule',
    });
    faux.definirEchec(undefined);
    const resultat = await service.enregistrer(DEMANDE_CLE);

    expect(resultat.statut).toBe('enregistre');
    expect(choisirFichierCle).toHaveBeenCalledTimes(1);
    expect(faux.ecritures.at(-1)).toEqual({ [CLE]: { valeur: PPK_V2, date: DATE_FIXE } });
    expect(lignes).toEqual([
      { niveau: 'SUCCES', message: `Secret renseigné : ${DESIGNATION_CLE} (PPK version 2)` },
    ]);
  });
});

describe('ServiceSecrets.enregistrer — échec d’écriture', () => {
  it.each([
    [
      { ok: false, raison: 'chiffrement', detail: 'DPAPI a échoué' } as const,
      'Le chiffrement Windows (DPAPI) a échoué : DPAPI a échoué.',
    ],
    [
      { ok: false, raison: 'elevation', detail: 'code 5' } as const,
      `L'écriture du fichier des secrets dans ${DOSSIER} a échoué (code 5).`,
    ],
    [
      { ok: false, raison: 'verification', detail: 'contenu différent' } as const,
      `Le fichier des secrets n'a pas été mis à jour dans ${DOSSIER} (contenu différent). Réessayez.`,
    ],
  ])(
    'échec %j : message exact et ligne ERREUR avec les désignations',
    async (echecEcriture, message) => {
      const faux = creerCoffre({ echecEcriture });
      const service = creerService(faux.coffre);
      await service.preparerCle();

      const resultat = await service.enregistrer({
        motsDePasse: { [MSP]: 'valeur-msp', [IGA]: TEMOIN_MDP },
        cle: true,
      });

      expect(resultat).toEqual({ statut: 'refuse', message });
      expect(lignes).toEqual([
        {
          niveau: 'ERREUR',
          message: `Secrets non enregistrés : ${DESIGNATION_IGA}, ${DESIGNATION_MSP}, ${DESIGNATION_CLE}. ${message}`,
        },
      ]);
    },
  );

  it('ne désigne dans la ligne que les secrets demandés', async () => {
    const faux = creerCoffre({
      echecEcriture: { ok: false, raison: 'elevation', detail: 'code 2' },
    });

    await creerService(faux.coffre).enregistrer({
      motsDePasse: { [MSP]: 'valeur-msp' },
      cle: false,
    });

    expect(lignes).toEqual([
      {
        niveau: 'ERREUR',
        message: `Secrets non enregistrés : ${DESIGNATION_MSP}. L'écriture du fichier des secrets dans ${DOSSIER} a échoué (code 2).`,
      },
    ]);
  });

  it('n’écrit aucune ligne de succès après un échec', async () => {
    const faux = creerCoffre({ echecEcriture: { ok: false, raison: 'elevation', detail: 'EIO' } });
    await creerService(faux.coffre).enregistrer(demandeIga());
    expect(lignes.every((l) => l.niveau === 'ERREUR')).toBe(true);
  });
});

// --- Sérialisation ---

describe('ServiceSecrets — écritures sérialisées', () => {
  it('deux enregistrements lancés sans attendre font deux écritures successives, sans perte', async () => {
    const faux = creerCoffre({ delaiMs: 15 });
    const service = creerService(faux.coffre);

    const [premier, second] = await Promise.all([
      service.enregistrer({ motsDePasse: { [IGA]: 'valeur-iga' }, cle: false }),
      service.enregistrer({ motsDePasse: { [MSP]: 'valeur-msp' }, cle: false }),
    ]);

    expect(premier.statut).toBe('enregistre');
    expect(second.statut).toBe('enregistre');
    expect(faux.ecrire).toHaveBeenCalledTimes(2);
    const contenu = faux.contenu();
    expect(contenu.etat).toBe('lisible');
    if (contenu.etat === 'lisible') {
      expect(contenu.secrets[IGA]?.valeur).toBe('valeur-iga');
      expect(contenu.secrets[MSP]?.valeur).toBe('valeur-msp');
    }
    // La seconde écriture part du contenu de la première
    expect(Object.keys(faux.ecritures[0] ?? {})).toEqual([IGA]);
    expect(Object.keys(faux.ecritures[1] ?? {}).sort()).toEqual([IGA, MSP].sort());
  });

  it('trois enregistrements simultanés se déroulent à la suite, sans entrelacement', async () => {
    const faux = creerCoffre({ delaiMs: 5 });
    const service = creerService(faux.coffre);

    await Promise.all([
      service.enregistrer({ motsDePasse: { [IGA]: 'a' }, cle: false }),
      service.enregistrer({ motsDePasse: { [MSP]: 'b' }, cle: false }),
      service.enregistrer({ motsDePasse: { [IGA]: 'c' }, cle: false }),
    ]);

    const contenu = faux.contenu();
    if (contenu.etat !== 'lisible') throw new Error('coffre non lisible');
    expect(contenu.secrets[IGA]?.valeur).toBe('c');
    expect(contenu.secrets[MSP]?.valeur).toBe('b');
    expect(lignes.map((l) => l.message)).toEqual([
      `Secret renseigné : ${DESIGNATION_IGA}`,
      `Secret renseigné : ${DESIGNATION_MSP}`,
      `Secret remplacé : ${DESIGNATION_IGA}`,
    ]);
  });

  it('un échec n’empêche pas l’enregistrement suivant', async () => {
    const faux = creerCoffre();
    faux.lire.mockRejectedValueOnce(new Error('exception inattendue'));
    const service = creerService(faux.coffre);

    const premier = service.enregistrer({ motsDePasse: { [IGA]: 'valeur-iga' }, cle: false });
    const second = service.enregistrer({ motsDePasse: { [MSP]: 'valeur-msp' }, cle: false });

    await expect(premier).rejects.toThrow('exception inattendue');
    expect((await second).statut).toBe('enregistre');
    expect(Object.keys(faux.ecritures.at(-1) ?? {})).toEqual([MSP]);
  });
});
