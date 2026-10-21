// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexerLignes, saisirChamp, type AnalyseAc056 } from '@shared/domain/ac056';
import type { EnregistrementAc056, ListeAc056, OuvertureAc056 } from '@shared/types';
import { ContexteVerrouNavigation } from '@/components/verrou-navigation';
import {
  NOM_REJET,
  NOM_VEOS,
  anomalieFichierVide,
  enregistrementAJour,
  enregistrementEchec,
  enregistrementReussi,
  fichierListe,
  lignesAvecErreurs,
  ouvertureReussie,
  ouvertureSynthetique,
} from '@/test/ac056';
import {
  appuyerPointeur,
  cliquer,
  differe,
  monter,
  quitter,
  relacherPointeur,
  saisir,
  vider,
  type Differe,
  type Monture,
} from '@/test/dom';
import { EcranAc056 } from './ac056';
import { BarriereFichier } from './barriere-fichier';
import { messageEnregistreAvecErreurs } from './textes-ac056';

// Un test fait échouer l'affichage de la colonne des évènements pour éprouver la barrière d'erreur
const colonne = vi.hoisted(() => ({ planter: false }));
vi.mock('./colonne-evenements', async (importOriginal) => {
  const reel = await importOriginal<typeof import('./colonne-evenements')>();
  return {
    ...reel,
    ColonneEvenements: (props: Parameters<typeof reel.ColonneEvenements>[0]) => {
      if (colonne.planter) throw new Error('plantage avec la valeur 75001');
      return reel.ColonneEvenements(props);
    },
  };
});

// Services simulés : aucun appel à window.api
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
  enregistrerFichierAc056: vi.fn(),
  signalerModificationsAc056: vi.fn(),
}));

import { enregistrerFichierAc056, listerFichiersAc056, ouvrirFichierAc056 } from '@/services/ac056';

const NB = '\u00A0';
const LISTE: ListeAc056 = {
  ok: true,
  in: [fichierListe()],
  out: [fichierListe({ emplacement: 'out', nom: NOM_REJET, provenance: 'rejet' })],
};

let monture: Monture | null = null;

beforeEach(() => {
  vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
});

afterEach(async () => {
  await monture?.demonter();
  monture = null;
  colonne.planter = false;
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

async function ouvrir(
  ouverture: OuvertureAc056,
  nom = NOM_VEOS,
  contenu: (ecran: ReactElement) => ReactElement = (ecran) => ecran,
): Promise<HTMLElement> {
  vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouverture);
  monture = await monter(contenu(<EcranAc056 actif />));
  await vider();
  const c = monture.conteneur;
  const ligne = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes(nom));
  await cliquer(ligne!);
  await vider();
  return c;
}

/** Bouton de la page ou d'une boîte de dialogue (rendue hors du conteneur). */
function bouton(libelle: string): HTMLButtonElement {
  const trouve = Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === libelle,
  );
  if (!trouve) throw new Error(`Bouton « ${libelle} » introuvable`);
  return trouve;
}

