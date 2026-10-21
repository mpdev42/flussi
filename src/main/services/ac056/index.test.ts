import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stockage } from '../../adapters/stockage';
import type { AnalyseAc056 } from '@shared/domain/ac056';
import {
  enChaineBinaire,
  enOctetsBruts,
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
  ligneSynthetique,
} from '@shared/test/ac056-synthetique';
import { dansEvenement, ligne } from '@shared/test/controle-ac056';
import { nomFichierAc056Schema } from '@shared/schemas/ac056';
import type { NiveauJournal } from '@shared/schemas/journal';
import type { ElementStockage, ErreurStockage, ResultatStockage } from '@shared/types/stockage';

// L'analyse du domaine est réelle, sauf dans les tests qui fixent des nombres précis (messages du
// journal) : `analyserAc056` est alors remplacée une seule fois par un résultat contrôlé.
const analyseRemplacee = vi.hoisted(() => ({ valeur: null as unknown }));

vi.mock('@shared/domain/ac056', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@shared/domain/ac056')>();
  return {
    ...reel,
    analyserAc056: vi.fn((...args: Parameters<typeof reel.analyserAc056>) => {
      const remplacement = analyseRemplacee.valeur;
      analyseRemplacee.valeur = null;
      if (remplacement instanceof Error) throw remplacement;
      return remplacement ?? reel.analyserAc056(...args);
    }),
  };
});

const { creerServiceAc056 } = await import('./index');
const { analyserAc056 } = await import('@shared/domain/ac056');

// --- Faux stockage et faux journal ---

const fichier = (
  nom: string,
  taille: number | null = 100,
  modification: string | null = '2026-10-14T09:15:00.000Z',
): ElementStockage => ({ nom, type: 'fichier', copieConflitProbable: false, taille, modification });

const dossier = (nom: string): ElementStockage => ({
  nom,
  type: 'dossier',
  copieConflitProbable: false,
  taille: null,
  modification: null,
});

const erreurStockage = (
  code: ErreurStockage['code'],
  emplacement: ErreurStockage['emplacement'] = 'in',
): ErreurStockage => ({
  code,
  emplacement,
  chemin: 'P:\\Siege\\Service administratif\\Transferts\\IN\\secret.txt',
  message: 'cause sur \\\\serveur\\partage\\IN',
});

let contenus: { in: ElementStockage[]; out: ElementStockage[] };
let erreurs: { in: ErreurStockage | null; out: ErreurStockage | null };
let octets: Map<string, ResultatStockage<Uint8Array>>;
let lister: ReturnType<typeof vi.fn<Stockage['lister']>>;
let lire: ReturnType<typeof vi.fn<Stockage['lire']>>;
let ecrire: ReturnType<typeof vi.fn<Stockage['ecrire']>>;
let lignesJournal: [NiveauJournal, string][];
let ajouter: ReturnType<typeof vi.fn<(niveau: NiveauJournal, message: string) => Promise<void>>>;

function creerService() {
  return creerServiceAc056({ stockage: { lister, lire, ecrire }, journal: { ajouter } });
}

beforeEach(() => {
  vi.mocked(analyserAc056).mockClear();
  analyseRemplacee.valeur = null;
  contenus = { in: [], out: [] };
  erreurs = { in: null, out: null };
  octets = new Map();
  lister = vi.fn<Stockage['lister']>(async (emplacement) => {
    if (emplacement !== 'in' && emplacement !== 'out') throw new Error('emplacement inattendu');
    const erreur = erreurs[emplacement];
    return erreur ? { ok: false, erreur } : { ok: true, valeur: contenus[emplacement] };
  });
  lire = vi.fn<Stockage['lire']>(
    async (emplacement, chemin) =>
      octets.get(`${emplacement}/${chemin}`) ?? {
        ok: false,
        erreur: erreurStockage('introuvable'),
      },
  );
  // Le faux stockage garde ce qui est écrit : une lecture suivante le voit, `creer` n'écrase jamais
  ecrire = vi.fn<Stockage['ecrire']>(async (emplacement, chemin, contenu, mode) => {
    const cle = `${emplacement}/${chemin}`;
    if (mode === 'creer' && octets.has(cle)) return { ok: true, valeur: 'deja-present' };
    octets.set(cle, { ok: true, valeur: contenu });
    return { ok: true, valeur: 'ecrit' };
  });
  lignesJournal = [];
  ajouter = vi.fn(async (niveau: NiveauJournal, message: string) => {
    lignesJournal.push([niveau, message]);
  });
});

/** Dépose un fichier lisible dans le faux stockage. */
function deposer(emplacement: 'in' | 'out', nom: string, contenu: Uint8Array): void {
  octets.set(`${emplacement}/${nom}`, { ok: true, valeur: contenu });
}

const veosComplet = () => fichierSynthetique(lignesCompletes());

// --- lister ---

