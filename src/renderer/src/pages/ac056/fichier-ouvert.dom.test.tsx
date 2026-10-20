// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSIGNE_VEOS,
  saisirChamp,
  type AnalyseAc056,
  type AnomalieAc056,
} from '@shared/domain/ac056';
import type { ListeAc056, OuvertureAc056 } from '@shared/types';
import { lignesCompletes } from '@shared/test/ac056-synthetique';
import { avecChamp } from '@shared/test/controle-ac056';
import {
  NOM_VEOS,
  fichierListe,
  lignesAvecErreurs,
  ouvertureAvecAnomalies,
  ouvertureSynthetique,
} from '@/test/ac056';
import {
  annuler,
  appuyer,
  cliquer,
  monter,
  quitter,
  relacher,
  saisir,
  vider,
  type Monture,
} from '@/test/dom';
import { MESSAGE_SAISIE_INATTENDUE } from '@/hooks/use-fichier-ac056';
import { MESSAGE_AUCUNE_ERREUR } from './textes-ac056';
import { EcranAc056 } from './ac056';

// Le contrôle réel, sauf quand un test lui fait lever une exception
vi.mock('@shared/domain/ac056', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@shared/domain/ac056')>();
  return { ...reel, saisirChamp: vi.fn(reel.saisirChamp) };
});

// Services simulés : aucun appel à window.api
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
}));

import { listerFichiersAc056, ouvrirFichierAc056 } from '@/services/ac056';

const LISTE: ListeAc056 = { ok: true, in: [fichierListe()], out: [] };

let monture: Monture | null = null;

beforeEach(() => {
  vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
});

afterEach(async () => {
  await monture?.demonter();
  monture = null;
  vi.resetAllMocks();
});

async function ouvrir(ouverture: OuvertureAc056): Promise<HTMLElement> {
  vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouverture);
  monture = await monter(<EcranAc056 actif />);
  await vider();
  const c = monture.conteneur;
  const ligne = Array.from(c.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(NOM_VEOS),
  );
  await cliquer(ligne!);
  await vider();
  return c;
}

function colonneEvenements(c: HTMLElement): HTMLElement {
  return Array.from(c.querySelectorAll<HTMLElement>('section')).find(
    (s) => s.querySelector('h2')?.textContent === 'Évènements',
  )!;
}

function lignesEvenements(c: HTMLElement): HTMLButtonElement[] {
  // Boutons des évènements : ceux du premier niveau de la liste
  return Array.from(colonneEvenements(c).querySelectorAll<HTMLButtonElement>('ul > li > button'));
}

function detail(c: HTMLElement): HTMLElement {
  return c.querySelector<HTMLElement>('section[aria-label="Détail de l’évènement"]')!;
}

function onglets(zone: HTMLElement, nomListe: string): HTMLButtonElement[] {
  return Array.from(
    zone.querySelectorAll<HTMLButtonElement>(
      `[role="tablist"][aria-label="${nomListe}"] [role="tab"]`,
    ),
  );
}

function ongletSelectionne(zone: HTMLElement, nomListe: string): string {
  const actif = onglets(zone, nomListe).find((o) => o.getAttribute('aria-selected') === 'true');
  return actif?.querySelector('span')?.textContent ?? '';
}

function valeursChamps(zone: HTMLElement): Record<string, string> {
  const valeurs: Record<string, string> = {};
  zone.querySelectorAll<HTMLInputElement>('input').forEach((champ) => {
    const libelle = zone.querySelector(`label[for="${champ.id}"]`)?.textContent ?? '';
    valeurs[libelle] = champ.value;
  });
  return valeurs;
}

describe('FichierOuvert — colonne des évènements', () => {
  it('affiche un évènement par ligne avec dossier, n°, contrat et code, le premier sélectionné', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));

    const colonne = colonneEvenements(c);
    expect(colonne.querySelector('h2')?.textContent).toBe('Évènements');
    expect(colonne.textContent).toContain('4 évènements');
    const lignes = lignesEvenements(c);
    expect(lignes).toHaveLength(4);
    expect(lignes[0].textContent).toContain('00000001');
    expect(lignes[0].textContent).toContain('001');
    expect(lignes[0].textContent).toContain('CTR1');
    expect(lignes[0].getAttribute('aria-current')).toBe('true');
    expect(lignes[1].getAttribute('aria-current')).toBeNull();
    expect(lignes[2].textContent).toContain('CTR2');
  });

  it('marque en erreur les évènements concernés, avec leur nombre d’erreurs', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));

    const lignes = lignesEvenements(c);
    expect(lignes[0].textContent).not.toContain('erreur');
    expect(lignes[1].textContent).toContain('1 erreur');
    expect(lignes[2].textContent).toContain('1 erreur');
    expect(lignes[3].textContent).not.toContain('erreur');
  });

  it('affiche les évènements par tranches de 100', async () => {
    // 125 dossiers de 2 évènements
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes({ dossiers: 125 })));

    expect(lignesEvenements(c)).toHaveLength(100);
    expect(colonneEvenements(c).textContent).toContain('250 évènements');
    expect(colonneEvenements(c).textContent).toContain('100 sur 250');

    const suivants = Array.from(colonneEvenements(c).querySelectorAll('button')).find(
      (b) => b.textContent === 'Afficher les évènements suivants',
    )!;
    await cliquer(suivants);

    expect(lignesEvenements(c)).toHaveLength(200);
  });

  it('change d’évènement au clic et montre la sélection', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));

    await cliquer(lignesEvenements(c)[2]);

    expect(lignesEvenements(c)[2].getAttribute('aria-current')).toBe('true');
    expect(lignesEvenements(c)[0].getAttribute('aria-current')).toBeNull();
    expect(detail(c).textContent).toContain('CTR2');
  });
});

