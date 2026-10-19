// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EtatSecrets } from '@shared/types';
import { ContexteVerrouNavigation } from '@/components/verrou-navigation';
import { cliquer, differe, monter, saisir, soumettre, type Monture } from '@/test/dom';
import { SecretsVue, type SecretsVueProps } from './secrets-vue';

// Valeurs fictives
const FTP = 'iga-ftp-mot-de-passe';
const SFTP = 'msp-sftp-mot-de-passe';
const CLE = 'msp-sftp-cle-privee';
const TEMOIN = 'TEMOIN-DOM-4c1d8';
const AUTRE_TEMOIN = 'AUTRE-TEMOIN-DOM-a07e3';

const ETAT_MODIFIABLE: EtatSecrets = {
  source: 'secrets-bin',
  modifiable: true,
  anomalie: null,
  secrets: {
    [FTP]: { etat: 'non-renseigne' },
    [SFTP]: { etat: 'non-renseigne' },
    [CLE]: { etat: 'non-renseigne' },
  },
};

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

function vue(props: Partial<SecretsVueProps> = {}) {
  return (
    <SecretsVue
      etat={ETAT_MODIFIABLE}
      erreurChargement={null}
      deverrouille
      clePrete={null}
      refusCle={null}
      enCours={null}
      retour={null}
      deverrouiller={vi.fn()}
      annuler={vi.fn()}
      choisirCle={vi.fn()}
      enregistrer={vi.fn().mockResolvedValue(true)}
      {...props}
    />
  );
}

async function afficher(props: Partial<SecretsVueProps> = {}): Promise<HTMLElement> {
  monture = await monter(vue(props));
  return monture.conteneur;
}

function bouton(conteneur: HTMLElement, nom: string): HTMLButtonElement {
  const trouve = [...conteneur.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(nom),
  );
  if (!trouve) throw new Error(`Bouton « ${nom} » introuvable.`);
  return trouve;
}

/** Formulaire déverrouillé : ses deux champs (FTP IGA puis SFTP MSP) et ses boutons. */
function formulaire(conteneur: HTMLElement) {
  const form = conteneur.querySelector<HTMLFormElement>(
    'form[aria-label="Modifier les secrets techniques"]',
  );
  if (!form) throw new Error('Formulaire introuvable.');
  const [ftp, sftp] = [...form.querySelectorAll<HTMLInputElement>('input')];
  const enregistrer = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!ftp || !sftp || !enregistrer) throw new Error('Champs ou bouton introuvables.');
  return { form, ftp, sftp, enregistrer };
}

describe('SecretsVue (DOM) — déverrouillage', () => {
  it('appelle deverrouiller au clic sur « Modifier les secrets »', async () => {
    const deverrouiller = vi.fn();
    const conteneur = await afficher({ deverrouille: false, deverrouiller });

    expect(conteneur.querySelector('form')).toBeNull();
    await cliquer(bouton(conteneur, 'Modifier les secrets'));

    expect(deverrouiller).toHaveBeenCalledTimes(1);
  });

  it('affiche le formulaire quand le hook passe en déverrouillé', async () => {
    const conteneur = await afficher({ deverrouille: false });
    expect(conteneur.querySelector('input')).toBeNull();

    await monture?.rerendre(vue({ deverrouille: true }));

    expect(formulaire(conteneur).ftp.type).toBe('password');
    expect([...conteneur.querySelectorAll('button')].map((b) => b.textContent)).not.toContain(
      'Modifier les secrets',
    );
  });
});

describe('SecretsVue (DOM) — saisie', () => {
  it('active « Enregistrer » dès qu’une valeur est saisie, et le désactive quand le champ est vidé', async () => {
    const conteneur = await afficher();
    const { ftp, enregistrer } = formulaire(conteneur);
    expect(enregistrer.disabled).toBe(true);

    await saisir(ftp, TEMOIN);
    expect(ftp.value).toBe(TEMOIN);
    expect(enregistrer.disabled).toBe(false);

    await saisir(ftp, '');
    expect(enregistrer.disabled).toBe(true);
  });

  it('active « Enregistrer » avec le seul second champ', async () => {
    const conteneur = await afficher();
    const { ftp, sftp, enregistrer } = formulaire(conteneur);

    await saisir(sftp, TEMOIN);

    expect(enregistrer.disabled).toBe(false);
    expect(ftp.value).toBe('');
  });

  it('active « Enregistrer » quand une clé est prête, sans aucune saisie', async () => {
    const conteneur = await afficher({ clePrete: 'PPK version 2' });
    expect(formulaire(conteneur).enregistrer.disabled).toBe(false);
  });

  it('garde les deux champs indépendants', async () => {
    const conteneur = await afficher();
    const { ftp, sftp } = formulaire(conteneur);

    await saisir(ftp, TEMOIN);

    expect(ftp.value).toBe(TEMOIN);
    expect(sftp.value).toBe('');
  });

  it('masque la saisie (type password)', async () => {
    const conteneur = await afficher();
    const { ftp, sftp } = formulaire(conteneur);
    expect(ftp.type).toBe('password');
    expect(sftp.type).toBe('password');
  });
});