describe('creerServiceAc056 — lister', () => {
  it('ne garde que les fichiers .txt (casse indifférente), jamais un dossier', async () => {
    contenus.in = [
      fichier('a.txt'),
      fichier('B.TXT'),
      fichier('c.Txt'),
      fichier('notes.csv'),
      fichier('sans-extension'),
      fichier('d.txt.bak'),
      dossier('archive.txt'),
      dossier('sous'),
    ];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    expect(liste.in.map((f) => f.nom).sort()).toEqual(['B.TXT', 'a.txt', 'c.Txt']);
    expect(liste.out).toEqual([]);
  });

  it('ne liste pas un nom que le schéma d’ouverture refuserait, mais garde `a..txt`', async () => {
    contenus.in = [
      fichier('a..txt'),
      fichier('AC056COUR_20261014..txt'),
      fichier('avec\u007fdel.txt'),
      fichier('avec\u0001controle.txt'),
      fichier('guillemet".txt'),
      fichier('a'.repeat(252) + '.txt'),
      fichier('valide.txt'),
    ];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    expect(liste.in.map((f) => f.nom).sort()).toEqual([
      'AC056COUR_20261014..txt',
      'a..txt',
      'valide.txt',
    ]);
    // Tout fichier listé est ouvrable du point de vue du schéma
    for (const f of liste.in) expect(nomFichierAc056Schema.safeParse(f.nom).success).toBe(true);
  });

  it('liste IN et OUT, avec emplacement, taille et date', async () => {
    contenus.in = [fichier('a.txt', 1234, '2026-10-14T09:15:00.000Z')];
    contenus.out = [fichier('b.txt', null, null)];

    const liste = await creerService().lister();

    expect(liste).toEqual({
      ok: true,
      in: [
        {
          emplacement: 'in',
          nom: 'a.txt',
          taille: 1234,
          modification: '2026-10-14T09:15:00.000Z',
          provenance: 'veos',
        },
      ],
      out: [
        { emplacement: 'out', nom: 'b.txt', taille: null, modification: null, provenance: 'veos' },
      ],
    });
    // Taille et date sont demandées au stockage (coûteux : réservé à ce service)
    expect(lister).toHaveBeenCalledWith('in', '', { avecInfos: true });
    expect(lister).toHaveBeenCalledWith('out', '', { avecInfos: true });
  });

  it('trie du plus récent au plus ancien, la date inconnue en dernier, puis par nom', async () => {
    contenus.in = [
      fichier('sans-date-b.txt', 1, null),
      fichier('ancien.txt', 1, '2026-10-01T08:00:00.000Z'),
      fichier('sans-date-a.txt', 1, null),
      fichier('recent.txt', 1, '2026-10-14T09:15:00.000Z'),
      fichier('meme-date-b.txt', 1, '2026-10-10T10:00:00.000Z'),
      fichier('meme-date-a.txt', 1, '2026-10-10T10:00:00.000Z'),
    ];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    expect(liste.in.map((f) => f.nom)).toEqual([
      'recent.txt',
      'meme-date-a.txt',
      'meme-date-b.txt',
      'ancien.txt',
      'sans-date-a.txt',
      'sans-date-b.txt',
    ]);
  });

  it('trie chaque dossier séparément', async () => {
    contenus.in = [fichier('a.txt', 1, '2026-10-01T00:00:00.000Z')];
    contenus.out = [
      fichier('b.txt', 1, '2026-10-01T00:00:00.000Z'),
      fichier('c.txt', 1, '2026-10-02T00:00:00.000Z'),
    ];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    expect(liste.in.map((f) => f.nom)).toEqual(['a.txt']);
    expect(liste.out.map((f) => f.nom)).toEqual(['c.txt', 'b.txt']);
  });

  it('déduit la provenance du nom : un rejet peut être dans IN, un fichier VEOS dans OUT', async () => {
    contenus.in = [fichier('AC056COUR_REJ_20261014.txt'), fichier('AC056COUR_20261014.txt')];
    contenus.out = [fichier('AC056COUR_20261013.txt'), fichier('AC056COUR_REJ_20261013.txt')];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    const provenances = (fichiers: typeof liste.in) =>
      Object.fromEntries(fichiers.map((f) => [f.nom, f.provenance]));
    expect(provenances(liste.in)).toEqual({
      'AC056COUR_REJ_20261014.txt': 'rejet',
      'AC056COUR_20261014.txt': 'veos',
    });
    expect(provenances(liste.out)).toEqual({
      'AC056COUR_20261013.txt': 'veos',
      'AC056COUR_REJ_20261013.txt': 'rejet',
    });
  });

  it('reconnaît le préfixe de rejet en respectant la casse', async () => {
    contenus.in = [fichier('ac056cour_rej_20261014.txt')];

    const liste = await creerService().lister();

    if (!liste.ok) throw new Error('échec inattendu');
    expect(liste.in[0]?.provenance).toBe('veos');
  });

  it('renvoie deux listes vides pour deux dossiers vides', async () => {
    expect(await creerService().lister()).toEqual({ ok: true, in: [], out: [] });
  });

  it.each([
    ['IN', 'in'],
    ['OUT', 'out'],
  ] as const)('renvoie ok: false sans chemin quand %s est inaccessible', async (_nom, cle) => {
    erreurs[cle] = erreurStockage('lecteur-indisponible', cle);

    const liste = await creerService().lister();

    expect(liste.ok).toBe(false);
    if (liste.ok) return;
    expect(Object.keys(liste.erreur).sort()).toEqual(['code', 'message']);
    expect(liste.erreur.code).toBe('lecteur-indisponible');
    const texte = JSON.stringify(liste);
    expect(texte).not.toContain('P:');
    expect(texte).not.toContain('serveur');
    expect(texte).not.toContain('\\');
  });

  it('remonte l’erreur de IN quand IN et OUT sont tous deux inaccessibles', async () => {
    erreurs.in = erreurStockage('dossier-absent', 'in');
    erreurs.out = erreurStockage('acces-refuse', 'out');

    const liste = await creerService().lister();

    expect(liste).toMatchObject({ ok: false, erreur: { code: 'dossier-absent' } });
  });

  it.each([
    'lecteur-indisponible',
    'dossier-absent',
    'acces-refuse',
    'verrou',
    'introuvable',
    'chemin-refuse',
    'erreur-systeme',
  ] as const)(
    'fabrique pour %s un message sans chemin, jamais celui de l’adapter',
    async (code) => {
      erreurs.in = erreurStockage(code);

      const liste = await creerService().lister();

      if (liste.ok) throw new Error('succès inattendu');
      expect(liste.erreur.code).toBe(code);
      expect(liste.erreur.message.length).toBeGreaterThan(0);
      expect(liste.erreur.message).not.toMatch(/[\\/]|[A-Za-z]:/);
      expect(liste.erreur.message).not.toContain('cause sur');
    },
  );

  it('n’écrit rien au journal', async () => {
    contenus.in = [fichier('a.txt')];
    erreurs.out = erreurStockage('dossier-absent', 'out');

    await creerService().lister();
    erreurs.out = null;
    await creerService().lister();

    expect(ajouter).not.toHaveBeenCalled();
  });
});

