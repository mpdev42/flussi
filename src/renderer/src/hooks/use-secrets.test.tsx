// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  EtatSecrets,
  MotDePasseTechnique,
  ResultatPreparationCle,
  ResultatSecret,
} from '@shared/types';
import { differe, monterHook, vider, type MontureHook } from '@/test/dom';
import { useSecrets, type Secrets } from './use-secrets';

// Le service renderer est entièrement simulé : aucun appel à window.api, donc aucun canal IPC,
// aucun sélecteur de fichier et aucune invite de contrôle de compte.
vi.mock('@/services/parametres', () => ({
  lireEtatSecrets: vi.fn(),
  preparerCle: vi.fn(),
  abandonnerCle: vi.fn(),
  enregistrerSecrets: vi.fn(),
}));

import {
  abandonnerCle,
  enregistrerSecrets,
  lireEtatSecrets,
  preparerCle,
} from '@/services/parametres';

// Valeurs fictives
const FTP = 'iga-ftp-mot-de-passe';
const SFTP = 'msp-sftp-mot-de-passe';
const CLE = 'msp-sftp-cle-privee';
const TEMOIN = 'TEMOIN-HOOK-9be21';
const AUTRE_TEMOIN = 'AUTRE-TEMOIN-HOOK-5c0d7';

const ETAT_INITIAL: EtatSecrets = {
  source: 'secrets-bin',
  modifiable: true,
  anomalie: null,
  secrets: {
    [FTP]: { etat: 'non-renseigne' },
    [SFTP]: { etat: 'non-renseigne' },
    [CLE]: { etat: 'non-renseigne' },
  },
};

const ETAT_APRES: EtatSecrets = {
  ...ETAT_INITIAL,
  secrets: {
    ...ETAT_INITIAL.secrets,
    [FTP]: { etat: 'renseigne', date: '2026-10-16' },
    [CLE]: { etat: 'renseigne', date: '2026-10-16' },
  },
};

const MESSAGE_CLE = "La clé n'a pas pu être contrôlée.";
const MESSAGE_ECHEC = "Les secrets n'ont pas pu être enregistrés.";
const MESSAGE_ANNULE = 'Enregistrement annulé : la fenêtre Windows a été fermée sans validation.';

let hook: MontureHook<Secrets> | null = null;

beforeEach(() => {
  vi.mocked(lireEtatSecrets).mockResolvedValue(ETAT_INITIAL);
  vi.mocked(abandonnerCle).mockResolvedValue(undefined);
});

afterEach(async () => {
  await hook?.demonter();
  hook = null;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

/** Monte le hook et laisse la lecture initiale se terminer. */
async function monterSecrets(): Promise<MontureHook<Secrets>> {
  hook = await monterHook(useSecrets);
  await vider();
  return hook;
}

/** Valeurs de l'état exposé qui ne sont pas des fonctions, sérialisées. */
function donnees(monture: MontureHook<Secrets>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(monture.lire()).filter(([, v]) => typeof v !== 'function')),
  );
}

async function deverrouiller(monture: MontureHook<Secrets>): Promise<void> {
  await act(async () => {
    monture.lire().deverrouiller();
  });
}

async function annuler(monture: MontureHook<Secrets>): Promise<void> {
  await act(async () => {
    monture.lire().annuler();
  });
}

async function choisirCle(monture: MontureHook<Secrets>): Promise<void> {
  await act(async () => {
    monture.lire().choisirCle();
  });
  await vider();
}

/** Prépare une clé : le service répond « preparee » avec le format donné. */
async function preparer(monture: MontureHook<Secrets>, format = 'PPK version 2'): Promise<void> {
  vi.mocked(preparerCle).mockResolvedValueOnce({ statut: 'preparee', format });
  await choisirCle(monture);
}