describe('FichierOuvert — onglets et fiche', () => {
  it('ouvre la fiche 100 d’un fichier sans erreur, en lecture seule', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));
    const zone = detail(c);

    expect(onglets(zone, 'Entités de l’évènement').map((o) => o.textContent)).toEqual([
      'Bénéficiaires',
      '100',
      '110',
      '115',
      '120',
      'Coordonnées',
      '130',
      '135',
      '155',
      '180',
    ]);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('100');
    expect(zone.querySelector('h2')?.textContent).toBe('100 · Identification de l’évènement');
    expect(zone.textContent).toContain('Ligne 3');
    expect(valeursChamps(zone)['N° contrat']).toBe('CTR1');
    expect(Array.from(zone.querySelectorAll('input')).every((i) => i.readOnly)).toBe(true);
    expect(zone.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      onglets(zone, 'Entités de l’évènement')[1].id,
    );
  });

  it('ouvre la première fiche en erreur d’un évènement et marque le champ', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));

    await cliquer(lignesEvenements(c)[1]);

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('120');
    const ongletEnErreur = onglets(zone, 'Entités de l’évènement')[4];
    expect(ongletEnErreur.textContent).toContain('1 erreur');
    expect(zone.querySelector('h2')?.textContent).toBe('120 · Adresse principale');
    const champ = Array.from(zone.querySelectorAll<HTMLInputElement>('input')).find(
      (i) => i.value === '7500',
    )!;
    expect(champ.getAttribute('aria-invalid')).toBe('true');
    const message = zone.querySelector(`#${CSS.escape(champ.id)}-error`);
    expect(message?.textContent).not.toBe('');
    expect(zone.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);
  });

  it('ouvre le bénéficiaire en erreur, avec sa liste sous l’évènement', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));

    await cliquer(lignesEvenements(c)[2]);

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('Bénéficiaires');
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('405');
    expect(zone.querySelector('h2')?.textContent).toBe('405 · Nom de l’assuré');
    expect(valeursChamps(zone)['Nom']).toBe('DUP!ONT');
    expect(zone.textContent).toContain('Bénéficiaire');

    const liste = colonneEvenements(c).querySelector('ul[aria-labelledby]')!;
    const beneficiaires = Array.from(liste.querySelectorAll('button'));
    expect(beneficiaires).toHaveLength(2);
    expect(beneficiaires[0].textContent).toContain('ASSPRI');
    expect(beneficiaires[0].textContent).toContain('DUPONT TEST');
    expect(beneficiaires[0].getAttribute('aria-current')).toBeNull();
    expect(beneficiaires[1].textContent).toContain('CONJOI');
    expect(beneficiaires[1].getAttribute('aria-current')).toBe('true');
    expect(beneficiaires[1].textContent).toContain('1 erreur');
  });

  it('change de bénéficiaire et d’onglet du bénéficiaire', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));
    const zone = detail(c);
    await cliquer(onglets(zone, 'Entités de l’évènement')[0]);
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('400');
    expect(valeursChamps(zone)['Type assuré']).toBe('ASSPRI - Assuré principal');

    await cliquer(
      Array.from(
        colonneEvenements(c).querySelectorAll('ul[aria-labelledby] button'),
      )[1] as HTMLElement,
    );
    expect(valeursChamps(zone)['Type assuré']).toBe('CONJOI - Conjoint');

    await cliquer(onglets(zone, 'Entités du bénéficiaire')[2]);
    expect(zone.querySelector('h2')?.textContent).toBe('405 · Nom de l’assuré');
  });

  it('affiche la liste des coordonnées et sélectionne un élément au clic', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));
    const zone = detail(c);

    await cliquer(onglets(zone, 'Entités de l’évènement')[5]);

    const liste = zone.querySelector('ul[aria-label="Coordonnées"]')!;
    const elements = Array.from(liste.querySelectorAll('button'));
    expect(elements).toHaveLength(2);
    expect(elements[0].getAttribute('aria-current')).toBe('true');
    expect(elements[0].textContent).toContain('test1@example.invalid');
    expect(valeursChamps(zone)['Valeur']).toBe('test1@example.invalid');

    await cliquer(elements[1]);

    expect(elements[1].getAttribute('aria-current')).toBe('true');
    expect(valeursChamps(zone)['Valeur']).toBe('test2@example.invalid');
    expect(zone.querySelector('h2')?.textContent).toBe('125 · Communications principales');
  });

  it('laisse visible et désactivé l’onglet d’une entité absente', async () => {
    const lignes = lignesCompletes().filter(
      (ligne) =>
        !(
          ligne.slice(22, 25) === '155' &&
          ligne.slice(9, 17) === '00000001' &&
          ligne.slice(17, 20) === '001'
        ),
    );
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignes));

    const onglet155 = onglets(detail(c), 'Entités de l’évènement')[8];
    expect(onglet155.textContent).toContain('155');
    expect(onglet155.disabled).toBe(true);
    expect(onglet155.closest('[title]')?.getAttribute('title')).toBe(
      'Entité absente de cet évènement',
    );
  });

  it('affiche la fiche 411 sans champ', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesCompletes()));
    const zone = detail(c);
    await cliquer(onglets(zone, 'Entités de l’évènement')[0]);

    await cliquer(onglets(zone, 'Entités du bénéficiaire')[4]);

    expect(zone.querySelector('h2')?.textContent).toBe('411 · Attestation ACS de l’assuré');
    expect(zone.textContent).toContain('Aucun champ affiché pour cette entité.');
  });

  it('encadre les erreurs de la 990 au-dessus des onglets', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => {
      const ligne990 = analyse.fichier.lignes.find((l) => l.code === '990')!;
      return [
        {
          code: 'caractere-interdit',
          ligne: ligne990.numero,
          message: 'Erreur de test.',
          bloquante: true,
        },
      ];
    });
    const c = await ouvrir(ouverture);

    const zone = detail(c);
    const encadre = zone.querySelector('[role="note"]')!;
    expect(encadre.querySelector('h2')?.textContent).toContain('1 erreur');
    expect(encadre.textContent).toContain('Erreur de test.');
    expect(lignesEvenements(c)[0].textContent).toContain('1 erreur');
    expect(encadre.compareDocumentPosition(zone.querySelector('[role="tablist"]')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe('FichierOuvert — alertes du fichier', () => {
  it('signale les erreurs hors des évènements, sans détail', async () => {
    // Début et fin de fichier (000 et 999) : rattachés à aucun évènement
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => [
      erreurSur(numeroDe(analyse, '000', 0)),
      erreurSur(numeroDe(analyse, '999', 0)),
    ]);
    const c = await ouvrir(ouverture);

    const alerte = c.querySelector('[role="alert"]')!;
    expect(alerte.querySelector('h2')?.textContent).toBe('2 erreurs hors des évènements');
    expect(alerte.textContent).not.toContain('Erreur de test');
  });

  it('met « erreur » au singulier pour une seule erreur hors des évènements', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => [
      erreurSur(numeroDe(analyse, '000', 0)),
    ]);
    const c = await ouvrir(ouverture);

    expect(c.querySelector('[role="alert"] h2')?.textContent).toBe('1 erreur hors des évènements');
  });

  it('n’affiche pas la navigation pour un fichier de rejet', async () => {
    const c = await ouvrir(
      ouvertureSynthetique('AC056COUR_REJ_20261017.txt', lignesCompletes(), 'out'),
    );

    expect(c.querySelector('section')).toBeNull();
  });
});

