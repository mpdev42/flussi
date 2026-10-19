// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LigneJournalSession } from '@shared/types';
import { differe, monterHook, vider } from '@/test/dom';

const mocks = vi.hoisted(() => ({
  lireLignesSession: vi.fn<() => Promise<LigneJournalSession[]>>(),
  surLigneJournal: vi.fn<(rappel: (ligne: LigneJournalSession) => void) => () => void>(),
}));

vi.mock('@/services/journal', () => mocks);

const { fusionnerLignesSession, useJournalSession } = await import('./use-journal-session');

function creer(rang: number, message = `ligne ${rang}`): LigneJournalSession {
  return { rang, heure: '09:00:00', niveau: 'INFO', message };
}

let pousser: (ligne: LigneJournalSession) => void;
let desabonner: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  mocks.lireLignesSession.mockReset();
  mocks.surLigneJournal.mockReset();
  desabonner = vi.fn<() => void>();
  mocks.surLigneJournal.mockImplementation((rappel) => {
    pousser = rappel;
    return desabonner;
  });
});

describe('fusionnerLignesSession', () => {
  it('trie par rang et supprime les doublons', () => {
    const resultat = fusionnerLignesSession([creer(3), creer(1)], [creer(2), creer(3, 'doublon')]);
    expect(resultat.map((l) => l.rang)).toEqual([1, 2, 3]);
    expect(resultat[2]?.message).toBe('ligne 3');
  });
});

describe('useJournalSession', () => {
  it('renvoie un tableau vide au départ puis la lecture initiale', async () => {
    const lecture = differe<LigneJournalSession[]>();
    mocks.lireLignesSession.mockReturnValue(lecture.promesse);
    const monture = await monterHook(useJournalSession);
    expect(monture.lire()).toEqual([]);

    lecture.resoudre([creer(1), creer(2)]);
    await vider();

    expect(monture.lire().map((l) => l.rang)).toEqual([1, 2]);
    await monture.demonter();
  });

  it('s’abonne avant de lire', async () => {
    const ordre: string[] = [];
    mocks.surLigneJournal.mockImplementation(() => {
      ordre.push('abonnement');
      return desabonner;
    });
    mocks.lireLignesSession.mockImplementation(async () => {
      ordre.push('lecture');
      return [];
    });
    const monture = await monterHook(useJournalSession);

    expect(ordre).toEqual(['abonnement', 'lecture']);
    await monture.demonter();
  });

  it('ajoute les lignes poussées à la suite', async () => {
    mocks.lireLignesSession.mockResolvedValue([creer(1)]);
    const monture = await monterHook(useJournalSession);
    await vider();

    pousser(creer(2));
    await vider();
    pousser(creer(3));
    await vider();

    expect(monture.lire().map((l) => l.rang)).toEqual([1, 2, 3]);
    await monture.demonter();
  });

  it('ne duplique pas une ligne poussée pendant la lecture initiale', async () => {
    const lecture = differe<LigneJournalSession[]>();
    mocks.lireLignesSession.mockReturnValue(lecture.promesse);
    const monture = await monterHook(useJournalSession);

    pousser(creer(3));
    await vider();
    expect(monture.lire().map((l) => l.rang)).toEqual([3]);

    lecture.resoudre([creer(1), creer(2), creer(3)]);
    await vider();

    expect(monture.lire().map((l) => l.rang)).toEqual([1, 2, 3]);
    await monture.demonter();
  });

  it('garde les lignes poussées quand la lecture initiale échoue', async () => {
    const lecture = differe<LigneJournalSession[]>();
    mocks.lireLignesSession.mockReturnValue(lecture.promesse);
    const monture = await monterHook(useJournalSession);

    pousser(creer(4));
    lecture.rejeter(new Error('IPC en échec'));
    await vider();

    expect(monture.lire().map((l) => l.rang)).toEqual([4]);
    pousser(creer(5));
    await vider();
    expect(monture.lire().map((l) => l.rang)).toEqual([4, 5]);
    await monture.demonter();
  });

  it('se désabonne au démontage et ignore la lecture qui se termine ensuite', async () => {
    const lecture = differe<LigneJournalSession[]>();
    mocks.lireLignesSession.mockReturnValue(lecture.promesse);
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const monture = await monterHook(useJournalSession);
    const avant = monture.lire();

    await monture.demonter();
    expect(desabonner).toHaveBeenCalledTimes(1);

    lecture.resoudre([creer(1)]);
    pousser(creer(2));
    await vider();

    expect(monture.lire()).toBe(avant);
    expect(erreur).not.toHaveBeenCalled();
    erreur.mockRestore();
  });
});