/** Appelle `enregistrer` dans `act` et renvoie son résultat. */
async function enregistrer(
  monture: MontureHook<Secrets>,
  motsDePasse: Partial<Record<MotDePasseTechnique, string>> = { [FTP]: TEMOIN },
): Promise<boolean> {
  let resultat = false;
  await act(async () => {
    resultat = await monture.lire().enregistrer(motsDePasse);
  });
  return resultat;
}

describe('useSecrets — lecture au montage', () => {
  it('lit l’état au montage : null pendant le chargement, puis l’état renvoyé', async () => {
    const lecture = differe<EtatSecrets>();
    vi.mocked(lireEtatSecrets).mockReturnValue(lecture.promesse);

    hook = await monterHook(useSecrets);
    expect(lireEtatSecrets).toHaveBeenCalledTimes(1);
    expect(hook.lire().etat).toBeNull();
    expect(hook.lire().erreurChargement).toBeNull();
    expect(hook.lire().deverrouille).toBe(false);
    expect(hook.lire().clePrete).toBeNull();
    expect(hook.lire().refusCle).toBeNull();
    expect(hook.lire().enCours).toBeNull();
    expect(hook.lire().retour).toBeNull();

    lecture.resoudre(ETAT_INITIAL);
    await vider();
    expect(hook.lire().etat).toEqual(ETAT_INITIAL);
    expect(hook.lire().erreurChargement).toBeNull();
  });

  it('expose le message de l’échec de lecture dans erreurChargement', async () => {
    vi.mocked(lireEtatSecrets).mockRejectedValue(new Error('Canal indisponible (simulé)'));

    const monture = await monterSecrets();

    expect(monture.lire().etat).toBeNull();
    expect(monture.lire().erreurChargement).toBe('Canal indisponible (simulé)');
  });

  it('convertit un rejet qui n’est pas une Error en texte', async () => {
    vi.mocked(lireEtatSecrets).mockRejectedValue('échec brut');

    const monture = await monterSecrets();

    expect(monture.lire().erreurChargement).toBe('échec brut');
  });

  it('n’appelle aucun autre service au montage', async () => {
    await monterSecrets();

    expect(preparerCle).not.toHaveBeenCalled();
    expect(abandonnerCle).not.toHaveBeenCalled();
    expect(enregistrerSecrets).not.toHaveBeenCalled();
  });

  it('ne met rien à jour si le démontage précède la fin de la lecture', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lecture = differe<EtatSecrets>();
    vi.mocked(lireEtatSecrets).mockReturnValue(lecture.promesse);

    const monture = await monterHook(useSecrets);
    hook = monture;
    await monture.demonter();
    lecture.resoudre(ETAT_INITIAL);
    await vider();

    expect(monture.lire().etat).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
  });

  it('ne met rien à jour si le démontage précède l’échec de la lecture', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lecture = differe<EtatSecrets>();
    vi.mocked(lireEtatSecrets).mockReturnValue(lecture.promesse);

    const monture = await monterHook(useSecrets);
    hook = monture;
    await monture.demonter();
    lecture.rejeter(new Error('échec simulé'));
    await vider();

    expect(monture.lire().erreurChargement).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
  });
});