// --- ouvrir : lecture, provenance, résultat ---

describe('creerServiceAc056 — ouvrir', () => {
  it('lit le fichier une seule fois et renvoie l’analyse du domaine', async () => {
    deposer('in', 'AC056COUR_20261014.txt', veosComplet());

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lire).toHaveBeenCalledTimes(1);
    expect(lire).toHaveBeenCalledWith('in', 'AC056COUR_20261014.txt');
    expect(analyserAc056).toHaveBeenCalledTimes(1);
    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat).toMatchObject({
      emplacement: 'in',
      nom: 'AC056COUR_20261014.txt',
      provenance: 'veos',
    });
    expect(resultat.analyse.fichier.provenance).toBe('veos');
    expect(resultat.analyse.erreurs).toBe(0);
    expect(resultat.analyse.fichier.lignes).toHaveLength(138);
  });

  it('analyse un fichier d’après le préfixe du nom, dans l’un ou l’autre dossier', async () => {
    deposer('out', 'AC056COUR_REJ_20261014.txt', fichierSynthetique(lignesRejet()));

    const resultat = await creerService().ouvrir('out', 'AC056COUR_REJ_20261014.txt');

    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.provenance).toBe('rejet');
    expect(resultat.analyse.fichier.provenance).toBe('rejet');
    expect(analyserAc056).toHaveBeenCalledWith(expect.any(Uint8Array), 'rejet');
  });

  it('renvoie le SHA-256 hexadécimal minuscule des octets lus', async () => {
    const contenu = veosComplet();
    deposer('in', 'a.txt', contenu);

    const resultat = await creerService().ouvrir('in', 'a.txt');

    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(resultat.empreinte).toBe(createHash('sha256').update(contenu).digest('hex'));
  });

  it('renvoie un résultat qui traverse l’IPC (clonage structuré)', async () => {
    deposer('in', 'a.txt', veosComplet());

    const resultat = await creerService().ouvrir('in', 'a.txt');

    expect(() => structuredClone(resultat)).not.toThrow();
  });

  it('ne lit que le fichier demandé et n’appelle ni lister ni écriture', async () => {
    deposer('in', 'a.txt', veosComplet());

    await creerService().ouvrir('in', 'a.txt');

    expect(lister).not.toHaveBeenCalled();
    expect(lire).toHaveBeenCalledTimes(1);
    expect(ecrire).not.toHaveBeenCalled();
  });
});

// --- ouvrir : journal ---

