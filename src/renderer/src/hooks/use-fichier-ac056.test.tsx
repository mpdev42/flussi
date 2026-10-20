// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OuvertureAc056 } from '@shared/types';
import {
  NOM_REJET,
  NOM_VEOS,
  lignesAvecErreurs,
  ouvertureReussie,
  ouvertureSynthetique,
} from '@/test/ac056';
import { saisirChamp } from '@shared/domain/ac056';
import { differe, monterHook, vider, type MontureHook } from '@/test/dom';
import {
  MESSAGE_ECHEC_OUVERTURE,
  MESSAGE_SAISIE_INATTENDUE,
  useFichierAc056,
  type FichierAc056,
} from './use-fichier-ac056';

// Le contrôle réel, sauf quand un test lui fait lever une exception
vi.mock('@shared/domain/ac056', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@shared/domain/ac056')>();
  return { ...reel, saisirChamp: vi.fn(reel.saisirChamp) };
});

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

  describe('saisir', () => {
    /** Ouvre le fichier synthétique à deux erreurs ; renvoie la cible du code postal en erreur. */
    async function ouvrirAvecErreurs(h: MontureHook<FichierAc056>) {
      const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
      vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouverture);
      await act(async () => {
        h.lire().ouvrir(CIBLE);
      });
      const { fichier } = h.lire();
      if (fichier.etat !== 'ouvert') throw new Error('état inattendu');
      const anomalie = fichier.analyse.anomalies.find((a) => a.champ === 'codePostalLocalite')!;
      return { ligne: anomalie.ligne!, champ: 'codePostalLocalite' };
    }

    function ouvert(h: MontureHook<FichierAc056>) {
      const { fichier } = h.lire();
      if (fichier.etat !== 'ouvert') throw new Error('état inattendu');
      return fichier;
    }

    it('ouvre un fichier non modifié', async () => {
      const h = await monterFichier();
      await ouvrirAvecErreurs(h);
      expect(ouvert(h).modifie).toBe(false);
    });

    it('applique la saisie en mémoire : analyse recomptée, index inchangé, fichier modifié', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      const avant = ouvert(h);
      expect(avant.analyse.erreurs).toBe(2);

      let erreur: unknown = 'jamais appelé';
      await act(async () => {
        erreur = h.lire().saisir(cible, '75001');
      });

      expect(erreur).toBeNull();
      const apres = ouvert(h);
      expect(apres.analyse.erreurs).toBe(1);
      expect(apres.modifie).toBe(true);
      expect(apres.index).toBe(avant.index);
      expect(apres.nom).toBe(NOM_VEOS);
    });

    it('renvoie l’erreur du domaine et laisse le fichier intact quand la saisie est refusée', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      const avant = ouvert(h);

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        erreur = h.lire().saisir(cible, '7�001');
      });

      expect(erreur).toMatchObject({ code: 'caractere-illisible' });
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(false);
    });

    it('renvoie une erreur générique, sans le texte de l’exception, quand le contrôle lève une exception', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      const avant = ouvert(h);
      vi.mocked(saisirChamp).mockImplementationOnce(() => {
        throw new Error('plantage P:\Transferts\IN valeur 75001');
      });

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        erreur = h.lire().saisir(cible, '75001');
      });

      expect(erreur).toEqual({ code: 'erreur-inattendue', message: MESSAGE_SAISIE_INATTENDUE });
      expect(MESSAGE_SAISIE_INATTENDUE).toBe('Saisie non appliquée : erreur inattendue.');
      expect(JSON.stringify(erreur)).not.toContain('Transferts');
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(false);
    });

    it('ne marque pas le fichier modifié pour un texte inchangé sur un champ sans erreur', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      const avant = ouvert(h);
      const ligne = avant.analyse.fichier.lignes.find((l) => l.numero === cible.ligne)!;
      if (ligne.nature !== 'decrite') throw new Error('ligne inattendue');

      await act(async () => {
        h.lire().saisir({ ligne: cible.ligne, champ: 'libelleVoie' }, 'RUE DE TEST');
      });

      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(false);
    });

    it('enchaîne deux saisies lues dans le même rendu', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);

      await act(async () => {
        const { saisir } = h.lire();
        saisir({ ligne: cible.ligne, champ: 'libelleVoie' }, 'RUE DU TEST');
        saisir(cible, '75001');
      });

      const { analyse } = ouvert(h);
      expect(analyse.erreurs).toBe(1);
      const ligne = analyse.fichier.lignes.find((l) => l.numero === cible.ligne);
      expect(ligne?.nature === 'decrite' && ligne.champsModifies).toEqual([
        'libelleVoie',
        'codePostalLocalite',
      ]);
    });

    it('ignore une saisie qui suit la fermeture dans le même rendu', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        const { fermer, saisir } = h.lire();
        fermer();
        erreur = saisir(cible, '75001');
      });

      expect(erreur).toBeNull();
      expect(h.lire().fichier).toEqual({ etat: 'aucun' });
    });

    it('ignore une saisie liée à l’index d’un fichier précédent, jamais appliquée à un autre fichier', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      const indexPremier = ouvert(h).index;
      await act(async () => {
        h.lire().fermer();
      });
      await ouvrirAvecErreurs(h);
      const avant = ouvert(h);
      expect(avant.index).not.toBe(indexPremier);

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        erreur = h.lire().saisir(cible, '75001', indexPremier);
      });

      expect(erreur).toBeNull();
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(false);

      // Avec l'index du fichier ouvert, la saisie s'applique
      await act(async () => {
        h.lire().saisir(cible, '75001', avant.index);
      });
      expect(ouvert(h).analyse.erreurs).toBe(1);
    });

    it('ne fait rien sans fichier ouvert et repart de « non modifié » pour un autre fichier', async () => {
      const h = await monterFichier();
      expect(h.lire().saisir({ ligne: 1, champ: 'nom' }, 'X')).toBeNull();
      expect(h.lire().fichier).toEqual({ etat: 'aucun' });

      const cible = await ouvrirAvecErreurs(h);
      await act(async () => {
        h.lire().saisir(cible, '75001');
      });
      expect(ouvert(h).modifie).toBe(true);
      await act(async () => {
        h.lire().fermer();
      });
      await ouvrirAvecErreurs(h);
      expect(ouvert(h).modifie).toBe(false);
      expect(ouvert(h).analyse.erreurs).toBe(2);
    });
  });
});