describe('useSecrets — déverrouiller et annuler', () => {
  it('deverrouiller ouvre la saisie sans appeler le service', async () => {
    const monture = await monterSecrets();

    await deverrouiller(monture);

    expect(monture.lire().deverrouille).toBe(true);
    expect(abandonnerCle).not.toHaveBeenCalled();
    expect(preparerCle).not.toHaveBeenCalled();
  });

  it('deverrouiller efface le retour précédent', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await enregistrer(monture);
    expect(monture.lire().retour).not.toBeNull();

    await deverrouiller(monture);

    expect(monture.lire().retour).toBeNull();
    expect(monture.lire().deverrouille).toBe(true);
  });

  it('annuler appelle abandonnerCle, reverrouille et efface clePrete, refusCle et retour', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'refuse', message: 'Refus simulé.' });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);
    await enregistrer(monture);
    vi.mocked(preparerCle).mockResolvedValueOnce({ statut: 'refuse', message: 'Clé refusée.' });
    await choisirCle(monture);
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().refusCle).toBe('Clé refusée.');
    expect(monture.lire().retour).not.toBeNull();

    await annuler(monture);

    expect(abandonnerCle).toHaveBeenCalledTimes(1);
    expect(monture.lire().deverrouille).toBe(false);
    expect(monture.lire().clePrete).toBeNull();
    expect(monture.lire().refusCle).toBeNull();
    expect(monture.lire().retour).toBeNull();
    expect(monture.lire().etat).toEqual(ETAT_INITIAL);
  });

  it('annuler reverrouille même si l’oubli de la clé côté main échoue', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(abandonnerCle).mockRejectedValue(new Error('échec simulé'));
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await annuler(monture);
    await vider();

    expect(monture.lire().deverrouille).toBe(false);
    expect(erreurs).not.toHaveBeenCalled();
  });

  it('annuler n’enregistre rien', async () => {
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await annuler(monture);

    expect(enregistrerSecrets).not.toHaveBeenCalled();
  });
});

describe('useSecrets — choix de la clé', () => {
  it('« preparee » : expose le format dans clePrete et efface le refus précédent', async () => {
    vi.mocked(preparerCle).mockResolvedValueOnce({ statut: 'refuse', message: 'Clé refusée.' });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await choisirCle(monture);
    expect(monture.lire().refusCle).toBe('Clé refusée.');

    await preparer(monture, 'OpenSSH');

    expect(preparerCle).toHaveBeenCalledTimes(2);
    expect(monture.lire().clePrete).toBe('OpenSSH');
    expect(monture.lire().refusCle).toBeNull();
    expect(monture.lire().enCours).toBeNull();
  });

  it('« annule » (sélecteur fermé) : ne change rien', async () => {
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);
    vi.mocked(preparerCle).mockResolvedValueOnce({ statut: 'annule' });

    await choisirCle(monture);

    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().refusCle).toBeNull();
    expect(monture.lire().enCours).toBeNull();
    expect(monture.lire().retour).toBeNull();
  });

  it('« annule » sans clé préparée : clePrete et refusCle restent null', async () => {
    vi.mocked(preparerCle).mockResolvedValue({ statut: 'annule' });
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await choisirCle(monture);

    expect(monture.lire().clePrete).toBeNull();
    expect(monture.lire().refusCle).toBeNull();
  });

  it('« refuse » : pose refusCle et garde la clé déjà prête', async () => {
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);
    vi.mocked(preparerCle).mockResolvedValueOnce({
      statut: 'refuse',
      message: 'Clé au format PPK version 3, non prise en charge.',
    });

    await choisirCle(monture);

    expect(monture.lire().refusCle).toBe('Clé au format PPK version 3, non prise en charge.');
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().enCours).toBeNull();
  });

  it('rejet IPC : message générique sans la cause, clé déjà prête conservée', async () => {
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);
    vi.mocked(preparerCle).mockRejectedValueOnce(new Error(`Fichier illisible : ${TEMOIN}`));

    await choisirCle(monture);

    expect(monture.lire().refusCle).toBe(MESSAGE_CLE);
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().enCours).toBeNull();
    expect(donnees(monture)).not.toContain(TEMOIN);
  });

  it('indique « cle » en cours pendant le contrôle puis libère', async () => {
    const reponse = differe<ResultatPreparationCle>();
    vi.mocked(preparerCle).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await act(async () => {
      monture.lire().choisirCle();
    });
    expect(monture.lire().enCours).toBe('cle');

    reponse.resoudre({ statut: 'annule' });
    await vider();
    expect(monture.lire().enCours).toBeNull();
  });
});

