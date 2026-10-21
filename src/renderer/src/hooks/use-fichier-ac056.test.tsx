// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EnregistrementAc056, OuvertureAc056 } from '@shared/types';
import {
  EMPREINTE_ENREGISTREE,
  EMPREINTE_FICTIVE,
  NOM_REJET,
  NOM_VEOS,
  lignesAvecErreurs,
  analyseSynthetique,
  enregistrementAJour,
  enregistrementEchec,
  enregistrementReussi,
  ouvertureReussie,
  ouvertureSynthetique,
} from '@/test/ac056';
import { indexerLignes, saisirChamp } from '@shared/domain/ac056';
import { differe, monterHook, vider, type MontureHook } from '@/test/dom';
import {
  MESSAGE_ECHEC_ENREGISTREMENT,
  MESSAGE_ECHEC_OUVERTURE,
  MESSAGE_SAISIE_INATTENDUE,
  MESSAGE_SAISIE_PENDANT_ENREGISTREMENT,
  useFichierAc056,
  type FichierAc056,
} from './use-fichier-ac056';

// Le contrôle réel, sauf quand un test lui fait lever une exception
vi.mock('@shared/domain/ac056', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@shared/domain/ac056')>();
  return {
    ...reel,
    saisirChamp: vi.fn(reel.saisirChamp),
    indexerLignes: vi.fn(reel.indexerLignes),
  };
});

// Service simulé : aucun appel à window.api
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
  enregistrerFichierAc056: vi.fn(),
  signalerModificationsAc056: vi.fn(),
}));

import {
  enregistrerFichierAc056,
  ouvrirFichierAc056,
  signalerModificationsAc056,
} from '@/services/ac056';

const CIBLE = { emplacement: 'in', nom: NOM_VEOS } as const;

let hook: MontureHook<FichierAc056> | null = null;