describe('SecretsVue (DOM) — soumission', () => {
  it('envoie les deux champs, le second vide, puis vide les champs après un succès', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer });
    const { form, ftp, enregistrer: soumission } = formulaire(conteneur);

    await saisir(ftp, TEMOIN);
    await soumettre(form);

    expect(enregistrer).toHaveBeenCalledTimes(1);
    expect(enregistrer).toHaveBeenCalledWith({ [FTP]: TEMOIN, [SFTP]: '' });
    expect(ftp.value).toBe('');
    expect(soumission.disabled).toBe(true);
  });

  it('envoie les deux valeurs saisies, chacune sous sa clé', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer });
    const { form, ftp, sftp } = formulaire(conteneur);

    await saisir(ftp, TEMOIN);
    await saisir(sftp, AUTRE_TEMOIN);
    await soumettre(form);

    expect(enregistrer).toHaveBeenCalledWith({ [FTP]: TEMOIN, [SFTP]: AUTRE_TEMOIN });
    expect(ftp.value).toBe('');
    expect(formulaire(conteneur).sftp.value).toBe('');
  });

  it('envoie seulement le second champ quand le premier est vide', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer });
    const { form, sftp } = formulaire(conteneur);

    await saisir(sftp, TEMOIN);
    await soumettre(form);

    expect(enregistrer).toHaveBeenCalledWith({ [FTP]: '', [SFTP]: TEMOIN });
  });

  it('soumet avec une clé prête et deux champs vides', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer, clePrete: 'PPK version 2' });

    await soumettre(formulaire(conteneur).form);

    expect(enregistrer).toHaveBeenCalledWith({ [FTP]: '', [SFTP]: '' });
  });

  it('garde les valeurs saisies après un échec, pour les corriger sans tout ressaisir', async () => {
    const enregistrer = vi.fn().mockResolvedValue(false);
    const conteneur = await afficher({ enregistrer });
    const { form, ftp, sftp, enregistrer: soumission } = formulaire(conteneur);

    await saisir(ftp, TEMOIN);
    await saisir(sftp, AUTRE_TEMOIN);
    await soumettre(form);

    expect(enregistrer).toHaveBeenCalledTimes(1);
    expect(ftp.value).toBe(TEMOIN);
    expect(sftp.value).toBe(AUTRE_TEMOIN);
    expect(soumission.disabled).toBe(false);
  });

  it('garde la valeur pendant l’envoi et ne la vide qu’à la réponse', async () => {
    const reponse = differe<boolean>();
    const enregistrer = vi.fn().mockReturnValue(reponse.promesse);
    const conteneur = await afficher({ enregistrer });
    const { form, ftp } = formulaire(conteneur);

    await saisir(ftp, TEMOIN);
    await soumettre(form);
    expect(ftp.value).toBe(TEMOIN);

    await act(async () => {
      reponse.resoudre(true);
      await reponse.promesse;
    });
    expect(ftp.value).toBe('');
  });

  it('ignore une soumission sans saisie ni clé prête', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer });

    await soumettre(formulaire(conteneur).form);

    expect(enregistrer).not.toHaveBeenCalled();
  });

  it.each(['cle', 'enregistrement'] as const)(
    'ignore une soumission pendant une action en cours (%s)',
    async (action) => {
      const enregistrer = vi.fn().mockResolvedValue(true);
      const conteneur = await afficher({ enregistrer });
      const { form, ftp } = formulaire(conteneur);
      await saisir(ftp, TEMOIN);

      await monture?.rerendre(vue({ enregistrer, enCours: action }));
      expect(formulaire(conteneur).enregistrer.disabled).toBe(true);
      await soumettre(form);

      expect(enregistrer).not.toHaveBeenCalled();
      expect(ftp.value).toBe(TEMOIN);
    },
  );

  it('désactive les champs et les boutons pendant une action', async () => {
    const conteneur = await afficher({ enCours: 'enregistrement' });
    const { ftp, sftp } = formulaire(conteneur);

    expect(ftp.disabled).toBe(true);
    expect(sftp.disabled).toBe(true);
    for (const b of conteneur.querySelectorAll('button')) expect(b.disabled).toBe(true);
  });
});

