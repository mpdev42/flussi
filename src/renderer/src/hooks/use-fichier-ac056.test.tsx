// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OuvertureAc056 } from '@shared/types';
import { NOM_REJET, NOM_VEOS, ouvertureReussie } from '@/test/ac056';
import { differe, monterHook, vider, type MontureHook } from '@/test/dom';
import { MESSAGE_ECHEC_OUVERTURE, useFichierAc056, type FichierAc056 } from './use-fichier-ac056';

// Service simulé : aucun appel à window.api
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
}));

import { ouvrirFichierAc056 } from '@/services/ac056';

const CIBLE = { emplacement: 'in', nom: NOM_VEOS } as const;

let hook: MontureHook<FichierAc056> | null = null;

async function monterFichier(): Promise<MontureHook<FichierAc056>> {
  hook = await monterHook(useFichierAc056);
  return hook;
}

afterEach(async () => {
  await hook?.demonter();
  hook = null;
  vi.resetAllMocks();
});

describe('useFichierAc056', () => {
  it('démarre sans fichier', async () => {
    const h = await monterFichier();
    expect(h.lire().fichier).toEqual({ etat: 'aucun' });
  });

  it('passe par le chargement puis garde le fichier analysé en mémoire', async () => {
    const reponse = differe<OuvertureAc056>();
    vi.mocked(ouvrirFichierAc056).mockReturnValue(reponse.promesse);
    const h = await monterFichier();

    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });
    expect(h.lire().fichier).toEqual({ etat: 'chargement', cible: CIBLE });
    expect(ouvrirFichierAc056).toHaveBeenCalledWith(CIBLE);

    const ouverture = ouvertureReussie(NOM_VEOS, { erreurs: 3 });
    await act(async () => {
      reponse.resoudre(ouverture);
    });

    const { fichier } = h.lire();
    expect(fichier.etat).toBe('ouvert');
    if (fichier.etat !== 'ouvert' || !ouverture.ok) throw new Error('état inattendu');
    expect(fichier.nom).toBe(NOM_VEOS);
    expect(fichier.emplacement).toBe('in');
    expect(fichier.provenance).toBe('veos');
    expect(fichier.analyse).toBe(ouverture.analyse);
  });

  it('garde la provenance d’un rejet', async () => {
    vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_REJET, {}, 'out'));
    const h = await monterFichier();

    await act(async () => {
      h.lire().ouvrir({ emplacement: 'out', nom: NOM_REJET });
    });

    const { fichier } = h.lire();
    expect(fichier.etat === 'ouvert' && fichier.provenance).toBe('rejet');
  });

  it('affiche l’échec renvoyé par le main avec sa cause', async () => {
    const erreur = { code: 'introuvable', message: 'fichier introuvable' } as const;
    vi.mocked(ouvrirFichierAc056).mockResolvedValue({ ok: false, erreur });
    const h = await monterFichier();

    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });

    expect(h.lire().fichier).toEqual({ etat: 'echec', cible: CIBLE, erreur });
  });

  it('transforme une exception IPC en erreur générique, sans reprendre son texte', async () => {
    vi.mocked(ouvrirFichierAc056).mockRejectedValue(new Error('EPERM P:\\Transferts\\IN\\secret'));
    const h = await monterFichier();

    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });

    const { fichier } = h.lire();
    expect(fichier.etat).toBe('echec');
    if (fichier.etat !== 'echec') throw new Error('état inattendu');
    expect(fichier.erreur.message).toBe(MESSAGE_ECHEC_OUVERTURE);
    expect(JSON.stringify(fichier)).not.toContain('Transferts');
  });

  it('relance le chargement avec la même cible au « Réessayer »', async () => {
    vi.mocked(ouvrirFichierAc056)
      .mockResolvedValueOnce({
        ok: false,
        erreur: { code: 'verrou', message: 'fichier verrouillé' },
      })
      .mockResolvedValueOnce(ouvertureReussie(NOM_VEOS));
    const h = await monterFichier();
    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });
    expect(h.lire().fichier.etat).toBe('echec');

    await act(async () => {
      h.lire().reessayer();
    });

    expect(ouvrirFichierAc056).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ouvrirFichierAc056).mock.calls[1][0]).toEqual(CIBLE);
    expect(h.lire().fichier.etat).toBe('ouvert');
  });

  it('ne fait rien au « Réessayer » hors d’un échec', async () => {
    const h = await monterFichier();
    await act(async () => {
      h.lire().reessayer();
    });
    expect(ouvrirFichierAc056).not.toHaveBeenCalled();
    expect(h.lire().fichier.etat).toBe('aucun');
  });

  it('ignore un second clic pendant le chargement (verrou contre le double clic)', async () => {
    const reponse = differe<OuvertureAc056>();
    vi.mocked(ouvrirFichierAc056).mockReturnValue(reponse.promesse);
    const h = await monterFichier();
    const { ouvrir } = h.lire();

    // Deux clics dans le même rendu : l'état n'a pas encore eu le temps de changer
    await act(async () => {
      ouvrir(CIBLE);
      ouvrir({ emplacement: 'out', nom: NOM_REJET });
    });

    expect(ouvrirFichierAc056).toHaveBeenCalledTimes(1);
    expect(h.lire().fichier).toEqual({ etat: 'chargement', cible: CIBLE });

    await act(async () => {
      reponse.resoudre(ouvertureReussie(NOM_VEOS));
    });
    expect(h.lire().fichier.etat).toBe('ouvert');
  });

  it('revient au choix du fichier avec « fermer »', async () => {
    vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_VEOS));
    const h = await monterFichier();
    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });

    await act(async () => {
      h.lire().fermer();
    });

    expect(h.lire().fichier).toEqual({ etat: 'aucun' });
  });

  it('ne revient pas au choix pendant un chargement', async () => {
    const reponse = differe<OuvertureAc056>();
    vi.mocked(ouvrirFichierAc056).mockReturnValue(reponse.promesse);
    const h = await monterFichier();
    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });

    await act(async () => {
      h.lire().fermer();
    });
    expect(h.lire().fichier.etat).toBe('chargement');

    await act(async () => {
      reponse.resoudre(ouvertureReussie(NOM_VEOS));
    });
  });

  it('permet d’ouvrir un autre fichier après un retour au choix', async () => {
    vi.mocked(ouvrirFichierAc056)
      .mockResolvedValueOnce(ouvertureReussie(NOM_VEOS))
      .mockResolvedValueOnce(ouvertureReussie(NOM_REJET, {}, 'out'));
    const h = await monterFichier();
    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });
    await act(async () => {
      h.lire().fermer();
    });

    await act(async () => {
      h.lire().ouvrir({ emplacement: 'out', nom: NOM_REJET });
    });

    const { fichier } = h.lire();
    expect(fichier.etat === 'ouvert' && fichier.nom).toBe(NOM_REJET);
  });

  it('ne met rien à jour après le démontage', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = differe<OuvertureAc056>();
    vi.mocked(ouvrirFichierAc056).mockReturnValue(reponse.promesse);
    const h = await monterFichier();
    await act(async () => {
      h.lire().ouvrir(CIBLE);
    });

    await h.demonter();
    reponse.resoudre(ouvertureReussie(NOM_VEOS));
    await vider();

    // La dernière valeur lue reste celle du chargement : la réponse tardive est ignorée
    expect(h.lire().fichier.etat).toBe('chargement');
    expect(erreurs).not.toHaveBeenCalled();
    erreurs.mockRestore();
  });
});