describe('useSecrets — enregistrement', () => {
  it('n’envoie que les valeurs non vides, avec cle: false sans clé prête', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await enregistrer(monture, { [FTP]: TEMOIN, [SFTP]: '' });

    expect(enregistrerSecrets).toHaveBeenCalledTimes(1);
    expect(enregistrerSecrets).toHaveBeenCalledWith({ motsDePasse: { [FTP]: TEMOIN }, cle: false });
    const demande = vi.mocked(enregistrerSecrets).mock.calls[0][0];
    expect(Object.keys(demande.motsDePasse)).toEqual([FTP]);
  });

  it('envoie les deux mots de passe saisis', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();

    await enregistrer(monture, { [FTP]: TEMOIN, [SFTP]: AUTRE_TEMOIN });

    expect(enregistrerSecrets).toHaveBeenCalledWith({
      motsDePasse: { [FTP]: TEMOIN, [SFTP]: AUTRE_TEMOIN },
      cle: false,
    });
  });

  it('envoie cle: true et aucun mot de passe quand seule la clé est prête', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);

    const resultat = await enregistrer(monture, { [FTP]: '', [SFTP]: '' });

    expect(resultat).toBe(true);
    expect(enregistrerSecrets).toHaveBeenCalledWith({ motsDePasse: {}, cle: true });
  });

  it('envoie cle: true avec les mots de passe saisis', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await preparer(monture);

    await enregistrer(monture, { [SFTP]: TEMOIN });

    expect(enregistrerSecrets).toHaveBeenCalledWith({ motsDePasse: { [SFTP]: TEMOIN }, cle: true });
  });

  it.each([{}, { [FTP]: '', [SFTP]: '' }])(
    'rien à envoyer (%j) : renvoie false sans appeler le service ni changer l’état',
    async (saisies) => {
      const monture = await monterSecrets();
      await deverrouiller(monture);

      const resultat = await enregistrer(monture, saisies);

      expect(resultat).toBe(false);
      expect(enregistrerSecrets).not.toHaveBeenCalled();
      expect(monture.lire().enCours).toBeNull();
      expect(monture.lire().retour).toBeNull();
      expect(monture.lire().deverrouille).toBe(true);
    },
  );

  it('« enregistre » : remplace l’état, reverrouille, efface la clé et renvoie true', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);

    const resultat = await enregistrer(monture, { [FTP]: TEMOIN });

    expect(resultat).toBe(true);
    expect(monture.lire().etat).toEqual(ETAT_APRES);
    expect(monture.lire().deverrouille).toBe(false);
    expect(monture.lire().clePrete).toBeNull();
    expect(monture.lire().refusCle).toBeNull();
    expect(monture.lire().enCours).toBeNull();
  });

  it('« enregistre » : retour de succès listant, dans l’ordre des secrets, ce qui a changé', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);

    await enregistrer(monture, { [FTP]: TEMOIN });

    expect(monture.lire().retour).toEqual({
      ton: 'succes',
      message: 'Secrets enregistrés : Mot de passe FTP IGA, Clé privée SFTP MSP.',
    });
  });

  it('« enregistre » : le retour liste les trois secrets dans l’ordre de SECRETS_TECHNIQUES', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();
    await preparer(monture);

    // Ordre de saisie inversé : l'ordre du message ne dépend pas de lui
    await enregistrer(monture, { [SFTP]: AUTRE_TEMOIN, [FTP]: TEMOIN });

    expect(monture.lire().retour).toEqual({
      ton: 'succes',
      message:
        'Secrets enregistrés : Mot de passe FTP IGA, Mot de passe SFTP MSP, Clé privée SFTP MSP.',
    });
  });

  it('« enregistre » : un seul mot de passe, sans clé', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'enregistre', etat: ETAT_APRES });
    const monture = await monterSecrets();

    await enregistrer(monture, { [SFTP]: TEMOIN });

    expect(monture.lire().retour).toEqual({
      ton: 'succes',
      message: 'Secrets enregistrés : Mot de passe SFTP MSP.',
    });
  });

  it('« annule » : reste déverrouillé, garde la clé, retour d’information, renvoie false', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'annule' });
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);

    const resultat = await enregistrer(monture, { [FTP]: TEMOIN });

    expect(resultat).toBe(false);
    expect(monture.lire().retour).toEqual({ ton: 'info', message: MESSAGE_ANNULE });
    expect(monture.lire().deverrouille).toBe(true);
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().etat).toEqual(ETAT_INITIAL);
    expect(monture.lire().enCours).toBeNull();
  });

  it('« refuse » : retour d’erreur avec le message du service, renvoie false', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({
      statut: 'refuse',
      message: 'Refus simulé du service.',
    });
    const monture = await monterSecrets();
    await deverrouiller(monture);

    const resultat = await enregistrer(monture);

    expect(resultat).toBe(false);
    expect(monture.lire().retour).toEqual({ ton: 'erreur', message: 'Refus simulé du service.' });
    expect(monture.lire().deverrouille).toBe(true);
    expect(monture.lire().etat).toEqual(ETAT_INITIAL);
    expect(monture.lire().enCours).toBeNull();
  });

  it('rejet IPC : message générique, sans la valeur citée par le rejet', async () => {
    vi.mocked(enregistrerSecrets).mockRejectedValue(
      new Error(`Entrée invalide : ${TEMOIN} dépasse la longueur`),
    );
    const monture = await monterSecrets();
    await deverrouiller(monture);

    const resultat = await enregistrer(monture);

    expect(resultat).toBe(false);
    expect(monture.lire().retour).toEqual({ ton: 'erreur', message: MESSAGE_ECHEC });
    expect(monture.lire().deverrouille).toBe(true);
    expect(monture.lire().enCours).toBeNull();
    expect(donnees(monture)).not.toContain(TEMOIN);
  });

  it('efface le retour précédent au début de l’enregistrement suivant', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValueOnce({ statut: 'refuse', message: 'Refus.' });
    const monture = await monterSecrets();
    await enregistrer(monture);
    expect(monture.lire().retour).not.toBeNull();

    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    let promesse!: Promise<boolean>;
    await act(async () => {
      promesse = monture.lire().enregistrer({ [FTP]: TEMOIN });
    });
    expect(monture.lire().retour).toBeNull();
    expect(monture.lire().enCours).toBe('enregistrement');

    await act(async () => {
      reponse.resoudre({ statut: 'annule' });
      await promesse;
    });
  });
});

