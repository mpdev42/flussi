import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stockage } from '../../adapters/stockage';
import type { EtatJournal } from '@shared/types/journal';
import type { ErreurStockage, ResultatStockage } from '@shared/types/stockage';
import { creerSessionJournal } from './session';

// Faux Stockage : seul `ajouter` sert. Il enregistre les écritures réussies (le contenu du fichier
// est la concaténation des ajouts) et peut échouer à la demande, par un résultat ou une exception.

const DEBUT = new Date(2026, 9, 4, 9, 5, 7);
const CHEMIN = '2026/10/20261004-090507-c.mathevon.txt';

type Panne = 'resultat' | 'exception' | null;

interface Ajout {
  emplacement: string;
  chemin: string;
  texte: string;
}

const ERREUR: ErreurStockage = {
  code: 'verrou',
  emplacement: 'journal',
  chemin: 'P:\\Journal',
  message: 'fichier verrouillé',
};

function creerFauxStockage() {
  /** Ajouts réussis. */
  const ajouts: Ajout[] = [];
  /** Tous les appels, réussis ou non. */
  let appels = 0;
  const controle: { panne: Panne; delaiMs: number } = { panne: null, delaiMs: 0 };

  const stockage: Stockage = {
    verifierAcces: () => Promise.reject(new Error('non utilisé')),
    lister: () => Promise.reject(new Error('non utilisé')),
    lire: () => Promise.reject(new Error('non utilisé')),
    async ajouter(emplacement, chemin, octets): Promise<ResultatStockage<void>> {
      appels++;
      if (controle.delaiMs > 0) await new Promise((r) => setTimeout(r, controle.delaiMs));
      if (controle.panne === 'exception') throw new Error('exception inattendue');
      if (controle.panne === 'resultat') return { ok: false, erreur: ERREUR };
      ajouts.push({ emplacement, chemin, texte: new TextDecoder().decode(octets) });
      return { ok: true, valeur: undefined };
    },
  };

  return {
    stockage,
    ajouts,
    controle,
    nombreAppels: () => appels,
    /** Contenu du fichier tel qu'il serait sur le disque. */
    contenu: () => ajouts.map((a) => a.texte).join(''),
    lignes: () =>
      ajouts
        .map((a) => a.texte)
        .join('')
        .split('\r\n')
        .filter((l) => l !== ''),
  };
}

let faux: ReturnType<typeof creerFauxStockage>;
let horloge: Date;

function creerSession() {
  return creerSessionJournal({
    stockage: faux.stockage,
    maintenant: () => horloge,
    compte: 'c.mathevon',
    poste: 'PC042',
    mode: 'recette',
    version: '0.2.0',
  });
}

/** Ligne attendue à l'heure de l'horloge de test (09:05:07). */
const ligne = (niveau: string, message: string): string => `09:05:07\t${niveau}\t${message}`;

const ENTETE = [
  ligne('TITRE', 'Début de session le 04/10/2026 à 09:05:07'),
  ligne('INFO', 'Compte Windows : c.mathevon'),
  ligne('INFO', 'Poste : PC042'),
  ligne('INFO', 'Mode : recette'),
  ligne('INFO', 'Version de Flussi : 0.2.0'),
];

beforeEach(() => {
  faux = creerFauxStockage();
  horloge = DEBUT;
});

describe('creerSessionJournal — chemin', () => {
  it('construit le chemin avec l’heure de création et le compte nettoyé', () => {
    expect(creerSession().chemin).toBe(CHEMIN);
  });

  it('fige le chemin même si l’horloge avance', () => {
    const session = creerSession();
    horloge = new Date(2027, 0, 1, 0, 0, 0);
    expect(session.chemin).toBe(CHEMIN);
  });

  it('n’écrit rien à la création', () => {
    creerSession();
    expect(faux.nombreAppels()).toBe(0);
  });
});

