import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stockage } from '../../adapters/stockage';
import type { AnalyseAc056 } from '@shared/domain/ac056';
import {
  fichierSynthetique,
  lignesCompletes,
  lignesRejet,
  ligneSynthetique,
} from '@shared/test/ac056-synthetique';
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
let lignesJournal: [NiveauJournal, string][];
let ajouter: ReturnType<typeof vi.fn<(niveau: NiveauJournal, message: string) => Promise<void>>>;

function creerService() {
  return creerServiceAc056({ stockage: { lister, lire }, journal: { ajouter } });
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