describe('creerServiceAc056 — ouvrir, journal', () => {
  /** Remplace la prochaine analyse par un résultat aux nombres choisis. */
  function analyseDe(nombres: Partial<AnalyseAc056>): void {
    analyseRemplacee.valeur = {
      fichier: { provenance: 'veos', lignes: [] },
      anomalies: [],
      erreurs: 0,
      nonBloquantes: 0,
      structure: 0,
      lignesRejetees: 0,
      ...nombres,
    };
  }

  beforeEach(() => {
    deposer('in', 'AC056COUR_20261014.txt', new Uint8Array(0));
    deposer('in', 'AC056COUR_REJ_20261014.txt', new Uint8Array(0));
  });

  it('trace « Charger » (TITRE) avant le résultat', async () => {
    analyseDe({});

    await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal[0]).toEqual(['TITRE', 'Charger']);
  });

  it('n’attend jamais l’écriture du journal : un journal qui ne répond pas ne bloque rien', async () => {
    // Faux journal dont l'écriture ne se termine jamais
    ajouter.mockImplementation(() => new Promise<void>(() => undefined));
    analyseDe({ erreurs: 2, structure: 1 });

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    // « Charger » est écrit avant la lecture, qui a quand même lieu ; le résultat arrive
    expect(lire).toHaveBeenCalledTimes(1);
    expect(ajouter).toHaveBeenNthCalledWith(1, 'TITRE', 'Charger');
    expect(ajouter).toHaveBeenCalledTimes(3);
    expect(resultat.ok).toBe(true);
  });

  it('n’attend pas non plus le journal quand la lecture échoue', async () => {
    ajouter.mockImplementation(() => new Promise<void>(() => undefined));

    const resultat = await creerService().ouvrir('out', 'absent.txt');

    expect(resultat).toMatchObject({ ok: false, erreur: { code: 'introuvable' } });
    expect(ajouter).toHaveBeenCalledTimes(2);
  });

  it('n’attend pas non plus le journal quand l’analyse lève une exception', async () => {
    ajouter.mockImplementation(() => new Promise<void>(() => undefined));
    analyseRemplacee.valeur = new Error('exception');

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(resultat).toMatchObject({ ok: false, erreur: { code: 'erreur-systeme' } });
    expect(ajouter).toHaveBeenCalledTimes(2);
  });

  it('fichier vide : une seule ERREUR « illisible », ni « chargé » ni « mal formé »', async () => {
    // Analyse réelle du domaine sur un fichier de zéro octet
    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['ERREUR', 'Fichier AC056COUR_20261014.txt illisible : fichier vide'],
    ]);
    // L'écran reçoit quand même l'analyse, qu'il sait présenter
    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.analyse.anomalies.map((a) => a.code)).toContain('fichier-vide');
  });

  it('fichier de rejet vide : même ERREUR « illisible »', async () => {
    await creerService().ouvrir('in', 'AC056COUR_REJ_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['ERREUR', 'Fichier AC056COUR_REJ_20261014.txt illisible : fichier vide'],
    ]);
  });

  it('fichier vide : aucune autre ligne même si l’analyse compte une erreur de structure', async () => {
    analyseDe({
      erreurs: 1,
      structure: 1,
      anomalies: [{ code: 'fichier-vide', ligne: null, bloquante: true, message: 'vide' }] as never,
    });

    await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal.map(([niveau]) => niveau)).toEqual(['TITRE', 'ERREUR']);
  });

  it.each([
    [0, 'aucune erreur'],
    [1, '1 erreur'],
    [2, '2 erreurs'],
    [147, '147 erreurs'],
  ])('fichier VEOS avec %i erreur(s) bloquante(s)', async (erreurs, texte) => {
    analyseDe({ erreurs });

    await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['SUCCES', `Fichier AC056COUR_20261014.txt chargé : ${texte}`],
    ]);
  });

  it.each([
    [1, 0, 'aucune erreur, 1 anomalie non bloquante'],
    [2, 1, '1 erreur, 2 anomalies non bloquantes'],
    [5, 3, '3 erreurs, 5 anomalies non bloquantes'],
  ])(
    'fichier VEOS avec %i anomalie(s) non bloquante(s) et %i erreur(s)',
    async (nonBloquantes, erreurs, texte) => {
      analyseDe({ erreurs, nonBloquantes });

      await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

      expect(lignesJournal[1]).toEqual([
        'SUCCES',
        `Fichier AC056COUR_20261014.txt chargé : ${texte}`,
      ]);
    },
  );

  it.each([
    [0, 'aucune ligne rejetée'],
    [1, '1 ligne rejetée'],
    [2, '2 lignes rejetées'],
    [312, '312 lignes rejetées'],
  ])('fichier de rejet avec %i ligne(s) rejetée(s)', async (lignesRejetees, texte) => {
    // Les erreurs et anomalies d'un rejet ne sont jamais citées
    analyseDe({
      lignesRejetees,
      nonBloquantes: 4,
      fichier: { provenance: 'rejet', lignes: [] } as never,
    });

    await creerService().ouvrir('in', 'AC056COUR_REJ_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['SUCCES', `Fichier AC056COUR_REJ_20261014.txt chargé : ${texte}`],
    ]);
  });

  it('fichier VEOS mal formé : ajoute une ERREUR après le résultat', async () => {
    analyseDe({ erreurs: 3, structure: 2 });

    await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['SUCCES', 'Fichier AC056COUR_20261014.txt chargé : 3 erreurs'],
      ['ERREUR', "Fichier AC056COUR_20261014.txt mal formé : relancez l'export VEOS"],
    ]);
  });

  it('ne signale pas « mal formé » pour un fichier de rejet', async () => {
    analyseDe({ structure: 2, lignesRejetees: 1 });

    await creerService().ouvrir('in', 'AC056COUR_REJ_20261014.txt');

    expect(lignesJournal.map(([niveau]) => niveau)).toEqual(['TITRE', 'SUCCES']);
  });

  it('échec de lecture : ERREUR sans chemin, ok: false, pas d’analyse', async () => {
    lire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage('verrou') });

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(analyserAc056).not.toHaveBeenCalled();
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(Object.keys(resultat.erreur).sort()).toEqual(['code', 'message']);
    expect(resultat.erreur.code).toBe('verrou');
    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['ERREUR', `Fichier AC056COUR_20261014.txt non chargé : ${resultat.erreur.message}`],
    ]);
    const texte = JSON.stringify([resultat, lignesJournal]);
    expect(texte).not.toContain('P:');
    expect(texte).not.toContain('serveur');
    expect(texte).not.toContain('cause sur');
  });

  it('fichier absent : message « fichier introuvable »', async () => {
    const resultat = await creerService().ouvrir('out', 'absent.txt');

    expect(resultat).toEqual({
      ok: false,
      erreur: { code: 'introuvable', message: 'fichier introuvable' },
    });
    expect(lignesJournal[1]).toEqual([
      'ERREUR',
      'Fichier absent.txt non chargé : fichier introuvable',
    ]);
  });

  it('exception inattendue de l’analyse : ERREUR fixe, jamais le message de l’exception', async () => {
    analyseRemplacee.valeur = new Error('ligne 12 : DUPONT Jean 1850175123456');

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(resultat).toEqual({
      ok: false,
      erreur: { code: 'erreur-systeme', message: "erreur inattendue à l'analyse du fichier" },
    });
    expect(JSON.stringify([resultat, lignesJournal])).not.toContain('DUPONT');
    expect(lignesJournal.map(([niveau]) => niveau)).toEqual(['TITRE', 'ERREUR']);
  });
});

// --- ouvrir : fichiers synthétiques réels ---