describe('creerSessionJournal — ouvrir', () => {
  it('écrit les 5 lignes d’en-tête en un seul ajout dans journal', async () => {
    const session = creerSession();

    expect(await session.ouvrir()).toEqual({ ok: true, valeur: undefined });

    expect(faux.ajouts).toHaveLength(1);
    expect(faux.ajouts[0]?.emplacement).toBe('journal');
    expect(faux.ajouts[0]?.chemin).toBe(CHEMIN);
    expect(faux.lignes()).toEqual(ENTETE);
    expect(faux.contenu().endsWith('\r\n')).toBe(true);
  });

  it('ne contient que les champs prévus dans l’en-tête', async () => {
    await creerSession().ouvrir();
    const contenu = faux.contenu();
    expect(contenu.match(/\r\n/g)).toHaveLength(5);
    expect(contenu).not.toMatch(/mot de passe|password|secret|cle|clé/i);
  });

  it('renvoie l’erreur typée du stockage et garde l’en-tête en attente', async () => {
    faux.controle.panne = 'resultat';
    const session = creerSession();

    expect(await session.ouvrir()).toEqual({ ok: false, erreur: ERREUR });
    expect(session.etat()).toEqual({ enregistre: false, lignesEnAttente: 5 });
    expect(faux.ajouts).toEqual([]);
  });

  it('réessayée après un échec, écrit l’en-tête une seule fois, sous le même nom', async () => {
    faux.controle.panne = 'resultat';
    const session = creerSession();
    const chemin = session.chemin;
    await session.ouvrir();

    faux.controle.panne = null;
    horloge = new Date(2026, 9, 4, 9, 30, 0);
    expect(await session.ouvrir()).toEqual({ ok: true, valeur: undefined });

    expect(faux.lignes()).toEqual(ENTETE);
    expect(faux.ajouts).toHaveLength(1);
    expect(faux.ajouts[0]?.chemin).toBe(chemin);
    expect(session.chemin).toBe(chemin);
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('rappelée après un succès, n’écrit pas l’en-tête une seconde fois', async () => {
    const session = creerSession();
    await session.ouvrir();
    await session.ouvrir();
    expect(faux.lignes()).toEqual(ENTETE);
  });

  it('convertit une exception du stockage en erreur typée sans rejeter', async () => {
    faux.controle.panne = 'exception';
    const session = creerSession();

    const resultat = await session.ouvrir();

    expect(resultat).toMatchObject({
      ok: false,
      erreur: { code: 'erreur-systeme', emplacement: 'journal', message: 'exception inattendue' },
    });
    expect(session.etat()).toEqual({ enregistre: false, lignesEnAttente: 5 });
  });
});

describe('creerSessionJournal — ajouter', () => {
  it('écrit la ligne horodatée avec l’horloge injectée', async () => {
    const session = creerSession();
    await session.ouvrir();
    horloge = new Date(2026, 9, 4, 10, 0, 1);

    await session.ajouter('SUCCES', 'Fichier déposé');

    expect(faux.lignes().at(-1)).toBe('10:00:01\tSUCCES\tFichier déposé');
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('garde l’ordre même quand les appels sont lancés sans await', async () => {
    const session = creerSession();
    await session.ouvrir();

    const attentes = [
      session.ajouter('INFO', 'un'),
      session.ajouter('INFO', 'deux'),
      session.ajouter('ERREUR', 'trois'),
      session.ajouter('INFO', 'quatre'),
    ];
    await Promise.all(attentes);

    expect(faux.lignes().slice(5)).toEqual([
      ligne('INFO', 'un'),
      ligne('INFO', 'deux'),
      ligne('ERREUR', 'trois'),
      ligne('INFO', 'quatre'),
    ]);
  });

  it('garde l’ordre avec un stockage lent et des appels lancés pendant l’écriture', async () => {
    faux.controle.delaiMs = 5;
    const session = creerSession();
    const attentes: Promise<unknown>[] = [session.ouvrir()];
    attentes.push(session.ajouter('INFO', 'un'));
    attentes.push(session.ajouter('INFO', 'deux'));
    await new Promise((r) => setTimeout(r, 2));
    attentes.push(session.ajouter('INFO', 'trois'));
    await Promise.all(attentes);

    expect(faux.lignes()).toEqual([
      ...ENTETE,
      ligne('INFO', 'un'),
      ligne('INFO', 'deux'),
      ligne('INFO', 'trois'),
    ]);
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('enregistre la ligne à l’appel, avant toute écriture, sans attendre la promesse', async () => {
    // Stockage lent : l'écriture ne se termine que lorsque le test libère la promesse
    let liberer: () => void = () => undefined;
    const attente = new Promise<void>((resolve) => {
      liberer = resolve;
    });
    const stockage: Stockage = {
      ...faux.stockage,
      async ajouter(emplacement, chemin, octets) {
        await attente;
        return faux.stockage.ajouter(emplacement, chemin, octets);
      },
    };
    const session = creerSessionJournal({
      stockage,
      maintenant: () => horloge,
      compte: 'c.mathevon',
      poste: 'PC042',
      mode: 'recette',
      version: '0.2.0',
    });
    const recues: number[] = [];
    session.surLigne((l) => recues.push(l.rang));

    const a = session.ajouter('INFO', 'A');
    const b = session.ajouter('INFO', 'B');

    // Rien n'est encore écrit, mais les lignes sont déjà là, dans l'ordre
    expect(faux.nombreAppels()).toBe(0);
    expect(session.lignes().map((l) => [l.rang, l.message])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ]);
    expect(recues).toEqual([1, 2]);

    liberer();
    await Promise.all([a, b]);

    expect(faux.lignes()).toEqual([ligne('INFO', 'A'), ligne('INFO', 'B')]);
  });

  it('remplace \\r, \\n et \\t du message par une espace', async () => {
    const session = creerSession();
    await session.ajouter('INFO', 'a\r\nb\tc');
    expect(faux.contenu()).toBe(`${ligne('INFO', 'a  b c')}\r\n`);
  });

  it('en cas d’échec, passe à enregistre false avec le nombre de lignes en attente', async () => {
    const session = creerSession();
    await session.ouvrir();
    faux.controle.panne = 'resultat';

    await session.ajouter('INFO', 'un');
    expect(session.etat()).toEqual({ enregistre: false, lignesEnAttente: 1 });

    await session.ajouter('INFO', 'deux');
    expect(session.etat()).toEqual({ enregistre: false, lignesEnAttente: 2 });
  });

  it('réécrit toutes les lignes en attente, dans l’ordre, à l’ajout suivant réussi', async () => {
    const session = creerSession();
    await session.ouvrir();
    faux.controle.panne = 'resultat';
    await session.ajouter('INFO', 'un');
    await session.ajouter('ERREUR', 'deux');
    expect(faux.lignes()).toEqual(ENTETE);

    faux.controle.panne = null;
    await session.ajouter('SUCCES', 'trois');

    expect(faux.lignes()).toEqual([
      ...ENTETE,
      ligne('INFO', 'un'),
      ligne('ERREUR', 'deux'),
      ligne('SUCCES', 'trois'),
    ]);
    // Les lignes en attente et la nouvelle partent en un seul ajout
    expect(faux.ajouts).toHaveLength(2);
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('n’écrit aucune ligne deux fois après plusieurs échecs puis un succès', async () => {
    const session = creerSession();
    faux.controle.panne = 'resultat';
    await session.ouvrir();
    await session.ajouter('INFO', 'un');
    faux.controle.panne = null;
    await session.ajouter('INFO', 'deux');

    const lignes = faux.lignes();
    expect(new Set(lignes).size).toBe(lignes.length);
    expect(lignes).toHaveLength(7);
  });

  it('ne rejette jamais quand le stockage renvoie une erreur', async () => {
    faux.controle.panne = 'resultat';
    const session = creerSession();
    await expect(session.ajouter('INFO', 'x')).resolves.toBeUndefined();
  });

  it('ne rejette jamais quand le stockage lève une exception', async () => {
    faux.controle.panne = 'exception';
    const session = creerSession();
    await expect(session.ajouter('INFO', 'x')).resolves.toBeUndefined();
    expect(session.etat()).toEqual({ enregistre: false, lignesEnAttente: 1 });
  });

  it('se rétablit après une exception du stockage', async () => {
    const session = creerSession();
    faux.controle.panne = 'exception';
    await session.ajouter('INFO', 'un');
    faux.controle.panne = null;
    await session.ajouter('INFO', 'deux');
    expect(faux.lignes()).toEqual([ligne('INFO', 'un'), ligne('INFO', 'deux')]);
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });
});

describe('creerSessionJournal — surChangement', () => {
  it('notifie le passage en échec puis le retour à la normale', async () => {
    const session = creerSession();
    const rappel = vi.fn<(etat: EtatJournal) => void>();
    session.surChangement(rappel);
    await session.ouvrir();

    faux.controle.panne = 'resultat';
    await session.ajouter('INFO', 'un');
    expect(rappel).toHaveBeenCalledTimes(1);
    expect(rappel).toHaveBeenLastCalledWith({ enregistre: false, lignesEnAttente: 1 });

    faux.controle.panne = null;
    await session.ajouter('INFO', 'deux');
    expect(rappel).toHaveBeenCalledTimes(2);
    expect(rappel).toHaveBeenLastCalledWith({ enregistre: true, lignesEnAttente: 0 });
  });

  it('ne notifie pas tant que l’état ne change pas', async () => {
    const session = creerSession();
    const rappel = vi.fn();
    session.surChangement(rappel);

    await session.ouvrir();
    await session.ajouter('INFO', 'un');
    await session.ajouter('INFO', 'deux');

    expect(rappel).not.toHaveBeenCalled();
  });

  it('notifie quand le nombre de lignes en attente change pendant l’échec', async () => {
    const session = creerSession();
    const etats: EtatJournal[] = [];
    session.surChangement((etat) => etats.push(etat));
    faux.controle.panne = 'resultat';

    await session.ajouter('INFO', 'un');
    await session.ajouter('INFO', 'deux');

    expect(etats).toEqual([
      { enregistre: false, lignesEnAttente: 1 },
      { enregistre: false, lignesEnAttente: 2 },
    ]);
  });

  it('ne notifie pas un échec répété qui laisse l’état identique', async () => {
    const session = creerSession();
    const rappel = vi.fn();
    session.surChangement(rappel);
    faux.controle.panne = 'resultat';
    await session.ouvrir();
    expect(rappel).toHaveBeenCalledTimes(1);

    await session.ouvrir();
    expect(rappel).toHaveBeenCalledTimes(1);
  });

  it('ne notifie plus après le désabonnement', async () => {
    const session = creerSession();
    const rappel = vi.fn();
    const desabonner = session.surChangement(rappel);
    desabonner();

    faux.controle.panne = 'resultat';
    await session.ajouter('INFO', 'un');

    expect(rappel).not.toHaveBeenCalled();
  });

  it('notifie chaque abonné et laisse passer un écouteur qui lève une exception', async () => {
    const session = creerSession();
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const casse = vi.fn(() => {
      throw new Error('écouteur cassé');
    });
    const sain = vi.fn();
    session.surChangement(casse);
    session.surChangement(sain);
    faux.controle.panne = 'resultat';

    await expect(session.ajouter('INFO', 'un')).resolves.toBeUndefined();

    expect(casse).toHaveBeenCalledTimes(1);
    expect(sain).toHaveBeenCalledTimes(1);
    erreur.mockRestore();
  });
});

describe('creerSessionJournal — terminer', () => {
  it('écrit « Fin de session » et renvoie ok', async () => {
    const session = creerSession();
    await session.ouvrir();
    horloge = new Date(2026, 9, 4, 18, 0, 0);

    expect(await session.terminer()).toEqual({ ok: true });

    expect(faux.lignes().at(-1)).toBe('18:00:00\tTITRE\tFin de session');
    expect(session.etat()).toEqual({ enregistre: true, lignesEnAttente: 0 });
  });

  it('écrit aussi les lignes encore en attente, avant la fin de session', async () => {
    const session = creerSession();
    faux.controle.panne = 'resultat';
    await session.ouvrir();
    await session.ajouter('INFO', 'un');
    faux.controle.panne = null;

    expect(await session.terminer()).toEqual({ ok: true });

    expect(faux.lignes()).toEqual([
      ...ENTETE,
      ligne('INFO', 'un'),
      ligne('TITRE', 'Fin de session'),
    ]);
  });

  it('renvoie l’erreur et le nombre exact de lignes perdues en cas d’échec', async () => {
    const session = creerSession();
    await session.ouvrir();
    faux.controle.panne = 'resultat';
    await session.ajouter('INFO', 'un');
    await session.ajouter('INFO', 'deux');

    const resultat = await session.terminer();

    // deux lignes en attente plus « Fin de session »
    expect(resultat).toEqual({ ok: false, erreur: ERREUR, lignesPerdues: 3 });
  });

  it('compte l’en-tête dans les lignes perdues quand ouvrir n’a jamais réussi', async () => {
    faux.controle.panne = 'resultat';
    const session = creerSession();
    await session.ouvrir();

    expect(await session.terminer()).toEqual({ ok: false, erreur: ERREUR, lignesPerdues: 6 });
  });

  it('réessayée après un échec, n’ajoute pas « Fin de session » deux fois', async () => {
    const session = creerSession();
    await session.ouvrir();
    faux.controle.panne = 'resultat';
    const premier = await session.terminer();
    const deuxieme = await session.terminer();
    expect(premier).toMatchObject({ ok: false, lignesPerdues: 1 });
    expect(deuxieme).toMatchObject({ ok: false, lignesPerdues: 1 });

    faux.controle.panne = null;
    expect(await session.terminer()).toEqual({ ok: true });

    const fins = faux.lignes().filter((l) => l.endsWith('\tTITRE\tFin de session'));
    expect(fins).toHaveLength(1);
    expect(faux.lignes().at(-1)).toBe(ligne('TITRE', 'Fin de session'));
  });

  it('rappelée après un succès, n’écrit rien de plus', async () => {
    const session = creerSession();
    await session.ouvrir();
    await session.terminer();
    const avant = faux.contenu();

    expect(await session.terminer()).toEqual({ ok: true });

    expect(faux.contenu()).toBe(avant);
  });

  it('convertit une exception du stockage en échec typé sans rejeter', async () => {
    const session = creerSession();
    await session.ouvrir();
    faux.controle.panne = 'exception';

    const resultat = await session.terminer();

    expect(resultat).toMatchObject({
      ok: false,
      erreur: { code: 'erreur-systeme' },
      lignesPerdues: 1,
    });
  });

  it('ignore un ajout après une fin de session réussie', async () => {
    const session = creerSession();
    await session.ouvrir();
    await session.terminer();
    const avant = faux.contenu();
    const appels = faux.nombreAppels();

    await session.ajouter('INFO', 'trop tard');

    expect(faux.contenu()).toBe(avant);
    expect(faux.nombreAppels()).toBe(appels);
    expect(faux.contenu()).not.toContain('trop tard');
  });
});

describe('creerSessionJournal — lignes et surLigne', () => {
  it('ne contient aucune ligne avant tout ajout, en-tête exclu', async () => {
    const session = creerSession();
    expect(session.lignes()).toEqual([]);

    await session.ouvrir();

    expect(session.lignes()).toEqual([]);
  });

  it('mémorise chaque ajout avec son rang (à partir de 1) et l’heure écrite', async () => {
    const session = creerSession();
    await session.ouvrir();
    await session.ajouter('INFO', 'premier');
    horloge = new Date(2026, 9, 4, 9, 6, 30);
    await session.ajouter('SUCCES', 'second');

    expect(session.lignes()).toEqual([
      { rang: 1, heure: '09:05:07', niveau: 'INFO', message: 'premier' },
      { rang: 2, heure: '09:06:30', niveau: 'SUCCES', message: 'second' },
    ]);
    expect(faux.lignes().slice(-1)).toEqual(['09:06:30\tSUCCES\tsecond']);
  });

  it('affiche le même message nettoyé que celui écrit dans le fichier', async () => {
    const session = creerSession();
    await session.ajouter('INFO', 'a\r\nb\tc');

    expect(session.lignes()[0]?.message).toBe('a  b c');
    expect(faux.lignes().at(-1)).toBe(ligne('INFO', 'a  b c'));
  });

  it('renvoie une copie : modifier le résultat ne change pas la session', async () => {
    const session = creerSession();
    await session.ajouter('INFO', 'x');
    (session.lignes() as unknown[]).pop();

    expect(session.lignes()).toHaveLength(1);
  });

  it('appelle le rappel à chaque nouvelle ligne, dans l’ordre', async () => {
    const session = creerSession();
    const recues: number[] = [];
    session.surLigne((l) => recues.push(l.rang));

    await session.ajouter('INFO', 'a');
    await session.ajouter('INFO', 'b');

    expect(recues).toEqual([1, 2]);
  });

  it('n’appelle plus le rappel après le désabonnement', async () => {
    const session = creerSession();
    const rappel = vi.fn();
    const desabonner = session.surLigne(rappel);
    await session.ajouter('INFO', 'a');
    desabonner();
    await session.ajouter('INFO', 'b');

    expect(rappel).toHaveBeenCalledTimes(1);
  });

  it('laisse passer un écouteur qui lève une exception', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const session = creerSession();
    const autre = vi.fn();
    session.surLigne(() => {
      throw new Error('écouteur défaillant');
    });
    session.surLigne(autre);

    await session.ajouter('INFO', 'a');

    expect(autre).toHaveBeenCalledTimes(1);
    expect(faux.lignes().at(-1)).toBe(ligne('INFO', 'a'));
    erreur.mockRestore();
  });

  it('garde les lignes en mémoire même quand l’écriture échoue, sans doublon au rétablissement', async () => {
    const session = creerSession();
    const rappel = vi.fn();
    session.surLigne(rappel);
    faux.controle.panne = 'resultat';
    await session.ajouter('ERREUR', 'non écrite');
    expect(session.etat().enregistre).toBe(false);
    expect(session.lignes().map((l) => l.rang)).toEqual([1]);

    faux.controle.panne = null;
    await session.ajouter('INFO', 'suivante');

    expect(session.lignes().map((l) => l.rang)).toEqual([1, 2]);
    expect(rappel).toHaveBeenCalledTimes(2);
  });

  it('garde les lignes quand le stockage lève une exception', async () => {
    const session = creerSession();
    faux.controle.panne = 'exception';
    await session.ajouter('INFO', 'a');

    expect(session.lignes()).toEqual([
      { rang: 1, heure: '09:05:07', niveau: 'INFO', message: 'a' },
    ]);
  });

  it('inclut « Fin de session » avec l’heure de la fin', async () => {
    const session = creerSession();
    await session.ouvrir();
    await session.ajouter('INFO', 'a');
    horloge = new Date(2026, 9, 4, 18, 0, 0);
    const rappel = vi.fn();
    session.surLigne(rappel);

    await session.terminer();

    expect(session.lignes().at(-1)).toEqual({
      rang: 2,
      heure: '18:00:00',
      niveau: 'TITRE',
      message: 'Fin de session',
    });
    expect(rappel).toHaveBeenCalledTimes(1);
  });

  it('ne mémorise « Fin de session » qu’une fois après un échec puis une nouvelle tentative', async () => {
    const session = creerSession();
    faux.controle.panne = 'resultat';
    await session.terminer();
    faux.controle.panne = null;
    await session.terminer();

    expect(session.lignes().filter((l) => l.message === 'Fin de session')).toHaveLength(1);
  });

  it('ne mémorise rien après une fin de session réussie', async () => {
    const session = creerSession();
    await session.terminer();
    const rappel = vi.fn();
    session.surLigne(rappel);

    await session.ajouter('INFO', 'trop tard');

    expect(session.lignes().map((l) => l.message)).toEqual(['Fin de session']);
    expect(rappel).not.toHaveBeenCalled();
  });
});