function libellesBoutons(c: HTMLElement): string[] {
  return Array.from(c.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
}

function evenements(c: HTMLElement): HTMLButtonElement[] {
  const colonneEvenements = Array.from(c.querySelectorAll<HTMLElement>('section')).find(
    (s) => s.querySelector('h2')?.textContent === 'Évènements',
  )!;
  return Array.from(colonneEvenements.querySelectorAll<HTMLButtonElement>('ul > li > button'));
}

function detail(c: HTMLElement): HTMLElement {
  return c.querySelector<HTMLElement>('section[aria-label="Détail de l’évènement"]')!;
}

function champ(zone: HTMLElement, libelle: string): HTMLInputElement {
  const etiquette = Array.from(zone.querySelectorAll('label')).find(
    (l) => l.textContent === libelle,
  )!;
  return zone.querySelector<HTMLInputElement>(`#${CSS.escape(etiquette.htmlFor)}`)!;
}

async function corrigerCodePostal(c: HTMLElement, texte = '75001'): Promise<void> {
  await cliquer(evenements(c)[1]);
  const codePostal = champ(detail(c), 'Code postal');
  await saisir(codePostal, texte);
  await quitter(codePostal);
}

async function corrigerNom(c: HTMLElement): Promise<void> {
  await cliquer(evenements(c)[2]);
  const nom = champ(detail(c), 'Nom');
  await saisir(nom, 'DUPONT');
  await quitter(nom);
}

/** Alerte du fichier : une ligne, toujours présente pour un fichier VEOS lisible. */
function alerteFichier(c: HTMLElement): HTMLElement {
  return c.querySelector<HTMLElement>('[role="status"]')!;
}

/** Barre du fichier : nom, dossier, type, état et compteur. */
function barre(c: HTMLElement): string {
  return c.querySelector('h1')!.parentElement!.textContent ?? '';
}

async function resoudre(reponse: Differe<EnregistrementAc056>, valeur: EnregistrementAc056) {
  await act(async () => {
    reponse.resoudre(valeur);
  });
}

/**
 * Analyse du fichier telle que le main la renverrait après l'enregistrement : le code postal corrigé
 * et, avec `nom`, le nom du second bénéficiaire (plus aucune erreur).
 */
function analyseApresCorrections(ouverture: OuvertureAc056, nom: boolean): AnalyseAc056 {
  if (!ouverture.ok) throw new Error('ouverture en échec');
  const index = indexerLignes(ouverture.analyse.fichier);
  let analyse = ouverture.analyse;
  const corriger = (cible: string, texte: string) => {
    const ligne = analyse.anomalies.find((a) => a.champ === cible)!.ligne!;
    const resultat = saisirChamp(analyse, index, { ligne, champ: cible }, texte);
    if (!resultat.ok) throw new Error(resultat.erreur.message);
    analyse = resultat.analyse;
  };
  corriger('codePostalLocalite', '75001');
  if (nom) corriger('nom', 'DUPONT');
  return structuredClone(analyse);
}

describe('Barre du fichier — état et bouton « Enregistrer »', () => {
  it('affiche le badge « Modifié » après le badge de type, dès la première correction', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    expect(barre(c)).not.toContain('Modifié');

    await corrigerCodePostal(c);

    const texte = barre(c);
    expect(texte).toContain('Modifié');
    expect(texte.indexOf('VEOS')).toBeLessThan(texte.indexOf('Modifié'));
    expect(texte.indexOf('Modifié')).toBeLessThan(texte.indexOf('erreur'));
  });

  it('propose « Enregistrer » pour un fichier VEOS lisible, après « Changer de fichier »', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));

    expect(
      libellesBoutons(c).filter((b) => b === 'Changer de fichier' || b === 'Enregistrer'),
    ).toEqual(['Changer de fichier', 'Enregistrer']);
    // Actif même sans correction et même avec des erreurs restantes
    expect(bouton('Enregistrer').disabled).toBe(false);
    expect(bouton('Enregistrer').getAttribute('aria-busy')).toBeNull();
    expect(c.textContent).not.toContain('Fichier mal formé');
  });

  it('n’a pas de bouton « Enregistrer » pour un rejet', async () => {
    const c = await ouvrir(ouvertureReussie(NOM_REJET, { lignesRejetees: 2 }, 'out'), NOM_REJET);

    expect(libellesBoutons(c)).toContain('Changer de fichier');
    expect(libellesBoutons(c)).not.toContain('Enregistrer');
  });

  it('n’a pas de bouton « Enregistrer » pour un fichier vide', async () => {
    const c = await ouvrir(
      ouvertureReussie(NOM_VEOS, { anomalies: [anomalieFichierVide()], erreurs: 1, structure: 1 }),
    );

    expect(libellesBoutons(c)).toContain('Changer de fichier');
    expect(libellesBoutons(c)).not.toContain('Enregistrer');
    expect(barre(c)).not.toContain('Fichier mal formé');
  });

  it('n’a pas de bouton « Enregistrer » pendant le chargement', async () => {
    vi.mocked(ouvrirFichierAc056).mockReturnValue(differe<OuvertureAc056>().promesse);
    monture = await monter(<EcranAc056 actif />);
    await vider();
    const c = monture.conteneur;

    await cliquer(
      Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes(NOM_VEOS))!,
    );

    expect(libellesBoutons(c)).toContain('Changer de fichier');
    expect(libellesBoutons(c)).not.toContain('Enregistrer');
  });

  it('désactive « Enregistrer » pour un fichier mal formé, avec sa raison et la marche à suivre', async () => {
    const c = await ouvrir(
      ouvertureSynthetique(NOM_VEOS, [...lignesAvecErreurs(), 'ligne trop courte']),
    );

    expect(bouton('Enregistrer').disabled).toBe(true);
    expect(barre(c)).not.toContain('Fichier mal formé');
    expect(c.textContent).toContain('Fichier mal formé');
    expect(c.querySelector('[role="alert"]')?.textContent).toContain(
      `L'enregistrement est refusé${NB}: corriger les champs ne répare pas la structure du fichier.`,
    );
    await cliquer(bouton('Enregistrer'));
    expect(enregistrerFichierAc056).not.toHaveBeenCalled();
  });
});