describe('useSecrets — aucune valeur dans l’état exposé', () => {
  it('ne garde jamais le témoin, ni avant, ni pendant, ni après un enregistrement réussi', async () => {
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();
    await deverrouiller(monture);
    expect(donnees(monture)).not.toContain(TEMOIN);

    let promesse!: Promise<boolean>;
    await act(async () => {
      promesse = monture.lire().enregistrer({ [FTP]: TEMOIN, [SFTP]: AUTRE_TEMOIN });
    });
    expect(monture.lire().enCours).toBe('enregistrement');
    expect(donnees(monture)).not.toContain(TEMOIN);
    expect(donnees(monture)).not.toContain(AUTRE_TEMOIN);

    await act(async () => {
      reponse.resoudre({ statut: 'enregistre', etat: ETAT_APRES });
      await promesse;
    });
    expect(donnees(monture)).not.toContain(TEMOIN);
    expect(donnees(monture)).not.toContain(AUTRE_TEMOIN);
  });

  it.each([
    ['annulation', { statut: 'annule' } as ResultatSecret],
    ['refus', { statut: 'refuse', message: 'Refus simulé.' } as ResultatSecret],
  ])('ne garde jamais le témoin après un enregistrement terminé par %s', async (_nom, resultat) => {
    vi.mocked(enregistrerSecrets).mockResolvedValue(resultat);
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await enregistrer(monture, { [FTP]: TEMOIN });

    expect(donnees(monture)).not.toContain(TEMOIN);
  });
});