describe('creerServiceAc056 — ouvrir, fichiers synthétiques', () => {
  const SENTINELLE = 'SENTINELLEZORG';

  it('fichier VEOS conforme : « aucune erreur »', async () => {
    deposer('in', 'AC056COUR_20261014.txt', veosComplet());

    await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['SUCCES', 'Fichier AC056COUR_20261014.txt chargé : aucune erreur'],
    ]);
  });

  it('fichier VEOS avec une ligne tronquée : erreurs, « mal formé » et aucune valeur au journal', async () => {
    const lignes = lignesCompletes();
    const indice = lignes.findIndex((l) => l.slice(22, 25) === '405');
    lignes[indice] = ligneSynthetique('405', { nom: SENTINELLE }).slice(0, 300);
    lignes[indice + 20] = ligneSynthetique('405', { nom: SENTINELLE, prenom1: SENTINELLE });
    deposer('in', 'AC056COUR_20261014.txt', fichierSynthetique(lignes));

    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');

    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.analyse.erreurs).toBeGreaterThan(0);
    expect(resultat.analyse.structure).toBeGreaterThan(0);
    expect(lignesJournal.map(([niveau]) => niveau)).toEqual(['TITRE', 'SUCCES', 'ERREUR']);
    expect(lignesJournal[2]?.[1]).toBe(
      "Fichier AC056COUR_20261014.txt mal formé : relancez l'export VEOS",
    );
    // Le résultat envoyé à l'écran porte les valeurs, pas le journal
    expect(JSON.stringify(resultat)).toContain(SENTINELLE);
    expect(JSON.stringify(lignesJournal)).not.toContain(SENTINELLE);
    expect(JSON.stringify(lignesJournal)).not.toContain('DUPONT');
  });

  it('fichier de rejet synthétique : nombre de lignes rejetées, aucune valeur au journal', async () => {
    const lignes = lignesRejet({
      message: (_code, indice) => (indice < 3 ? `Rejet ${SENTINELLE}` : undefined),
    });
    deposer('in', 'AC056COUR_REJ_20261014.txt', fichierSynthetique(lignes));

    const resultat = await creerService().ouvrir('in', 'AC056COUR_REJ_20261014.txt');

    if (!resultat.ok) throw new Error('échec inattendu');
    expect(resultat.analyse.lignesRejetees).toBe(3);
    expect(lignesJournal).toEqual([
      ['TITRE', 'Charger'],
      ['SUCCES', 'Fichier AC056COUR_REJ_20261014.txt chargé : 3 lignes rejetées'],
    ]);
    expect(JSON.stringify(lignesJournal)).not.toContain(SENTINELLE);
  });

  it('charge un fichier de 4 Mo (environ 5 500 lignes) sans bloquer', async () => {
    const lignes = lignesCompletes({ dossiers: 80 });
    expect(lignes.length).toBeGreaterThan(5000);
    deposer('in', 'AC056COUR_20261014.txt', fichierSynthetique(lignes));

    const debut = performance.now();
    const resultat = await creerService().ouvrir('in', 'AC056COUR_20261014.txt');
    const duree = performance.now() - debut;

    expect(resultat.ok).toBe(true);
    // Marge large : environ 300 ms mesurées, la limite visée est la seconde
    expect(duree).toBeLessThan(2000);
  });
});

// --- enregistrer ---