describe('Enregistrement en cours', () => {
  it('occupe le bouton sans le désactiver, rend le contenu inerte et verrouille la navigation', async () => {
    const liberer = vi.fn();
    const verrouiller = vi.fn(() => liberer);
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture, NOM_VEOS, (ecran) => (
      <ContexteVerrouNavigation.Provider value={{ verrouiller }}>
        {ecran}
      </ContexteVerrouNavigation.Provider>
    ));
    await corrigerCodePostal(c);
    const reponse = differe<EnregistrementAc056>();
    vi.mocked(enregistrerFichierAc056).mockReturnValue(reponse.promesse);
    expect(verrouiller).not.toHaveBeenCalled();
    expect(c.querySelector('[inert]')).toBeNull();
    const enregistrer = bouton('Enregistrer');

    await cliquer(enregistrer);

    // Le même bouton, resté actif au sens du DOM
    expect(bouton('Enregistrement…')).toBe(enregistrer);
    expect(enregistrer.disabled).toBe(false);
    expect(enregistrer.getAttribute('aria-busy')).toBe('true');
    expect(enregistrer.getAttribute('aria-disabled')).toBe('true');
    expect(bouton('Changer de fichier').disabled).toBe(true);
    expect(verrouiller).toHaveBeenCalledTimes(1);
    expect(liberer).not.toHaveBeenCalled();
    const inerte = c.querySelector('[inert]');
    expect(inerte?.contains(detail(c))).toBe(true);
    expect(inerte?.contains(enregistrer)).toBe(false);

    // Un second clic est ignoré
    await cliquer(enregistrer);
    expect(enregistrerFichierAc056).toHaveBeenCalledTimes(1);

    await resoudre(reponse, enregistrementReussi(analyseApresCorrections(ouverture, false)));
    expect(bouton('Enregistrer')).toBe(enregistrer);
    expect(enregistrer.getAttribute('aria-busy')).toBeNull();
    expect(enregistrer.getAttribute('aria-disabled')).toBeNull();
    expect(c.querySelector('[inert]')).toBeNull();
    expect(bouton('Changer de fichier').disabled).toBe(false);
    expect(liberer).toHaveBeenCalledTimes(1);
  });

  it('envoie les corrections avec l’empreinte à l’appel', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementReussi(analyseApresCorrections(ouverture, false)),
    );

    await cliquer(bouton('Enregistrer'));
    await vider();

    expect(enregistrerFichierAc056).toHaveBeenCalledTimes(1);
    const demande = vi.mocked(enregistrerFichierAc056).mock.calls[0][0];
    expect(demande).toMatchObject({ emplacement: 'in', nom: NOM_VEOS });
    expect(demande.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(demande.corrections.map((c) => c.champ)).toEqual(['codePostalLocalite']);
  });
});