/** Champ de la fiche affichée, repéré par son libellé. */
function champ(zone: HTMLElement, libelle: string): HTMLInputElement {
  const etiquette = Array.from(zone.querySelectorAll('label')).find(
    (l) => l.textContent === libelle,
  )!;
  return zone.querySelector<HTMLInputElement>(`#${CSS.escape(etiquette.htmlFor)}`)!;
}

function messageDuChamp(zone: HTMLElement, input: HTMLInputElement): string | null {
  return zone.querySelector(`#${CSS.escape(input.id)}-error`)?.textContent ?? null;
}

/** Barre du fichier : nom, dossier, type et compteur d'erreurs. */
function barre(c: HTMLElement): string {
  return c.querySelector('h1')!.parentElement!.textContent ?? '';
}

function boutonChanger(c: HTMLElement): HTMLButtonElement {
  return Array.from(c.querySelectorAll('button')).find(
    (b) => b.textContent === 'Changer de fichier',
  )!;
}

function dialogue(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[role="alertdialog"]');
}

function boutonDialogue(libelle: string): HTMLButtonElement {
  return Array.from(dialogue()!.querySelectorAll('button')).find((b) => b.textContent === libelle)!;
}

describe('FichierOuvert — correction des champs à la sortie du champ', () => {
  it('corrige un champ en erreur à la sortie et met à jour tous les compteurs', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    expect(codePostal.readOnly).toBe(false);
    expect(codePostal.maxLength).toBe(5);
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(messageDuChamp(zone, codePostal)).toContain('5 chiffres');
    expect(barre(c)).toContain('2 erreurs');

    await saisir(codePostal, '75001');
    // Rien n'est appliqué tant que le champ n'est pas quitté
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(barre(c)).toContain('2 erreurs');
    await quitter(codePostal);

    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(messageDuChamp(zone, codePostal)).toBeNull();
    expect(codePostal.value).toBe('75001');
    // Un champ corrigé reste modifiable pendant la session, sans marquage
    expect(codePostal.readOnly).toBe(false);
    expect(zone.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
    expect(onglets(zone, 'Entités de l’évènement')[4].textContent).not.toContain('erreur');
    expect(lignesEvenements(c)[1].textContent).not.toContain('erreur');
    expect(lignesEvenements(c)[2].textContent).toContain('1 erreur');
    expect(barre(c)).toContain('1 erreur');
    expect(barre(c)).not.toContain('2 erreurs');
    // La sélection ne saute pas après la correction
    expect(lignesEvenements(c)[1].getAttribute('aria-current')).toBe('true');
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('120');
    expect(c.querySelector('[role="status"]')?.textContent).toBe(
      'Le fichier contient 1 erreur à corriger.',
    );
  });

  it('affiche « Aucune erreur » et l’alerte de succès à la dernière correction', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    await saisir(champ(detail(c), 'Code postal'), '75001');
    await quitter(champ(detail(c), 'Code postal'));

    await cliquer(lignesEvenements(c)[2]);
    const zone = detail(c);
    const nom = champ(zone, 'Nom');
    expect(nom.value).toBe('DUP!ONT');
    expect(nom.readOnly).toBe(false);
    await saisir(nom, 'DUPONT');
    await quitter(nom);

    const beneficiaires = Array.from(
      colonneEvenements(c).querySelectorAll('ul[aria-labelledby] button'),
    );
    expect(beneficiaires[1].textContent).not.toContain('erreur');
    expect(onglets(zone, 'Entités du bénéficiaire')[2].textContent).not.toContain('erreur');
    expect(lignesEvenements(c)[2].textContent).not.toContain('erreur');
    expect(barre(c)).toContain('Aucune erreur');
    expect(c.querySelector('[role="status"]')?.textContent).toContain(
      'Le fichier ne contient aucune erreur.',
    );
    // Pas d’enchaînement automatique vers une autre erreur ou un autre évènement
    expect(lignesEvenements(c)[2].getAttribute('aria-current')).toBe('true');
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('405');
  });

  it('garde la même alerte de fichier, de même forme, avant et après la dernière correction', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    const alerte = () => c.querySelector<HTMLElement>('[role="status"]')!;
    const forme = (a: HTMLElement) => ({
      enfants: Array.from(a.children).map((e) => e.tagName.toLowerCase()),
      titres: a.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      lignes: a.querySelector('[class*="text-sm"]')?.children.length ?? 0,
    });
    const avant = alerte();
    expect(avant.textContent).toBe('Le fichier contient 2 erreurs à corriger.');
    expect(avant.className).toContain('bg-error-bg');
    const formeAvant = forme(avant);
    expect(formeAvant.enfants).toEqual(['svg', 'div']);
    expect(formeAvant.titres).toBe(0);
    const nombreAlertes = c.querySelectorAll('[role="status"], [role="alert"]').length;

    await cliquer(lignesEvenements(c)[1]);
    await saisir(champ(detail(c), 'Code postal'), '75001');
    await quitter(champ(detail(c), 'Code postal'));
    await cliquer(lignesEvenements(c)[2]);
    await saisir(champ(detail(c), 'Nom'), 'DUPONT');
    await quitter(champ(detail(c), 'Nom'));

    const apres = alerte();
    expect(apres).toBe(avant);
    expect(apres.textContent).toBe(MESSAGE_AUCUNE_ERREUR);
    expect(apres.className).toContain('bg-success-bg');
    expect(forme(apres)).toEqual(formeAvant);
    expect(c.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(nombreAlertes);
  });

  it('n’applique rien quand le champ est quitté sans frappe', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const codePostal = champ(detail(c), 'Code postal');

    await quitter(codePostal);

    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(barre(c)).toContain('2 erreurs');
    await cliquer(boutonChanger(c));
    expect(dialogue()).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe('Fichier AC056');
  });

  it('applique une frappe qui revient au texte d’origine (parité Modified) sans corriger l’erreur', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const codePostal = champ(detail(c), 'Code postal');

    await saisir(codePostal, '7500x');
    await saisir(codePostal, '7500');
    await quitter(codePostal);

    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(barre(c)).toContain('2 erreurs');
    await cliquer(boutonChanger(c));
    expect(dialogue()).not.toBeNull();
  });

  it('refuse une saisie illisible, garde le texte saisi et explique le refus', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');

    await saisir(codePostal, '7�001');
    await quitter(codePostal);

    expect(codePostal.value).toBe('7�001');
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(messageDuChamp(zone, codePostal)).toContain('caractère illisible');
    expect(barre(c)).toContain('2 erreurs');
    // Le refus n’a rien modifié : pas de confirmation à l’abandon
    await cliquer(boutonChanger(c));
    expect(dialogue()).toBeNull();
  });

  it('retire le refus quand la saisie suivante est acceptée', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    await saisir(codePostal, '7�001');
    await quitter(codePostal);

    await saisir(codePostal, '75001');
    await quitter(codePostal);

    expect(messageDuChamp(zone, codePostal)).toBeNull();
    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(barre(c)).toContain('1 erreur');
  });

  it('garde en lecture seule un champ non modifiable en erreur, avec la consigne VEOS', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => {
      const ligne100 = analyse.fichier.lignes.find((l) => l.code === '100')!;
      return [
        {
          code: 'caractere-interdit',
          ligne: ligne100.numero,
          message: 'Erreur de test.',
          bloquante: true,
          champ: 'numContratIndiv',
          consigne: `Caractère interdit. ${CONSIGNE_VEOS}`,
        },
      ];
    });
    const c = await ouvrir(ouverture);

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('100');
    const numContrat = champ(zone, 'N° contrat');
    expect(numContrat.readOnly).toBe(true);
    expect(numContrat.getAttribute('aria-invalid')).toBe('true');
    expect(messageDuChamp(zone, numContrat)).toContain(CONSIGNE_VEOS);
  });

  it('n’écrit la mention VEOS qu’une fois pour un champ non modifiable qui porte deux anomalies', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => {
      const ligne100 = numeroDe(analyse, '100', 0);
      const anomalie = (consigne: string): AnomalieAc056 => ({
        code: 'caractere-interdit',
        ligne: ligne100,
        message: 'Message de Lazarus.',
        bloquante: true,
        champ: 'numContratIndiv',
        consigne: `${consigne} ${CONSIGNE_VEOS}`,
      });
      return [anomalie('Premier défaut.'), anomalie('Second défaut.')];
    });
    const c = await ouvrir(ouverture);

    const zone = detail(c);
    const message = messageDuChamp(zone, champ(zone, 'N° contrat'))!;
    expect(message).toBe(`Premier défaut. Second défaut. ${CONSIGNE_VEOS}`);
    expect(message.split(CONSIGNE_VEOS)).toHaveLength(2);
  });

  it('affiche un message générique sous le champ quand le contrôle de la saisie lève une exception', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    vi.mocked(saisirChamp).mockImplementationOnce(() => {
      throw new Error('plantage avec la valeur 75001');
    });

    await saisir(codePostal, '75001');
    await quitter(codePostal);

    expect(MESSAGE_SAISIE_INATTENDUE).toBe('Saisie non appliquée : erreur inattendue.');
    expect(messageDuChamp(zone, codePostal)).toBe(MESSAGE_SAISIE_INATTENDUE);
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(codePostal.value).toBe('75001');
    expect(barre(c)).toContain('2 erreurs');
    expect(zone.textContent).not.toContain('plantage');
  });

  it('met tout en lecture seule quand le fichier est mal formé, avec la consigne VEOS', async () => {
    const ouverture = ouvertureSynthetique(NOM_VEOS, [...lignesAvecErreurs(), 'ligne trop courte']);
    expect(ouverture.ok && ouverture.analyse.structure).toBeGreaterThan(0);
    const c = await ouvrir(ouverture);
    await cliquer(lignesEvenements(c)[1]);

    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    expect(codePostal.readOnly).toBe(true);
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(messageDuChamp(zone, codePostal)).toContain('5 chiffres');
    expect(messageDuChamp(zone, codePostal)).toContain(CONSIGNE_VEOS);
    expect(Array.from(zone.querySelectorAll('input')).every((i) => i.readOnly)).toBe(true);
  });

  it('demande confirmation avant d’abandonner des corrections, avec le focus sur « Annuler »', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const codePostal = champ(detail(c), 'Code postal');
    await saisir(codePostal, '75001');
    await quitter(codePostal);

    await cliquer(boutonChanger(c));

    expect(dialogue()?.querySelector('h2')?.textContent).toBe('Abandonner les modifications ?');
    expect(dialogue()?.textContent).toContain(
      'Les corrections faites dans ce fichier ne sont pas enregistrées. Elles seront perdues.',
    );
    expect(document.activeElement).toBe(boutonDialogue('Annuler'));
    expect(c.querySelector('h1')?.textContent).toBe(NOM_VEOS);

    await cliquer(boutonDialogue('Annuler'));
    expect(dialogue()).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe(NOM_VEOS);
    expect(champ(detail(c), 'Code postal').value).toBe('75001');

    await cliquer(boutonChanger(c));
    await cliquer(boutonDialogue('Abandonner les modifications'));
    await vider();
    expect(dialogue()).toBeNull();
    expect(c.querySelector('h1')?.textContent).toBe('Fichier AC056');
  });

  it('garde le focus sur le champ suivant quand la tabulation applique la saisie', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    const ville = champ(zone, 'Ville');
    await act(async () => {
      codePostal.focus();
    });
    await saisir(codePostal, '75001');

    // La tabulation déplace le focus : le champ quitté applique sa saisie, la fiche se re-rend
    await act(async () => {
      ville.focus();
    });

    expect(barre(c)).toContain('1 erreur');
    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(champ(zone, 'Ville')).toBe(ville);
    expect(document.activeElement).toBe(ville);
  });
});