describe('SecretsVue (DOM) — verrou de la navigation', () => {
  // Le contexte est stable d'un rendu à l'autre, comme celui du cadre (sinon l'effet se relance).
  function preparer() {
    const retirer = vi.fn();
    const verrouiller = vi.fn(() => retirer);
    const contexte = { verrouiller };
    const avecVerrou = (props: Partial<SecretsVueProps> = {}) => (
      <ContexteVerrouNavigation.Provider value={contexte}>
        {vue(props)}
      </ContexteVerrouNavigation.Provider>
    );
    return { retirer, verrouiller, avecVerrou };
  }

  it('pose le verrou pendant « Enregistrement… » et le retire ensuite', async () => {
    const { retirer, verrouiller, avecVerrou } = preparer();
    monture = await monter(avecVerrou());
    expect(verrouiller).not.toHaveBeenCalled();

    await monture.rerendre(avecVerrou({ enCours: 'enregistrement' }));
    expect(verrouiller).toHaveBeenCalledTimes(1);
    expect(retirer).not.toHaveBeenCalled();

    await monture.rerendre(avecVerrou({ enCours: null }));
    expect(retirer).toHaveBeenCalledTimes(1);
  });

  it('ne pose aucun verrou pendant le contrôle de la clé', async () => {
    const { verrouiller, avecVerrou } = preparer();
    monture = await monter(avecVerrou({ enCours: 'cle' }));
    expect(verrouiller).not.toHaveBeenCalled();
  });

  it('retire le verrou si le formulaire disparaît pendant l’enregistrement', async () => {
    const { retirer, avecVerrou } = preparer();
    monture = await monter(avecVerrou({ enCours: 'enregistrement' }));

    await monture.rerendre(avecVerrou({ deverrouille: false, enCours: null }));

    expect(retirer).toHaveBeenCalledTimes(1);
  });
});

describe('SecretsVue (DOM) — annulation', () => {
  it('appelle annuler et vide les champs au clic sur « Annuler »', async () => {
    const annuler = vi.fn();
    const conteneur = await afficher({ annuler });
    const { ftp, sftp } = formulaire(conteneur);
    await saisir(ftp, TEMOIN);
    await saisir(sftp, AUTRE_TEMOIN);

    await cliquer(bouton(conteneur, 'Annuler'));

    expect(annuler).toHaveBeenCalledTimes(1);
    expect(ftp.value).toBe('');
    expect(sftp.value).toBe('');
    expect(formulaire(conteneur).enregistrer.disabled).toBe(true);
  });

  it('ne rappelle pas enregistrer en annulant', async () => {
    const enregistrer = vi.fn().mockResolvedValue(true);
    const conteneur = await afficher({ enregistrer });
    await saisir(formulaire(conteneur).ftp, TEMOIN);

    await cliquer(bouton(conteneur, 'Annuler'));

    expect(enregistrer).not.toHaveBeenCalled();
  });

  it('ne fait rien au clic sur « Annuler » pendant une action (bouton désactivé)', async () => {
    const annuler = vi.fn();
    const conteneur = await afficher({ annuler, enCours: 'enregistrement' });
    const annulation = bouton(conteneur, 'Annuler');

    expect(annulation.disabled).toBe(true);
    await cliquer(annulation);

    expect(annuler).not.toHaveBeenCalled();
  });
});

describe('SecretsVue (DOM) — choix de la clé', () => {
  it('appelle choisirCle au clic sur « Choisir la clé… »', async () => {
    const choisirCle = vi.fn();
    const conteneur = await afficher({ choisirCle });

    await cliquer(bouton(conteneur, 'Choisir la clé…'));

    expect(choisirCle).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien au clic quand une action est en cours (bouton désactivé)', async () => {
    const choisirCle = vi.fn();
    const conteneur = await afficher({ choisirCle, enCours: 'enregistrement' });
    const choisir = bouton(conteneur, 'Choisir la clé…');

    expect(choisir.disabled).toBe(true);
    await cliquer(choisir);

    expect(choisirCle).not.toHaveBeenCalled();
  });

  it('garde les champs saisis pendant le choix de la clé', async () => {
    const conteneur = await afficher();
    const { ftp } = formulaire(conteneur);
    await saisir(ftp, TEMOIN);

    await monture?.rerendre(vue({ enCours: 'cle' }));
    await monture?.rerendre(vue({ clePrete: 'PPK version 2' }));

    expect(formulaire(conteneur).ftp.value).toBe(TEMOIN);
  });
});
