import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DossierTravail } from '@shared/types';
import { creerServiceParametres } from './index';

// Chemins fictifs
const DOSSIERS = {
  travail: 'D:\\Travail\\Flussi',
  in: 'D:\\Travail\\Flussi\\IN',
  out: 'D:\\Travail\\Flussi\\OUT',
  journal: 'D:\\Travail\\Flussi\\Journal',
};

let ouvrirChemin: ReturnType<typeof vi.fn<(chemin: string) => Promise<string>>>;

function creer() {
  return creerServiceParametres({ dossiers: DOSSIERS, ouvrirChemin });
}

beforeEach(() => {
  ouvrirChemin = vi.fn<(chemin: string) => Promise<string>>(async () => '');
});

describe('ServiceParametres.ouvrirDossier — chemin transmis', () => {
  it.each<[DossierTravail, string]>([
    ['travail', DOSSIERS.travail],
    ['in', DOSSIERS.in],
    ['out', DOSSIERS.out],
    ['journal', DOSSIERS.journal],
  ])('transmet le chemin du dossier %s à ouvrirChemin, une seule fois', async (dossier, chemin) => {
    await creer().ouvrirDossier(dossier);
    expect(ouvrirChemin).toHaveBeenCalledTimes(1);
    expect(ouvrirChemin).toHaveBeenCalledWith(chemin);
  });
});

describe('ServiceParametres.ouvrirDossier — succès', () => {
  it('renvoie { ok: true } quand ouvrirChemin renvoie une chaîne vide', async () => {
    expect(await creer().ouvrirDossier('in')).toEqual({ ok: true });
  });
});

describe('ServiceParametres.ouvrirDossier — échec', () => {
  it.each<[DossierTravail, string, string]>([
    ['travail', DOSSIERS.travail, 'de travail'],
    ['in', DOSSIERS.in, 'IN'],
    ['out', DOSSIERS.out, 'OUT'],
    ['journal', DOSSIERS.journal, 'Journal'],
  ])(
    'renvoie ok: false avec la désignation, le chemin et la cause (%s)',
    async (dossier, chemin, designation) => {
      ouvrirChemin.mockResolvedValueOnce('Accès refusé');

      const resultat = await creer().ouvrirDossier(dossier);

      expect(resultat).toEqual({
        ok: false,
        message: `Dossier ${designation} (${chemin}) : Accès refusé`,
      });
    },
  );

  it('renvoie ok: false quand la promesse est rejetée, sans lever', async () => {
    ouvrirChemin.mockRejectedValueOnce(new Error('Échec simulé'));

    const resultat = await creer().ouvrirDossier('out');

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.message).toContain('OUT');
      expect(resultat.message).toContain(DOSSIERS.out);
      expect(resultat.message).toContain('Échec simulé');
    }
  });

  it('accepte un rejet qui n’est pas une Error', async () => {
    ouvrirChemin.mockRejectedValueOnce('cause en texte');

    const resultat = await creer().ouvrirDossier('journal');

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.message).toContain('cause en texte');
  });

  it('renvoie ok: false quand ouvrirChemin lève de façon synchrone, sans lever', async () => {
    ouvrirChemin.mockImplementationOnce(() => {
      throw new Error('Exception synchrone');
    });

    const resultat = await creer().ouvrirDossier('travail');

    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.message).toContain('Exception synchrone');
  });

  it('ne lève jamais, quelle que soit la cause', async () => {
    const service = creer();
    for (const reponse of ['message', new Error('rejet')]) {
      if (typeof reponse === 'string') ouvrirChemin.mockResolvedValueOnce(reponse);
      else ouvrirChemin.mockRejectedValueOnce(reponse);
      await expect(service.ouvrirDossier('in')).resolves.toMatchObject({ ok: false });
    }
  });
});