describe('FichierOuvert — sortie d’un champ à la souris', () => {
  /** Fiche 120 du second évènement : code postal frappé (2 erreurs dans le fichier), champ encore actif. */
  async function codePostalFrappe() {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const codePostal = champ(detail(c), 'Code postal');
    await act(async () => {
      codePostal.focus();
    });
    await saisir(codePostal, '75001');
    return { c, codePostal };
  }

  it('applique la saisie au relâchement du bouton, pas à l’appui', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    // Le bouton est enfoncé : rien n'est appliqué, la mise en page ne bouge pas
    expect(codePostal.getAttribute('aria-invalid')).toBe('true');
    expect(barre(c)).toContain('2 erreurs');

    await relacher(boutonChanger(c));
    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(barre(c)).toContain('1 erreur');
    expect(barre(c)).not.toContain('2 erreurs');
  });

  it('a appliqué la saisie avant le clic : « Changer de fichier » demande la confirmation', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    await relacher(boutonChanger(c));
    await cliquer(boutonChanger(c));

    expect(dialogue()).not.toBeNull();
  });

  it('applique la saisie tout de suite à la sortie au clavier', async () => {
    const { c, codePostal } = await codePostalFrappe();
    // Un appui puis un relâchement précédents ne retardent pas la sortie suivante
    await appuyer(boutonChanger(c));
    await relacher(boutonChanger(c));

    await quitter(codePostal);

    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(barre(c)).toContain('1 erreur');
  });

  it('applique la saisie si le pointeur est annulé', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    expect(barre(c)).toContain('2 erreurs');
    await annuler(boutonChanger(c));

    expect(codePostal.getAttribute('aria-invalid')).toBeNull();
    expect(barre(c)).toContain('1 erreur');
  });

  it('applique la saisie quand une touche est pressée alors que le relâchement est perdu', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    await act(async () => {
      document.body.dispatchEvent(new Event('keydown', { bubbles: true }));
    });

    expect(barre(c)).toContain('1 erreur');
  });

  it('applique la saisie en attente quand le champ est démonté avant le relâchement', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    expect(barre(c)).toContain('2 erreurs');
    // La fiche change (clic programmatique) : le champ disparaît avant que le bouton ne soit relâché
    await cliquer(onglets(detail(c), 'Entités de l’évènement')[0]);
    expect(codePostal.isConnected).toBe(false);
    expect(barre(c)).toContain('1 erreur');

    await relacher(boutonChanger(c));
    expect(barre(c)).toContain('1 erreur');
    expect(barre(c)).not.toContain('2 erreurs');
  });

  it('applique une seule fois la saisie en attente, au premier relâchement', async () => {
    const { c, codePostal } = await codePostalFrappe();

    await appuyer(boutonChanger(c));
    await quitter(codePostal);
    await relacher(boutonChanger(c));
    expect(barre(c)).toContain('1 erreur');

    // Un second relâchement n'applique rien de plus
    await relacher(boutonChanger(c));
    expect(barre(c)).toContain('1 erreur');
    expect(codePostal.value).toBe('75001');
  });
});