describe('useSecrets — une seule action à la fois', () => {
  it('un second enregistrement pendant le premier résout false sans second appel au service', async () => {
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();

    let premiere!: Promise<boolean>;
    let seconde = true;
    await act(async () => {
      premiere = monture.lire().enregistrer({ [FTP]: TEMOIN });
    });
    await act(async () => {
      seconde = await monture.lire().enregistrer({ [SFTP]: AUTRE_TEMOIN });
    });

    expect(seconde).toBe(false);
    expect(enregistrerSecrets).toHaveBeenCalledTimes(1);
    expect(enregistrerSecrets).toHaveBeenCalledWith({ motsDePasse: { [FTP]: TEMOIN }, cle: false });
    expect(monture.lire().enCours).toBe('enregistrement');

    let resultatPremiere = false;
    await act(async () => {
      reponse.resoudre({ statut: 'enregistre', etat: ETAT_APRES });
      resultatPremiere = await premiere;
    });
    expect(resultatPremiere).toBe(true);
  });

  it('deverrouiller, annuler et choisirCle sont ignorés pendant un enregistrement', async () => {
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();
    await deverrouiller(monture);
    await preparer(monture);
    vi.mocked(preparerCle).mockClear();

    let promesse!: Promise<boolean>;
    await act(async () => {
      promesse = monture.lire().enregistrer({ [FTP]: TEMOIN });
    });
    await annuler(monture);
    await deverrouiller(monture);
    await choisirCle(monture);

    expect(abandonnerCle).not.toHaveBeenCalled();
    expect(preparerCle).not.toHaveBeenCalled();
    expect(monture.lire().deverrouille).toBe(true);
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().enCours).toBe('enregistrement');

    await act(async () => {
      reponse.resoudre({ statut: 'annule' });
      await promesse;
    });
  });

  it('annuler, enregistrer et un second choisirCle sont ignorés pendant le contrôle de la clé', async () => {
    const reponse = differe<ResultatPreparationCle>();
    vi.mocked(preparerCle).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();
    await deverrouiller(monture);

    await act(async () => {
      monture.lire().choisirCle();
    });
    expect(monture.lire().enCours).toBe('cle');
    await annuler(monture);
    await choisirCle(monture);
    const resultat = await enregistrer(monture, { [FTP]: TEMOIN });

    expect(resultat).toBe(false);
    expect(preparerCle).toHaveBeenCalledTimes(1);
    expect(abandonnerCle).not.toHaveBeenCalled();
    expect(enregistrerSecrets).not.toHaveBeenCalled();
    expect(monture.lire().deverrouille).toBe(true);

    reponse.resoudre({ statut: 'preparee', format: 'PPK version 2' });
    await vider();
    expect(monture.lire().clePrete).toBe('PPK version 2');
    expect(monture.lire().enCours).toBeNull();
  });

  it('deux actions lancées dans le même rendu : une seule part (verrou synchrone)', async () => {
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    vi.mocked(preparerCle).mockResolvedValue({ statut: 'annule' });
    const monture = await monterSecrets();

    let premiere!: Promise<boolean>;
    let seconde!: Promise<boolean>;
    await act(async () => {
      const secrets = monture.lire();
      premiere = secrets.enregistrer({ [FTP]: TEMOIN });
      seconde = secrets.enregistrer({ [SFTP]: AUTRE_TEMOIN });
      secrets.choisirCle();
      secrets.annuler();
    });

    expect(await seconde).toBe(false);
    expect(enregistrerSecrets).toHaveBeenCalledTimes(1);
    expect(preparerCle).not.toHaveBeenCalled();
    expect(abandonnerCle).not.toHaveBeenCalled();

    await act(async () => {
      reponse.resoudre({ statut: 'annule' });
      await premiere;
    });
  });

  it('libère le verrou à la fin de l’action : une nouvelle action part', async () => {
    vi.mocked(enregistrerSecrets).mockResolvedValue({ statut: 'annule' });
    const monture = await monterSecrets();

    await enregistrer(monture, { [FTP]: TEMOIN });
    await enregistrer(monture, { [SFTP]: AUTRE_TEMOIN });

    expect(enregistrerSecrets).toHaveBeenCalledTimes(2);
  });

  it('libère le verrou après un rejet IPC', async () => {
    vi.mocked(enregistrerSecrets).mockRejectedValueOnce(new Error('échec simulé'));
    vi.mocked(enregistrerSecrets).mockResolvedValueOnce({ statut: 'annule' });
    const monture = await monterSecrets();

    await enregistrer(monture);
    await enregistrer(monture);

    expect(enregistrerSecrets).toHaveBeenCalledTimes(2);
  });

  it('libère le verrou après un rejet du choix de clé', async () => {
    vi.mocked(preparerCle).mockRejectedValueOnce(new Error('échec simulé'));
    vi.mocked(preparerCle).mockResolvedValueOnce({ statut: 'annule' });
    const monture = await monterSecrets();

    await choisirCle(monture);
    await choisirCle(monture);

    expect(preparerCle).toHaveBeenCalledTimes(2);
  });
});