describe('Alertes de l’enregistrement', () => {
  it('annonce « Fichier enregistré » quand plus aucune erreur ne reste, puis le retire à la saisie suivante', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    await corrigerNom(c);
    expect(alerteFichier(c).textContent).toBe(
      `Le fichier ne contient plus d'erreur${NB}: vous pouvez l'enregistrer.`,
    );
    const alerte = alerteFichier(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementReussi(analyseApresCorrections(ouverture, true)),
    );

    await cliquer(bouton('Enregistrer'));
    await vider();

    expect(alerteFichier(c)).toBe(alerte);
    expect(alerte.textContent).toBe('Fichier enregistré');
    expect(alerte.className).toContain('bg-success-bg');
    expect(barre(c)).not.toContain('Modifié');
    expect(barre(c)).toContain('Aucune erreur');

    // Le champ reste modifiable ; la saisie suivante efface le retour sans changer la forme de l'alerte
    const nom = champ(detail(c), 'Nom');
    expect(nom.readOnly).toBe(false);
    await saisir(nom, 'DUPONT2');
    await quitter(nom);
    expect(alerteFichier(c)).toBe(alerte);
    expect(alerte.textContent).toBe(
      `Le fichier ne contient plus d'erreur${NB}: vous pouvez l'enregistrer.`,
    );
    expect(barre(c)).toContain('Modifié');
  });

  it('avertit qu’un fichier enregistré avec des erreurs ne pourra pas être déposé, au pluriel et au singulier', async () => {
    // Une seule correction : il reste une erreur (singulier)
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementReussi(analyseApresCorrections(ouverture, false)),
    );

    await cliquer(bouton('Enregistrer'));
    await vider();

    expect(alerteFichier(c).textContent).toBe(
      `Fichier enregistré avec 1 erreur${NB}: il ne pourra pas être déposé chez MSP tant qu'elle n'est pas corrigée.`,
    );
    expect(alerteFichier(c).className).toContain('bg-warning-bg');
    expect(barre(c)).toContain('1 erreur');
    expect(messageEnregistreAvecErreurs(2)).toBe(
      `Fichier enregistré avec 2 erreurs${NB}: il ne pourra pas être déposé chez MSP tant qu'elles ne sont pas corrigées.`,
    );
  });

  it('annonce que le fichier est déjà à jour quand le main n’a rien écrit', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementAJour(analyseApresCorrections(ouverture, false)),
    );

    await cliquer(bouton('Enregistrer'));
    await vider();

    expect(alerteFichier(c).textContent).toBe(
      `Le fichier est déjà à jour${NB}: rien à enregistrer`,
    );
    expect(alerteFichier(c).className).toContain('bg-info-bg');
  });

  it('explique l’échec avec sa cause, garde le « Modifié » et relance l’enregistrement au « Réessayer »', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
      enregistrementEchec('lecteur de travail non monté'),
    );

    await cliquer(bouton('Enregistrer'));
    await vider();

    const alerte = c.querySelector('[role="alert"]');
    expect(alerte?.querySelector('h2')?.textContent).toBe(
      `Enregistrement impossible${NB}: le fichier n'a pas été modifié`,
    );
    expect(alerte?.textContent).toContain('Lecteur de travail non monté.');
    expect(barre(c)).toContain('Modifié');
    expect(alerteFichier(c).textContent).toBe('Le fichier contient 1 erreur à corriger.');

    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
      enregistrementReussi(analyseApresCorrections(ouverture, false)),
    );
    await cliquer(bouton('Réessayer'));
    await vider();

    expect(enregistrerFichierAc056).toHaveBeenCalledTimes(2);
    expect(c.querySelector('[role="alert"]')).toBeNull();
    expect(alerteFichier(c).textContent).toContain('Fichier enregistré avec 1 erreur');
    expect(barre(c)).not.toContain('Modifié');
  });

  it('affiche un message générique quand l’appel échoue, sans reprendre le texte de l’exception', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockRejectedValue(new Error('EPERM P:\\Transferts\\IN'));

    await cliquer(bouton('Enregistrer'));
    await vider();

    const alerte = c.querySelector('[role="alert"]');
    expect(alerte?.textContent).toContain("Erreur inattendue à l'enregistrement du fichier.");
    // L'appel a échoué : on ignore si le fichier a été écrit, le titre ne dit pas « non modifié »
    expect(alerte?.querySelector('h2')?.textContent).toBe(
      `Enregistrement interrompu${NB}: vérifiez le fichier avant de réessayer`,
    );
    expect(c.textContent).not.toContain("le fichier n'a pas été modifié");
    expect(c.textContent).not.toContain('Transferts');
    // « Réessayer » reste proposé
    expect(libellesBoutons(c)).toContain('Réessayer');
  });

  it('garde « Réessayer » sous le pointeur quand une saisie est appliquée juste avant le clic', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(enregistrementEchec());
    await cliquer(bouton('Enregistrer'));
    await vider();
    expect(libellesBoutons(c)).toContain('Réessayer');

    // Une seconde correction en cours de frappe : l'appui sur « Réessayer » fait quitter le champ, la
    // saisie n'est appliquée qu'au relâchement (voir `sortie-champ.ts`)
    await cliquer(evenements(c)[2]);
    const nom = champ(detail(c), 'Nom');
    await saisir(nom, 'DUPONT');
    await appuyerPointeur(bouton('Réessayer'));
    await quitter(nom);
    await relacherPointeur(bouton('Réessayer'));

    // La saisie a été appliquée (« Modifié » reste, une seule erreur ne reste plus)...
    expect(alerteFichier(c).textContent).toContain('ne contient plus d');
    // ... et le bouton, resté en place, reçoit le clic
    const reessayer = bouton('Réessayer');
    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
      enregistrementReussi(analyseApresCorrections(ouverture, true)),
    );
    await cliquer(reessayer);
    await vider();

    expect(enregistrerFichierAc056).toHaveBeenCalledTimes(2);
    expect(
      vi
        .mocked(enregistrerFichierAc056)
        .mock.calls[1][0].corrections.map((correction) => correction.champ)
        .sort(),
    ).toEqual(['codePostalLocalite', 'nom']);
    expect(alerteFichier(c).textContent).toBe('Fichier enregistré');
  });

  it('remet le focus sur « Enregistrer » après « Réessayer » (le bouton cliqué disparaît)', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(enregistrementEchec());
    const enregistrer = bouton('Enregistrer');
    await cliquer(enregistrer);
    await vider();
    const reessayer = bouton('Réessayer');
    reessayer.focus();
    expect(document.activeElement).toBe(reessayer);
    vi.mocked(enregistrerFichierAc056).mockResolvedValueOnce(
      enregistrementReussi(analyseApresCorrections(ouverture, false)),
    );

    await cliquer(reessayer);
    await vider();

    expect(c.contains(reessayer)).toBe(false);
    expect(document.activeElement).toBe(enregistrer);
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('Confirmation à l’abandon', () => {
  it('cite le nombre de champs modifiés non enregistrés, jamais ceux déjà enregistrés', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    await corrigerCodePostal(c);
    await corrigerNom(c);

    await cliquer(bouton('Changer de fichier'));
    const dialogue = document.body.querySelector('[role="alertdialog"]');
    expect(dialogue?.textContent).toContain(
      `Les 2 champs modifiés de ${NOM_VEOS} ne sont pas enregistrés. Ils seront perdus si vous ouvrez un autre fichier.`,
    );
    await cliquer(bouton('Annuler'));

    // Après l'enregistrement, rien n'est perdu : pas de confirmation
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementReussi(analyseApresCorrections(ouverture, true)),
    );
    await cliquer(bouton('Enregistrer'));
    await vider();
    await cliquer(bouton('Changer de fichier'));
    await vider();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe('Fichier AC056');
  });
});