/** Numéro de ligne du n-ième (base 0) élément de code `code` du fichier. */
function numeroDe(analyse: AnalyseAc056, code: string, rang: number): number {
  return analyse.fichier.lignes.filter((l) => l.code === code)[rang]!.numero;
}

/** Anomalie de contrôle fictive (un code de structure rendrait le fichier mal formé), avec consigne. */
function erreurSur(ligne: number, nomChamp?: string): AnomalieAc056 {
  return {
    code: 'caractere-interdit',
    ligne,
    message: `Message de Lazarus, ligne ${ligne}.`,
    bloquante: true,
    consigne: `Erreur de test, ligne ${ligne}.`,
    ...(nomChamp === undefined ? {} : { champ: nomChamp }),
  };
}

describe('FichierOuvert — erreurs de la ligne qui ne tiennent à aucun champ affiché', () => {
  it('liste dans « Erreur de la ligne N » une anomalie de la divergence 5 sur un champ non affiché', async () => {
    // Tabulation dans le code producteur de la 100, champ que l'écran n'affiche pas
    const lignes = lignesCompletes();
    const indice = lignes.findIndex((l) => l.slice(22, 25) === '100');
    lignes[indice] = avecChamp(lignes[indice]!, '100', 'codeProducteur', 'AB\tCD');
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignes));

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('100');
    expect(onglets(zone, 'Entités de l’évènement')[1].textContent).toContain('1 erreur');
    expect(lignesEvenements(c)[0].textContent).toContain('1 erreur');
    const note = zone.querySelector('[role="note"]')!;
    expect(note.querySelector('h3')?.textContent).toBe(`Erreur de la ligne ${indice + 1}`);
    expect(note.querySelectorAll('li')).toHaveLength(1);
    expect(note.textContent).toContain('Caractère interdit');
    // Aucun champ affiché n'est marqué : le message n'est lié à aucun champ
    expect(zone.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
    expect(barre(c)).toContain('1 erreur');
  });

  it('ne montre pas l’encadré quand toutes les erreurs de la ligne tiennent à un champ affiché', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);

    expect(detail(c).querySelector('[role="note"]')).toBeNull();
  });

  it('garde l’encadré pour une anomalie sans champ, à côté du champ marqué : « Autre erreur »', async () => {
    const lignes = lignesCompletes();
    const numero = lignes.findIndex((l) => l.slice(22, 25) === '100') + 1;
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignes, () => [
      erreurSur(numero),
      erreurSur(numero, 'numContratIndiv'),
    ]);
    const c = await ouvrir(ouverture);

    const zone = detail(c);
    expect(zone.querySelector('[role="note"] h3')?.textContent).toBe(
      `Autre erreur de la ligne ${numero}`,
    );
    expect(zone.querySelectorAll('[role="note"] li')).toHaveLength(1);
    expect(zone.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);
    expect(messageDuChamp(zone, champ(zone, 'N° contrat'))).toContain('Erreur de test');
  });

  it('met « Autres erreurs » au pluriel quand un champ est marqué et que plusieurs erreurs n’en dépendent pas', async () => {
    const lignes = lignesCompletes();
    const numero = lignes.findIndex((l) => l.slice(22, 25) === '100') + 1;
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignes, () => [
      erreurSur(numero),
      erreurSur(numero),
      erreurSur(numero, 'numContratIndiv'),
    ]);
    const c = await ouvrir(ouverture);

    const note = detail(c).querySelector('[role="note"]')!;
    expect(note.querySelector('h3')?.textContent).toBe(`Autres erreurs de la ligne ${numero}`);
    expect(note.querySelectorAll('li')).toHaveLength(2);
  });

  it('met « Erreurs » au pluriel, sans « Autres », quand aucun champ affiché n’est marqué', async () => {
    const lignes = lignesCompletes();
    const numero = lignes.findIndex((l) => l.slice(22, 25) === '100') + 1;
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignes, () => [
      erreurSur(numero),
      erreurSur(numero),
    ]);
    const c = await ouvrir(ouverture);

    const note = detail(c).querySelector('[role="note"]')!;
    expect(note.querySelector('h3')?.textContent).toBe(`Erreurs de la ligne ${numero}`);
    expect(detail(c).querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('affiche une ligne brute sans champ, avec ses anomalies dans « Erreur(s) de la ligne N »', async () => {
    // 120 raccourcie : mauvaise longueur, ligne brute rattachée à son évènement par son code
    const lignes = lignesCompletes();
    const indice = lignes.findIndex((l) => l.slice(22, 25) === '120');
    lignes[indice] = lignes[indice]!.slice(0, 690);
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignes));

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('120');
    expect(zone.querySelector('h2')?.textContent).toBe('120 · Adresse principale');
    expect(zone.querySelectorAll('input')).toHaveLength(0);
    expect(zone.textContent).toContain('Les champs de cette ligne ne sont pas affichés');
    const note = zone.querySelector('[role="note"]')!;
    expect(note.querySelector('h3')?.textContent).toBe(`Erreur de la ligne ${indice + 1}`);
    expect(note.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(onglets(zone, 'Entités de l’évènement')[4].textContent).toContain('erreur');
  });
});