describe('creerServiceAc056 — enregistrer', () => {
  const SENTINELLE = 'SENTINELLEZORG';
  const NOM = 'AC056COUR_20261014.txt';
  const COMPLET = lignesCompletes({ dossiers: 1 });
  const ORIGINAL = fichierSynthetique(COMPLET);
  const EMPREINTE = createHash('sha256').update(ORIGINAL).digest('hex');
  const N405 = COMPLET.findIndex((l) => l.slice(22, 25) === '405') + 1;

  const sha256 = (contenu: Uint8Array) => createHash('sha256').update(contenu).digest('hex');
  const octetsDe = (cle: string): Uint8Array => {
    const entree = octets.get(cle);
    if (!entree?.ok) throw new Error(`fichier absent : ${cle}`);
    return entree.valeur;
  };

  function demande(
    corrections: { ligne: number; champ: string; texte: string }[],
    options: { emplacement?: 'in' | 'out'; nom?: string; empreinte?: string } = {},
  ) {
    return {
      emplacement: options.emplacement ?? ('in' as const),
      nom: options.nom ?? NOM,
      empreinte: options.empreinte ?? EMPREINTE,
      corrections,
    };
  }

  const correctionNom = (texte = 'MARTIN') => ({ ligne: N405, champ: 'nom', texte });

  beforeEach(() => {
    deposer('in', NOM, ORIGINAL);
  });

  describe('chemin nominal', () => {
    it('copie l’original, remplace le fichier et trace chaque étape dans l’ordre', async () => {
      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      if (!resultat.ok) throw new Error(`échec inattendu : ${resultat.erreur.message}`);
      expect(resultat).toMatchObject({ ecrit: true, champsModifies: 1, copieOriginal: true });
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['INFO', `Original de ${NOM} copié dans IN\\Originaux`],
        ['SUCCES', `Fichier ${NOM} enregistré : 1 champ modifié`],
      ]);
    });

    it('lit le fichier une fois, écrit d’abord la copie (creer) puis le fichier (remplacer)', async () => {
      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      expect(lire).toHaveBeenCalledTimes(1);
      expect(lire).toHaveBeenCalledWith('in', NOM);
      expect(ecrire).toHaveBeenCalledTimes(2);
      expect(ecrire.mock.calls[0]).toEqual(['in', `Originaux/${NOM}`, ORIGINAL, 'creer']);
      expect(ecrire.mock.calls[1]?.slice(0, 2)).toEqual(['in', NOM]);
      expect(ecrire.mock.calls[1]?.[3]).toBe('remplacer');
      // La copie garde les octets d'origine, le fichier porte la correction
      expect(octetsDe(`in/Originaux/${NOM}`)).toEqual(ORIGINAL);
      const ecrits = octetsDe(`in/${NOM}`);
      expect(ecrits).not.toEqual(ORIGINAL);
      if (!resultat.ok) throw new Error('échec inattendu');
      expect(resultat.empreinte).toMatch(/^[0-9a-f]{64}$/);
      expect(resultat.empreinte).toBe(sha256(ecrits));
      expect(resultat.analyse.erreurs).toBe(0);
    });

    it('un fichier de OUT est copié dans OUT\\Originaux', async () => {
      deposer('out', NOM, ORIGINAL);

      await creerService().enregistrer(demande([correctionNom()], { emplacement: 'out' }));

      expect(ecrire.mock.calls[0]?.slice(0, 2)).toEqual(['out', `Originaux/${NOM}`]);
      expect(lignesJournal[1]).toEqual(['INFO', `Original de ${NOM} copié dans OUT\\Originaux`]);
    });

    it('ne copie l’original qu’une fois : au second enregistrement, aucune ligne de copie', async () => {
      const service = creerService();
      const premier = await service.enregistrer(demande([correctionNom('MARTIN')]));
      if (!premier.ok) throw new Error('échec inattendu');
      lignesJournal.length = 0;

      const second = await service.enregistrer(
        demande([correctionNom('DURAND')], { empreinte: premier.empreinte }),
      );

      // La copie du premier enregistrement existe déjà : celui-ci n'en écrit pas
      expect(second).toMatchObject({ ok: true, ecrit: true, copieOriginal: false });
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['SUCCES', `Fichier ${NOM} enregistré : 1 champ modifié`],
      ]);
      // La copie garde la version reçue de VEOS
      expect(octetsDe(`in/Originaux/${NOM}`)).toEqual(ORIGINAL);
    });

    it('compte les erreurs restantes du fichier écrit (enregistrement possible malgré elles)', async () => {
      // « # » est un caractère non autorisé : une erreur bloquante reste après la correction
      const resultat = await creerService().enregistrer(demande([correctionNom('D#PONT')]));

      expect(resultat).toMatchObject({ ok: true, ecrit: true, analyse: { erreurs: 1 } });
      expect(lignesJournal.at(-1)).toEqual([
        'SUCCES',
        `Fichier ${NOM} enregistré : 1 champ modifié, 1 erreur restante`,
      ]);
    });

    it('met « erreurs restantes » au pluriel', async () => {
      const [, seconde] = COMPLET.flatMap((l, i) => (l.slice(22, 25) === '405' ? [i + 1] : []));
      const resultat = await creerService().enregistrer(
        demande([correctionNom('D#PONT'), { ligne: seconde ?? 0, champ: 'nom', texte: 'D#RAND' }]),
      );

      expect(resultat).toMatchObject({ ok: true, analyse: { erreurs: 2 } });
      expect(lignesJournal.at(-1)).toEqual([
        'SUCCES',
        `Fichier ${NOM} enregistré : 2 champs modifiés, 2 erreurs restantes`,
      ]);
    });

    it('« aucun champ modifié » quand seuls des défauts de forme sont corrigés', async () => {
      const avecDefauts = [...COMPLET];
      avecDefauts.splice(3, 0, '');
      const lu = fichierSynthetique(avecDefauts);
      deposer('in', NOM, lu);

      const resultat = await creerService().enregistrer(demande([], { empreinte: sha256(lu) }));

      expect(resultat).toMatchObject({ ok: true, ecrit: true, champsModifies: 0 });
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['INFO', `Original de ${NOM} copié dans IN\\Originaux`],
        ['INFO', `Fichier ${NOM} : 1 ligne vide supprimée`],
        ['SUCCES', `Fichier ${NOM} enregistré : aucun champ modifié`],
      ]);
    });

    it('trace les lignes vides (pluriel) et le Ctrl-Z final supprimés, avant le succès', async () => {
      const avecDefauts = [...COMPLET];
      avecDefauts.splice(3, 0, '');
      avecDefauts.splice(1, 0, '');
      const lu = enOctetsBruts(`${enChaineBinaire(fichierSynthetique(avecDefauts))}\x1A`);
      deposer('in', NOM, lu);

      // Les lignes vides décalent les numéros du fichier lu : deux avant la ligne 405
      await creerService().enregistrer(
        demande([{ ligne: N405 + 2, champ: 'nom', texte: 'MARTIN' }], { empreinte: sha256(lu) }),
      );

      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['INFO', `Original de ${NOM} copié dans IN\\Originaux`],
        ['INFO', `Fichier ${NOM} : 2 lignes vides supprimées`],
        ['INFO', `Fichier ${NOM} : caractère de fin de fichier (Ctrl-Z) supprimé`],
        ['SUCCES', `Fichier ${NOM} enregistré : 1 champ modifié`],
      ]);
    });

    it('fichier identique : rien n’est écrit, ni copie ni remplacement', async () => {
      const resultat = await creerService().enregistrer(demande([]));

      expect(ecrire).not.toHaveBeenCalled();
      expect(resultat).toMatchObject({
        ok: true,
        ecrit: false,
        empreinte: EMPREINTE,
        champsModifies: 0,
        copieOriginal: false,
      });
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['INFO', `Fichier ${NOM} déjà à jour : rien à enregistrer`],
      ]);
    });

    it('renvoie un résultat qui traverse l’IPC (clonage structuré)', async () => {
      const ecrit = await creerService().enregistrer(demande([correctionNom()]));
      const identique = await creerService().enregistrer(demande([]));
      const refuse = await creerService().enregistrer(demande([], { empreinte: 'f'.repeat(64) }));

      for (const resultat of [ecrit, identique, refuse]) {
        expect(() => structuredClone(resultat)).not.toThrow();
      }
    });
  });

  describe('refus', () => {
    it('empreinte différente : fichier-modifie, rien d’écrit', async () => {
      const resultat = await creerService().enregistrer(
        demande([correctionNom()], { empreinte: 'b'.repeat(64) }),
      );

      const cause =
        'le fichier a changé depuis son ouverture : rechargez-le puis refaites les corrections';
      expect(resultat).toEqual({ ok: false, erreur: { code: 'fichier-modifie', message: cause } });
      expect(ecrire).not.toHaveBeenCalled();
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['ERREUR', `Fichier ${NOM} non enregistré : ${cause}`],
      ]);
    });

    it('fichier mal formé : fichier-mal-forme, rien d’écrit', async () => {
      const mal = fichierSynthetique(dansEvenement(ligne('110'), ligne('110')));
      deposer('in', NOM, mal);

      const resultat = await creerService().enregistrer(demande([], { empreinte: sha256(mal) }));

      expect(resultat).toEqual({
        ok: false,
        erreur: {
          code: 'fichier-mal-forme',
          message: "fichier mal formé : relancez l'export VEOS",
        },
      });
      expect(ecrire).not.toHaveBeenCalled();
      expect(lignesJournal[1]).toEqual([
        'ERREUR',
        `Fichier ${NOM} non enregistré : fichier mal formé : relancez l'export VEOS`,
      ]);
    });

    it('fichier de rejet : fichier-rejet, rien d’écrit', async () => {
      const nomRejet = 'AC056COUR_REJ_20261014.txt';
      const rejet = fichierSynthetique(lignesRejet({ dossiers: 1 }));
      deposer('in', nomRejet, rejet);

      const resultat = await creerService().enregistrer(
        demande([], { nom: nomRejet, empreinte: sha256(rejet) }),
      );

      expect(resultat).toEqual({
        ok: false,
        erreur: { code: 'fichier-rejet', message: 'un fichier de rejet est en lecture seule' },
      });
      expect(ecrire).not.toHaveBeenCalled();
      expect(lignesJournal[1]).toEqual([
        'ERREUR',
        `Fichier ${nomRejet} non enregistré : un fichier de rejet est en lecture seule`,
      ]);
    });

    it('correction refusée par le domaine : correction-refusee, sans citer la valeur', async () => {
      const resultat = await creerService().enregistrer(
        demande([{ ligne: N405, champ: 'nom', texte: `${SENTINELLE}\n` }]),
      );

      const cause = "une correction n'a pas pu être appliquée : rechargez le fichier";
      expect(resultat).toEqual({
        ok: false,
        erreur: { code: 'correction-refusee', message: cause },
      });
      expect(ecrire).not.toHaveBeenCalled();
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['ERREUR', `Fichier ${NOM} non enregistré : ${cause}`],
      ]);
    });

    it('lecture impossible : erreur du stockage, sans chemin', async () => {
      lire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage('verrou') });

      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      if (resultat.ok) throw new Error('succès inattendu');
      expect(resultat.erreur.code).toBe('verrou');
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['ERREUR', `Fichier ${NOM} non enregistré : ${resultat.erreur.message}`],
      ]);
      expect(ecrire).not.toHaveBeenCalled();
    });

    it('fichier disparu : introuvable', async () => {
      const resultat = await creerService().enregistrer(demande([], { nom: 'absent.txt' }));

      expect(resultat).toEqual({
        ok: false,
        erreur: { code: 'introuvable', message: 'fichier introuvable' },
      });
    });
  });

  describe('échecs d’écriture', () => {
    it('échec de la copie : erreur, le fichier n’est pas remplacé', async () => {
      ecrire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage('acces-refuse') });

      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      if (resultat.ok) throw new Error('succès inattendu');
      expect(resultat.erreur.code).toBe('acces-refuse');
      expect(ecrire).toHaveBeenCalledTimes(1);
      expect(octetsDe(`in/${NOM}`)).toEqual(ORIGINAL);
      expect(octets.has(`in/Originaux/${NOM}`)).toBe(false);
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['ERREUR', `Fichier ${NOM} non enregistré : ${resultat.erreur.message}`],
      ]);
    });

    it('échec du remplacement : copie présente, erreur, aucun succès', async () => {
      ecrire.mockImplementationOnce(async (emplacement, chemin, contenu) => {
        octets.set(`${emplacement}/${chemin}`, { ok: true, valeur: contenu });
        return { ok: true, valeur: 'ecrit' };
      });
      ecrire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage('verrou') });

      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      if (resultat.ok) throw new Error('succès inattendu');
      expect(resultat.erreur.code).toBe('verrou');
      expect(octetsDe(`in/Originaux/${NOM}`)).toEqual(ORIGINAL);
      expect(octetsDe(`in/${NOM}`)).toEqual(ORIGINAL);
      expect(lignesJournal.map(([niveau]) => niveau)).toEqual(['TITRE', 'INFO', 'ERREUR']);
      expect(lignesJournal[2]).toEqual([
        'ERREUR',
        `Fichier ${NOM} non enregistré : ${resultat.erreur.message}`,
      ]);
    });

    it('exception inattendue : erreur-systeme sans le message de l’exception, verrou libéré', async () => {
      const service = creerService();
      const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});
      lire.mockResolvedValueOnce({ ok: true, valeur: null as never });

      const resultat = await service.enregistrer(demande([correctionNom()]));

      expect(resultat).toEqual({
        ok: false,
        erreur: { code: 'erreur-systeme', message: 'erreur système inattendue' },
      });
      // Console : le seul nom de l'exception, jamais son message
      expect(console_).toHaveBeenCalledTimes(1);
      expect(console_.mock.calls[0]).toEqual([expect.stringContaining('[ac056]'), 'TypeError']);
      console_.mockRestore();
      expect(lignesJournal).toEqual([
        ['TITRE', 'Enregistrer'],
        ['ERREUR', `Fichier ${NOM} non enregistré : erreur système inattendue`],
      ]);
      // Le service peut enregistrer à nouveau
      expect(await service.enregistrer(demande([]))).toMatchObject({ ok: true });
    });

    it.each([
      'lecteur-indisponible',
      'dossier-absent',
      'acces-refuse',
      'verrou',
      'introuvable',
      'chemin-refuse',
      'erreur-systeme',
    ] as const)('cause %s : message fixe, sans chemin ni texte de l’adapter', async (code) => {
      ecrire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage(code) });

      const resultat = await creerService().enregistrer(demande([correctionNom()]));

      if (resultat.ok) throw new Error('succès inattendu');
      expect(resultat.erreur.code).toBe(code);
      expect(resultat.erreur.message).not.toMatch(/[\\/]|[A-Za-z]:/);
      expect(JSON.stringify([resultat, lignesJournal])).not.toContain('cause sur');
      expect(JSON.stringify([resultat, lignesJournal])).not.toContain('serveur');
    });
  });

  describe('un seul enregistrement à la fois', () => {
    /** Bloque la prochaine lecture jusqu'à `liberer()`. */
    function bloquerLecture(): { liberer: () => void } {
      let liberer = () => {};
      const barriere = new Promise<void>((resolve) => {
        liberer = resolve;
      });
      const reel = lire.getMockImplementation();
      lire.mockImplementationOnce(async (emplacement, chemin) => {
        await barriere;
        if (!reel) throw new Error('lecture simulée absente');
        return reel(emplacement, chemin);
      });
      return { liberer };
    }

    it('refuse un appel concurrent sans rien écrire ni tracer', async () => {
      const service = creerService();
      const barriere = bloquerLecture();

      const premier = service.enregistrer(demande([correctionNom()]));
      const second = await service.enregistrer(demande([correctionNom('DURAND')]));

      expect(second).toEqual({
        ok: false,
        erreur: {
          code: 'enregistrement-en-cours',
          message: 'un enregistrement est déjà en cours',
        },
      });
      expect(lignesJournal).toEqual([['TITRE', 'Enregistrer']]);
      expect(ecrire).not.toHaveBeenCalled();

      barriere.liberer();
      expect(await premier).toMatchObject({ ok: true, ecrit: true });
      // Une fois terminé, le service accepte à nouveau (ici : empreinte périmée, refus normal)
      expect(await service.enregistrer(demande([]))).toMatchObject({
        ok: false,
        erreur: { code: 'fichier-modifie' },
      });
    });

    it('attendreEnregistrement se résout tout de suite quand rien n’est en cours', async () => {
      await expect(creerService().attendreEnregistrement()).resolves.toBeUndefined();
    });

    it('attendreEnregistrement attend la fin de l’enregistrement', async () => {
      const service = creerService();
      const barriere = bloquerLecture();
      let terminee = false;

      const enregistrement = service.enregistrer(demande([correctionNom()]));
      const apres = service.attendreEnregistrement().then(() => {
        terminee = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(terminee).toBe(false);

      barriere.liberer();
      await apres;
      // Le fichier est déjà remplacé quand l'attente se résout
      expect(octetsDe(`in/${NOM}`)).not.toEqual(ORIGINAL);
      expect(await enregistrement).toMatchObject({ ok: true });
    });

    it('attendreEnregistrement ne rejette pas quand l’enregistrement échoue', async () => {
      const service = creerService();
      const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});
      lire.mockResolvedValueOnce({ ok: true, valeur: null as never });

      const enregistrement = service.enregistrer(demande([]));

      await expect(service.attendreEnregistrement()).resolves.toBeUndefined();
      expect(await enregistrement).toMatchObject({ ok: false });
      console_.mockRestore();
    });
  });

  describe('fichier modifié (fermeture)', () => {
    it('est vide au départ', () => {
      expect(creerService().fichierModifie()).toBeNull();
    });

    it('garde le nom du fichier signalé, puis l’oublie sur null', () => {
      const service = creerService();

      service.signalerModifications({ emplacement: 'in', nom: NOM });
      expect(service.fichierModifie()).toBe(NOM);

      service.signalerModifications(null);
      expect(service.fichierModifie()).toBeNull();
    });

    it('est remis à null par un enregistrement réussi de ce fichier', async () => {
      const service = creerService();
      service.signalerModifications({ emplacement: 'in', nom: NOM });

      await service.enregistrer(demande([correctionNom()]));

      expect(service.fichierModifie()).toBeNull();
    });

    it('est remis à null aussi quand le fichier est déjà à jour (rien à écrire)', async () => {
      const service = creerService();
      service.signalerModifications({ emplacement: 'in', nom: NOM });

      const resultat = await service.enregistrer(demande([]));

      expect(resultat).toMatchObject({ ok: true, ecrit: false });
      expect(service.fichierModifie()).toBeNull();
    });

    it('reste signalé après un échec', async () => {
      const service = creerService();
      service.signalerModifications({ emplacement: 'in', nom: NOM });

      await service.enregistrer(demande([correctionNom()], { empreinte: 'b'.repeat(64) }));

      expect(service.fichierModifie()).toBe(NOM);
    });

    it('reste signalé quand l’enregistrement concerne le même nom dans l’autre dossier', async () => {
      const service = creerService();
      service.signalerModifications({ emplacement: 'out', nom: NOM });

      await service.enregistrer(demande([correctionNom()]));

      expect(service.fichierModifie()).toBe(NOM);
    });
  });

  describe('données personnelles', () => {
    it('aucune valeur AC056 ni chemin dans le journal ni dans les messages d’erreur', async () => {
      const lignes = lignesCompletes({ dossiers: 1 });
      lignes[N405 - 1] = ligneSynthetique('405', { nom: SENTINELLE, prenom1: SENTINELLE });
      const lu = fichierSynthetique(lignes);
      deposer('in', NOM, lu);
      const empreinte = sha256(lu);
      const service = creerService();

      const ecrit = await service.enregistrer(
        demande([{ ligne: N405, champ: 'nom', texte: `${SENTINELLE}2` }], { empreinte }),
      );
      const refusee = await service.enregistrer(
        demande([{ ligne: N405, champ: 'rang', texte: SENTINELLE }], { empreinte }),
      );
      ecrire.mockResolvedValueOnce({ ok: false, erreur: erreurStockage('acces-refuse') });
      const echecEcriture = await service.enregistrer(
        demande([{ ligne: N405, champ: 'nom', texte: `${SENTINELLE}3` }], {
          empreinte: ecrit.ok ? ecrit.empreinte : empreinte,
        }),
      );

      expect(ecrit.ok).toBe(true);
      expect(refusee.ok).toBe(false);
      expect(echecEcriture.ok).toBe(false);
      const sortieJournal = JSON.stringify(lignesJournal);
      expect(sortieJournal).not.toContain(SENTINELLE);
      expect(sortieJournal).not.toContain('P:');
      expect(sortieJournal).not.toContain('serveur');
      // Les messages d'erreur renvoyés à l'écran ne citent aucune valeur non plus
      expect(JSON.stringify([refusee, echecEcriture])).not.toContain(SENTINELLE);
      expect(JSON.stringify([refusee, echecEcriture])).not.toContain('serveur');
    });
  });
});