describe('BarriereFichier', () => {
  function Plante(): never {
    throw new Error('plantage avec la valeur 75001');
  }

  it('remplace le contenu par un message et l’action de secours, sans écran blanc', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {});
    monture = await monter(
      <BarriereFichier action={<button type="button">Changer de fichier</button>}>
        <Plante />
      </BarriereFichier>,
    );
    const c = monture.conteneur;

    expect(c.querySelector('h2')?.textContent).toBe('Affichage du fichier impossible');
    expect(c.textContent).toContain('Vos corrections sont conservées');
    expect(libellesBoutons(c)).toEqual(['Changer de fichier']);
    // Ni le message ni la valeur de l'exception ne sont affichés
    expect(c.textContent).not.toContain('75001');
    // Le journal de la console de la barrière ne cite pas le message de l'exception (celui de React,
    // hors de notre code, le fait)
    const siens = erreurs.mock.calls.filter(([message]) => String(message).startsWith('[ac056]'));
    expect(siens).toHaveLength(1);
    expect(siens.flat().join(' ')).not.toContain('75001');
  });

  it('repart de zéro quand la clé change (autre fichier)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    monture = await monter(
      <BarriereFichier key="a" action={null}>
        <Plante />
      </BarriereFichier>,
    );
    expect(monture.conteneur.querySelector('h2')).not.toBeNull();

    await monture.rerendre(
      <BarriereFichier key="b" action={null}>
        <p>Contenu</p>
      </BarriereFichier>,
    );

    expect(monture.conteneur.textContent).toBe('Contenu');
  });

  it('garde les corrections et « Enregistrer » quand l’affichage du fichier échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ouverture = ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs());
    const c = await ouvrir(ouverture);
    vi.mocked(enregistrerFichierAc056).mockResolvedValue(
      enregistrementReussi(analyseApresCorrections(ouverture, false)),
    );
    await cliquer(evenements(c)[1]);
    colonne.planter = true;
    const codePostal = champ(detail(c), 'Code postal');
    await saisir(codePostal, '75001');

    // La saisie est appliquée à la sortie du champ : l'affichage plante au rendu qui suit
    await quitter(codePostal);

    expect(c.querySelector('h2')?.textContent).toBe('Affichage du fichier impossible');
    expect(detail(c)).toBeNull();
    expect(barre(c)).toContain('Modifié');

    await cliquer(bouton('Enregistrer'));
    await vider();
    expect(enregistrerFichierAc056).toHaveBeenCalledTimes(1);
    expect(vi.mocked(enregistrerFichierAc056).mock.calls[0][0].corrections).toHaveLength(1);

    // « Changer de fichier » revient au choix (rien n'est à confirmer : le fichier vient d'être enregistré)
    await cliquer(bouton('Changer de fichier'));
    await vider();
    expect(c.querySelector('h1')?.textContent).toBe('Fichier AC056');
  });

  it('le « Changer de fichier » de la barrière demande aussi la confirmation tant que des corrections ne sont pas enregistrées', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(evenements(c)[1]);
    colonne.planter = true;
    const codePostal = champ(detail(c), 'Code postal');
    await saisir(codePostal, '75001');
    await quitter(codePostal);
    expect(c.querySelector('h2')?.textContent).toBe('Affichage du fichier impossible');
    // Le bouton de la barrière, pas celui de la barre du fichier (il est dans l'alerte)
    const bouton_ = () =>
      c.querySelector('[role="alert"]')!.querySelector<HTMLButtonElement>('button')!;
    expect(bouton_().textContent?.trim()).toBe('Changer de fichier');

    await cliquer(bouton_());

    const dialogue = document.body.querySelector('[role="alertdialog"]');
    expect(dialogue?.textContent).toContain(
      `Le champ modifié de ${NOM_VEOS} n'est pas enregistré. Il sera perdu si vous ouvrez un autre fichier.`,
    );
    // « Annuler » garde le fichier ouvert et les corrections
    await cliquer(bouton('Annuler'));
    await vider();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe(NOM_VEOS);
    expect(barre(c)).toContain('Modifié');

    // « Abandonner les modifications » revient au choix du fichier
    await cliquer(bouton_());
    await cliquer(bouton('Abandonner les modifications'));
    await vider();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe('Fichier AC056');
  });
});