describe('FichierOuvert — éléments de liste en erreur', () => {
  it('marque la coordonnée en erreur sur l’élément et sur l’onglet, et la sélectionne à l’ouverture', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => [
      erreurSur(numeroDe(analyse, '125', 1), 'valeurCoordonneeCommunication'),
    ]);
    const c = await ouvrir(ouverture);

    const zone = detail(c);
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('Coordonnées');
    expect(onglets(zone, 'Entités de l’évènement')[5].textContent).toContain('1 erreur');
    const elements = Array.from(
      zone.querySelectorAll<HTMLButtonElement>('ul[aria-label="Coordonnées"] button'),
    );
    expect(elements).toHaveLength(2);
    expect(elements[0].textContent).not.toContain('erreur');
    expect(elements[1].textContent).toContain('1 erreur');
    expect(elements[1].getAttribute('aria-current')).toBe('true');
    expect(elements[0].getAttribute('aria-current')).toBeNull();
    expect(valeursChamps(zone)['Valeur']).toBe('test2@example.invalid');
    expect(lignesEvenements(c)[0].textContent).toContain('1 erreur');
  });

  it('compte les erreurs des garanties, critères et variables, et ouvre le premier élément en erreur de chaque liste', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => [
      erreurSur(numeroDe(analyse, '700', 1), 'codeProduit'),
      erreurSur(numeroDe(analyse, '485', 1), 'valeur'),
      erreurSur(numeroDe(analyse, '485', 1), 'code'),
      erreurSur(numeroDe(analyse, '490', 1), 'valeur'),
    ]);
    const c = await ouvrir(ouverture);
    const zone = detail(c);

    expect(lignesEvenements(c)[0].textContent).toContain('4 erreurs');
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('Bénéficiaires');
    expect(onglets(zone, 'Entités de l’évènement')[0].textContent).toContain('4 erreurs');
    const benef = onglets(zone, 'Entités du bénéficiaire');
    expect(benef.map((o) => o.querySelector('span')?.textContent)).toEqual([
      'Garanties',
      '400',
      '405',
      '410',
      '411',
      'Critères',
      'Variables souscription',
      '800',
    ]);
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('Garanties');
    expect(benef[0].textContent).toContain('1 erreur');
    expect(benef[5].textContent).toContain('2 erreurs');
    expect(benef[6].textContent).toContain('1 erreur');
    expect(benef[1].textContent).not.toContain('erreur');

    const elements = (nom: string) =>
      Array.from(zone.querySelectorAll<HTMLButtonElement>(`ul[aria-label="${nom}"] button`));

    // Garanties : la seconde est sélectionnée et marquée
    expect(elements('Garanties')[0].getAttribute('aria-current')).toBeNull();
    expect(elements('Garanties')[1].getAttribute('aria-current')).toBe('true');
    expect(elements('Garanties')[1].textContent).toContain('1 erreur');
    expect(elements('Garanties')[0].textContent).not.toContain('erreur');
    expect(zone.querySelector('h2')?.textContent).toBe('700 · Garantie');

    await cliquer(benef[5]);
    expect(elements('Critères')[1].getAttribute('aria-current')).toBe('true');
    expect(elements('Critères')[1].textContent).toContain('2 erreurs');
    expect(zone.querySelector('h2')?.textContent).toBe('485 · Critère');

    await cliquer(benef[6]);
    expect(elements('Variables souscription')[1].getAttribute('aria-current')).toBe('true');
    expect(elements('Variables souscription')[1].textContent).toContain('1 erreur');
    expect(zone.querySelector('h2')?.textContent).toBe('490 · Valeur souscription');

    // Un clic sur l'autre élément de la liste change la fiche, sans toucher aux compteurs
    await cliquer(elements('Variables souscription')[0]);
    expect(elements('Variables souscription')[0].getAttribute('aria-current')).toBe('true');
    expect(elements('Variables souscription')[1].textContent).toContain('1 erreur');
    expect(lignesEvenements(c)[0].textContent).toContain('4 erreurs');
  });

  it('retrouve l’élément en erreur en revenant sur le bénéficiaire, et ouvre le premier élément d’un bénéficiaire sans erreur', async () => {
    const ouverture = ouvertureAvecAnomalies(NOM_VEOS, lignesCompletes(), (analyse) => [
      erreurSur(numeroDe(analyse, '700', 1), 'codeProduit'),
    ]);
    const c = await ouvrir(ouverture);
    const zone = detail(c);
    const beneficiaires = () =>
      Array.from(
        colonneEvenements(c).querySelectorAll<HTMLButtonElement>('ul[aria-labelledby] button'),
      );
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('Garanties');

    // Second bénéficiaire, sans erreur : sous-onglet courant gardé, premier élément
    await cliquer(beneficiaires()[1]);
    expect(ongletSelectionne(zone, 'Entités du bénéficiaire')).toBe('Garanties');
    const garanties = () =>
      Array.from(zone.querySelectorAll<HTMLButtonElement>('ul[aria-label="Garanties"] button'));
    expect(garanties()[0].getAttribute('aria-current')).toBe('true');
    expect(garanties()[1].textContent).not.toContain('erreur');

    // Retour sur le premier : la garantie en erreur est de nouveau la sélection
    await cliquer(beneficiaires()[0]);
    expect(garanties()[1].getAttribute('aria-current')).toBe('true');
    expect(garanties()[1].textContent).toContain('1 erreur');
  });
});