describe('useSecrets — démontage pendant une action', () => {
  it('ne met rien à jour après le démontage d’un enregistrement et ne déclenche aucun avertissement', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const avertissements = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();
    await deverrouiller(monture);

    let promesse!: Promise<boolean>;
    await act(async () => {
      promesse = monture.lire().enregistrer({ [FTP]: TEMOIN });
    });
    expect(monture.lire().enCours).toBe('enregistrement');

    await monture.demonter();
    reponse.resoudre({ statut: 'enregistre', etat: ETAT_APRES });
    await expect(promesse).resolves.toBe(true);
    await vider();

    // Dernier état observé avant le démontage : rien n'a été validé depuis
    expect(monture.lire().enCours).toBe('enregistrement');
    expect(monture.lire().etat).toEqual(ETAT_INITIAL);
    expect(monture.lire().retour).toBeNull();
    expect(monture.lire().deverrouille).toBe(true);
    expect(erreurs).not.toHaveBeenCalled();
    expect(avertissements).not.toHaveBeenCalled();
  });

  it('ne met rien à jour après le démontage quand l’enregistrement est rejeté', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const avertissements = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reponse = differe<ResultatSecret>();
    vi.mocked(enregistrerSecrets).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();

    let promesse!: Promise<boolean>;
    await act(async () => {
      promesse = monture.lire().enregistrer({ [FTP]: TEMOIN });
    });
    await monture.demonter();
    reponse.rejeter(new Error(`rejet ${TEMOIN}`));
    await expect(promesse).resolves.toBe(false);
    await vider();

    expect(monture.lire().retour).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
    expect(avertissements).not.toHaveBeenCalled();
  });

  it('ne met rien à jour après le démontage du choix de clé', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const avertissements = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reponse = differe<ResultatPreparationCle>();
    vi.mocked(preparerCle).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();

    await act(async () => {
      monture.lire().choisirCle();
    });
    await monture.demonter();
    reponse.resoudre({ statut: 'preparee', format: 'PPK version 2' });
    await vider();

    expect(monture.lire().clePrete).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
    expect(avertissements).not.toHaveBeenCalled();
  });

  it('ne met rien à jour après le démontage quand le choix de clé est rejeté', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = differe<ResultatPreparationCle>();
    vi.mocked(preparerCle).mockReturnValue(reponse.promesse);
    const monture = await monterSecrets();

    await act(async () => {
      monture.lire().choisirCle();
    });
    await monture.demonter();
    reponse.rejeter(new Error(`rejet ${TEMOIN}`));
    await vider();

    expect(monture.lire().refusCle).toBeNull();
    expect(erreurs).not.toHaveBeenCalled();
  });
});