async function monterFichier(): Promise<MontureHook<FichierAc056>> {
  hook = await monterHook(useFichierAc056);
  return hook;
}

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
        erreur = h.lire().saisir(cible, '75001', avant.index);
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
        erreur = h.lire().saisir(cible, '7�001', avant.index);
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
        erreur = h.lire().saisir(cible, '75001', avant.index);
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
        h.lire().saisir({ ligne: cible.ligne, champ: 'libelleVoie' }, 'RUE DE TEST', avant.index);
      });

      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(false);
    });

    it('enchaîne deux saisies lues dans le même rendu', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);

      // Deux champs en erreur (seuls modifiables, item 3) : le nom de la 405, puis le code postal.
      const nom = ouvert(h).analyse.anomalies.find((a) => a.champ === 'nom')!;
      const cibleNom = { ligne: nom.ligne!, champ: 'nom' };

      await act(async () => {
        const { saisir } = h.lire();
        const { index } = ouvert(h);
        saisir(cibleNom, 'DUPONT', index);
        saisir(cible, '75001', index);
      });

      const { analyse } = ouvert(h);
      expect(analyse.erreurs).toBe(0);
      const modifies = (numero: number) => {
        const ligne = analyse.fichier.lignes.find((l) => l.numero === numero);
        return ligne?.nature === 'decrite' && ligne.champsModifies;
      };
      expect(modifies(cibleNom.ligne)).toEqual(['nom']);
      expect(modifies(cible.ligne)).toEqual(['codePostalLocalite']);
    });

    it('ignore une saisie qui suit la fermeture dans le même rendu', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        const { fermer, saisir } = h.lire();
        const { index } = ouvert(h);
        fermer();
        erreur = saisir(cible, '75001', index);
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
      const indexAilleurs = indexerLignes(analyseSynthetique(lignesAvecErreurs()).fichier);
      expect(h.lire().saisir({ ligne: 1, champ: 'nom' }, 'X', indexAilleurs)).toBeNull();
      expect(h.lire().fichier).toEqual({ etat: 'aucun' });

      const cible = await ouvrirAvecErreurs(h);
      await act(async () => {
        h.lire().saisir(cible, '75001', ouvert(h).index);
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

  describe('enregistrer', () => {
    /** Corrige le code postal (1 erreur de moins) ; renvoie la cible. */
    async function corrigerCodePostal(h: MontureHook<FichierAc056>, texte = '75001') {
      const cible = await ouvrirAvecErreurs(h);
      await act(async () => {
        h.lire().saisir(cible, texte, ouvert(h).index);
      });
      return cible;
    }

    /** Analyse « écrite » : celle du fichier corrigé, clonée comme après l'IPC. */
    function analyseEcrite(h: MontureHook<FichierAc056>) {
      return structuredClone(ouvert(h).analyse);
    }

    it('envoie les corrections, l’empreinte et la cible du fichier, sans chemin', async () => {
      const h = await monterFichier();
      const cible = await corrigerCodePostal(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(analyseEcrite(h)));

      await act(async () => {
        await h.lire().enregistrer();
      });

      expect(enregistrerFichierAc056).toHaveBeenCalledTimes(1);
      const demande = vi.mocked(enregistrerFichierAc056).mock.calls[0][0];
      expect(demande).toMatchObject({
        emplacement: 'in',
        nom: NOM_VEOS,
        empreinte: EMPREINTE_FICTIVE,
      });
      expect(demande.corrections).toHaveLength(1);
      expect(demande.corrections[0]).toMatchObject({ ligne: cible.ligne, champ: cible.champ });
      expect(demande.corrections[0].texte.trimEnd()).toBe('75001');
    });

    it('lit l’état au moment de l’appel : une correction appliquée juste avant est incluse', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(
        enregistrementReussi(analyseSynthetique(lignesAvecErreurs())),
      );

      await act(async () => {
        const { saisir, enregistrer } = h.lire();
        saisir(cible, '75001', ouvert(h).index);
        void enregistrer();
      });

      const demande = vi.mocked(enregistrerFichierAc056).mock.calls[0][0];
      expect(demande.corrections.map((c) => c.champ)).toEqual([cible.champ]);
    });

    it('bloque saisie, fermeture, ouverture et second enregistrement pendant l’écriture', async () => {
      const h = await monterFichier();
      const cible = await corrigerCodePostal(h);
      const reponse = differe<EnregistrementAc056>();
      vi.mocked(enregistrerFichierAc056).mockReturnValue(reponse.promesse);
      const avant = ouvert(h);

      await act(async () => {
        void h.lire().enregistrer();
      });
      expect(h.lire().enregistrement).toBe(true);

      let erreur: ReturnType<FichierAc056['saisir']> = null;
      await act(async () => {
        erreur = h.lire().saisir(cible, '75002', avant.index);
        h.lire().fermer();
        h.lire().ouvrir(CIBLE);
        void h.lire().enregistrer();
      });

      // La saisie n'est pas perdue en silence : le champ en reçoit la raison
      expect(erreur).toEqual({
        code: 'enregistrement-en-cours',
        message: MESSAGE_SAISIE_PENDANT_ENREGISTREMENT,
      });
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvrirFichierAc056).toHaveBeenCalledTimes(1);
      expect(enregistrerFichierAc056).toHaveBeenCalledTimes(1);

      await act(async () => {
        reponse.resoudre(enregistrementReussi(structuredClone(avant.analyse)));
      });
      expect(h.lire().enregistrement).toBe(false);
      // Le verrou est levé : une nouvelle saisie s'applique
      await act(async () => {
        h.lire().saisir(cible, '75002', ouvert(h).index);
      });
      expect(ouvert(h).modifie).toBe(true);
    });

    it('adopte l’analyse et l’empreinte reçues, recalcule l’index et laisse le champ corrigé modifiable', async () => {
      const h = await monterFichier();
      const cible = await corrigerCodePostal(h);
      const avant = ouvert(h);
      const ecrite = analyseEcrite(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(ecrite));

      await act(async () => {
        await h.lire().enregistrer();
      });

      const apres = ouvert(h);
      expect(apres.analyse).toBe(ecrite);
      expect(apres.empreinte).toBe(EMPREINTE_ENREGISTREE);
      expect(apres.index).not.toBe(avant.index);
      expect(apres.modifie).toBe(false);
      expect(h.lire().champsModifies).toBe(0);

      // Champ corrigé : toujours modifiable jusqu'au changement de fichier
      await act(async () => {
        expect(h.lire().saisir(cible, '75002', apres.index)).toBeNull();
      });
      expect(ouvert(h).modifie).toBe(true);
      expect(h.lire().champsModifies).toBe(1);
    });

    it('distingue fichier enregistré, enregistré avec erreurs et déjà à jour', async () => {
      const h = await monterFichier();
      await corrigerCodePostal(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
        enregistrementReussi(analyseEcrite(h)),
      );
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour).toEqual({ type: 'enregistre-avec-erreurs', erreurs: 1 });

      // Plus aucune erreur : enregistré
      const cibleNom = {
        ligne: ouvert(h).analyse.anomalies.find((a) => a.champ === 'nom')!.ligne!,
        champ: 'nom',
      };
      await act(async () => {
        h.lire().saisir(cibleNom, 'DUPONT', ouvert(h).index);
      });
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
        enregistrementReussi(analyseEcrite(h)),
      );
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour).toEqual({ type: 'enregistre' });

      // Le main n'a rien écrit : le fichier est déjà à jour
      await act(async () => {
        h.lire().saisir(cibleNom, 'DUPONT2', ouvert(h).index);
      });
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
        enregistrementAJour(analyseEcrite(h)),
      );
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour).toEqual({ type: 'a-jour' });
      expect(ouvert(h).modifie).toBe(false);
      expect(ouvert(h).empreinte).toBe(EMPREINTE_FICTIVE);
    });

    it('garde l’état et le « modifié » quand le main refuse', async () => {
      const h = await monterFichier();
      await corrigerCodePostal(h);
      const avant = ouvert(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(
        enregistrementEchec('lecteur de travail non monté'),
      );

      await act(async () => {
        await h.lire().enregistrer();
      });

      expect(h.lire().retour).toEqual({ type: 'echec', message: 'lecteur de travail non monté' });
      expect(h.lire().enregistrement).toBe(false);
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).empreinte).toBe(avant.empreinte);
      expect(ouvert(h).modifie).toBe(true);
    });

    it('garde l’état et affiche un message générique, « interrompu », quand l’appel IPC échoue', async () => {
      const h = await monterFichier();
      await corrigerCodePostal(h);
      const avant = ouvert(h);
      vi.mocked(enregistrerFichierAc056).mockRejectedValue(
        new Error('EPERM P:\\Transferts\\IN valeur 75001'),
      );

      await act(async () => {
        await h.lire().enregistrer();
      });

      // Pas « echec » : on ignore si le main a écrit le fichier avant que l'appel échoue
      expect(h.lire().retour).toEqual({
        type: 'interrompu',
        message: MESSAGE_ECHEC_ENREGISTREMENT,
      });
      expect(JSON.stringify(h.lire().retour)).not.toContain('Transferts');
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(true);
      expect(h.lire().enregistrement).toBe(false);
    });

    it('rend « interrompu » une exception locale après une réponse réussie, sans adopter l’analyse', async () => {
      const h = await monterFichier();
      await corrigerCodePostal(h);
      const avant = ouvert(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(analyseEcrite(h)));
      vi.mocked(indexerLignes).mockImplementationOnce(() => {
        throw new Error('plantage P:\\Transferts valeur 75001');
      });

      await act(async () => {
        await h.lire().enregistrer();
      });

      expect(h.lire().retour).toEqual({
        type: 'interrompu',
        message: MESSAGE_ECHEC_ENREGISTREMENT,
      });
      expect(ouvert(h).analyse).toBe(avant.analyse);
      expect(ouvert(h).modifie).toBe(true);
      expect(h.lire().enregistrement).toBe(false);
      // Le verrou est levé : un nouvel enregistrement part
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(analyseEcrite(h)));
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(enregistrerFichierAc056).toHaveBeenCalledTimes(2);
    });

    it('efface une réussite à la saisie suivante, un échec seulement au prochain enregistrement ou au changement de fichier', async () => {
      const h = await monterFichier();
      const cible = await corrigerCodePostal(h);
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(enregistrementEchec());
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour?.type).toBe('echec');

      // Ni un refus de saisie ni une saisie appliquée n'efface un échec (« Réessayer » reste là)
      await act(async () => {
        h.lire().saisir(cible, '7�001', ouvert(h).index);
      });
      expect(h.lire().retour?.type).toBe('echec');
      await act(async () => {
        h.lire().saisir(cible, '75002', ouvert(h).index);
      });
      expect(h.lire().retour?.type).toBe('echec');

      // Le prochain enregistrement efface l'ancien retour dès son départ
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(enregistrementEchec());
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour?.type).toBe('echec');
      const reponse = differe<EnregistrementAc056>();
      vi.mocked(enregistrerFichierAc056).mockReturnValueOnce(reponse.promesse);
      await act(async () => {
        void h.lire().enregistrer();
      });
      expect(h.lire().retour).toBeNull();
      await act(async () => {
        reponse.resoudre(enregistrementEchec());
      });
      expect(h.lire().retour?.type).toBe('echec');

      await act(async () => {
        h.lire().fermer();
      });
      expect(h.lire().retour).toBeNull();

      // Une réussite, elle, est effacée par la saisie suivante
      const cibleDeux = await ouvrirAvecErreurs(h);
      await act(async () => {
        h.lire().saisir(cibleDeux, '75001', ouvert(h).index);
      });
      vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
        enregistrementReussi(analyseEcrite(h)),
      );
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().retour?.type).toBe('enregistre-avec-erreurs');
      await act(async () => {
        h.lire().saisir(cibleDeux, '75002', ouvert(h).index);
      });
      expect(h.lire().retour).toBeNull();
    });

    it('conserve un échec « interrompu » à la saisie suivante aussi', async () => {
      const h = await monterFichier();
      const cible = await corrigerCodePostal(h);
      vi.mocked(enregistrerFichierAc056).mockRejectedValueOnce(new Error('coupure'));
      await act(async () => {
        await h.lire().enregistrer();
      });

      await act(async () => {
        h.lire().saisir(cible, '75002', ouvert(h).index);
      });

      expect(h.lire().retour?.type).toBe('interrompu');
    });

    it('adopte l’analyse enregistrée quand les numéros de ligne changent (ligne vide supprimée)', async () => {
      const h = await monterFichier();
      // Ouvre un fichier qui a une ligne vide au début : les numéros de ligne sont décalés
      const lignes = lignesAvecErreurs();
      const ouverture = ouvertureSynthetique(NOM_VEOS, ['', ...lignes]);
      vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouverture);
      await act(async () => {
        h.lire().ouvrir(CIBLE);
      });
      const avant = ouvert(h);
      const anomalie = avant.analyse.anomalies.find((a) => a.champ === 'codePostalLocalite')!;
      const cible = { ligne: anomalie.ligne!, champ: 'codePostalLocalite' };
      await act(async () => {
        h.lire().saisir(cible, '75001', avant.index);
      });

      // Le fichier écrit n'a plus la ligne vide : chaque ligne porte un numéro de moins
      const ecrite = analyseSynthetique(lignes);
      const nouvelleAnomalie = ecrite.anomalies.find((a) => a.champ === 'codePostalLocalite')!;
      expect(nouvelleAnomalie.ligne).toBe(anomalie.ligne! - 1);
      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(ecrite));
      await act(async () => {
        await h.lire().enregistrer();
      });

      const apres = ouvert(h);
      expect(apres.analyse).toBe(ecrite);
      expect(apres.index).not.toBe(avant.index);
      expect(apres.index.indices.get(nouvelleAnomalie.ligne!)).toBe(
        avant.index.indices.get(anomalie.ligne!),
      );
      expect(apres.modifie).toBe(false);
      expect(h.lire().champsModifies).toBe(0);

      // La saisie suivante part de la nouvelle numérotation
      await act(async () => {
        expect(
          h
            .lire()
            .saisir(
              { ligne: nouvelleAnomalie.ligne!, champ: 'codePostalLocalite' },
              '75002',
              apres.index,
            ),
        ).toBeNull();
      });
      expect(ouvert(h).modifie).toBe(true);
    });

    it('n’enregistre ni un rejet, ni un fichier mal formé, ni sans fichier ouvert', async () => {
      const h = await monterFichier();
      await act(async () => {
        await h.lire().enregistrer();
      });

      vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_REJET, {}, 'out'));
      await act(async () => {
        h.lire().ouvrir({ emplacement: 'out', nom: NOM_REJET });
      });
      await act(async () => {
        await h.lire().enregistrer();
      });
      await act(async () => {
        h.lire().fermer();
      });

      vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_VEOS, { structure: 1 }));
      await act(async () => {
        h.lire().ouvrir(CIBLE);
      });
      await act(async () => {
        await h.lire().enregistrer();
      });

      expect(enregistrerFichierAc056).not.toHaveBeenCalled();
      expect(h.lire().retour).toBeNull();
      expect(h.lire().enregistrement).toBe(false);
    });

    it('compte les champs modifiés depuis l’ouverture, puis depuis le dernier enregistrement', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      expect(h.lire().champsModifies).toBe(0);

      const cibleNom = {
        ligne: ouvert(h).analyse.anomalies.find((a) => a.champ === 'nom')!.ligne!,
        champ: 'nom',
      };
      await act(async () => {
        h.lire().saisir(cible, '75001', ouvert(h).index);
      });
      expect(h.lire().champsModifies).toBe(1);
      await act(async () => {
        h.lire().saisir(cibleNom, 'DUPONT', ouvert(h).index);
      });
      expect(h.lire().champsModifies).toBe(2);

      // Une même cible corrigée deux fois compte pour un seul champ
      await act(async () => {
        h.lire().saisir(cible, '75002', ouvert(h).index);
      });
      expect(h.lire().champsModifies).toBe(2);

      vi.mocked(enregistrerFichierAc056).mockResolvedValue(enregistrementReussi(analyseEcrite(h)));
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(h.lire().champsModifies).toBe(0);

      // Le champ déjà enregistré, saisi autrement, compte à nouveau
      await act(async () => {
        h.lire().saisir(cible, '75003', ouvert(h).index);
      });
      expect(h.lire().champsModifies).toBe(1);
    });
  });

  describe('signal des modifications au main', () => {
    it('signale le fichier modifié, puis null quand il est enregistré, fermé ou démonté', async () => {
      const h = await monterFichier();
      const cible = await ouvrirAvecErreurs(h);
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(null);

      await act(async () => {
        h.lire().saisir(cible, '75001', ouvert(h).index);
      });
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(CIBLE);

      vi.mocked(enregistrerFichierAc056).mockResolvedValue(
        enregistrementReussi(structuredClone(ouvert(h).analyse)),
      );
      await act(async () => {
        await h.lire().enregistrer();
      });
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(null);

      await act(async () => {
        h.lire().saisir(cible, '75002', ouvert(h).index);
      });
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(CIBLE);
      await act(async () => {
        h.lire().fermer();
      });
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(null);

      await ouvrirAvecErreurs(h);
      await act(async () => {
        h.lire().saisir(cible, '75001', ouvert(h).index);
      });
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(CIBLE);
      await h.demonter();
      expect(signalerModificationsAc056).toHaveBeenLastCalledWith(null);
    });
  });
});