describe('FichierOuvert — sortie d’un champ et navigation', () => {
  it('applique d’abord la saisie quand un clic sur un autre évènement suit la frappe', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    await act(async () => {
      codePostal.focus();
    });
    await saisir(codePostal, '75001');
    expect(barre(c)).toContain('2 erreurs');

    // Comme un clic de souris : le bouton prend le focus (le champ est quitté), puis le clic
    const autre = lignesEvenements(c)[2];
    await act(async () => {
      autre.focus();
    });
    await cliquer(autre);

    // La saisie a été appliquée avant la navigation : compteurs à jour, évènement 3 ouvert
    expect(barre(c)).toContain('1 erreur');
    expect(barre(c)).not.toContain('2 erreurs');
    expect(lignesEvenements(c)[1].textContent).not.toContain('erreur');
    expect(lignesEvenements(c)[2].getAttribute('aria-current')).toBe('true');
    expect(ongletSelectionne(detail(c), 'Entités du bénéficiaire')).toBe('405');
    // L'évènement quitté montre sa correction quand on y revient (onglet courant gardé : Bénéficiaires)
    await cliquer(lignesEvenements(c)[1]);
    await cliquer(onglets(detail(c), 'Entités de l’évènement')[4]);
    expect(champ(detail(c), 'Code postal').value).toBe('75001');
    expect(champ(detail(c), 'Code postal').getAttribute('aria-invalid')).toBeNull();
  });

  it('applique la saisie quand un clic sur un onglet suit la frappe', async () => {
    const c = await ouvrir(ouvertureSynthetique(NOM_VEOS, lignesAvecErreurs()));
    await cliquer(lignesEvenements(c)[1]);
    const zone = detail(c);
    const codePostal = champ(zone, 'Code postal');
    await act(async () => {
      codePostal.focus();
    });
    await saisir(codePostal, '75001');

    const ongletVoisin = onglets(zone, 'Entités de l’évènement')[1];
    await act(async () => {
      ongletVoisin.focus();
    });
    await cliquer(ongletVoisin);

    expect(barre(c)).toContain('1 erreur');
    expect(ongletSelectionne(zone, 'Entités de l’évènement')).toBe('100');
    expect(onglets(zone, 'Entités de l’évènement')[4].textContent).not.toContain('erreur');
  });
});
