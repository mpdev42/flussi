// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListeAc056, OuvertureAc056 } from '@shared/types';
import {
  MESSAGES_REJET_VARIE,
  REPERES_REJET_VARIE,
  enWindows1252,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import {
  NOM_REJET,
  NOM_VEOS,
  anomalieFichierVide,
  fichierListe,
  ouvertureRejet,
  ouvertureReussie,
  ouvertureSynthetique,
} from '@/test/ac056';
import { cliquer, differe, monter, vider, type Monture } from '@/test/dom';
import { EcranAc056 } from './ac056';

// Services simulés : aucun appel à window.api
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
  enregistrerFichierAc056: vi.fn(),
  signalerModificationsAc056: vi.fn(),
}));

import { listerFichiersAc056, ouvrirFichierAc056 } from '@/services/ac056';

const NB = '\u00A0';
const FICHIER_VEOS = fichierListe();
const FICHIER_REJET = fichierListe({
  emplacement: 'out',
  nom: NOM_REJET,
  taille: 4_089_446,
  provenance: 'rejet',
});
const LISTE: ListeAc056 = { ok: true, in: [FICHIER_VEOS], out: [FICHIER_REJET] };

let monture: Monture | null = null;

beforeEach(() => {
  vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
});

afterEach(async () => {
  await monture?.demonter();
  monture = null;
  vi.resetAllMocks();
});

async function afficher(actif = true): Promise<HTMLElement> {
  monture = await monter(<EcranAc056 actif={actif} />);
  await vider();
  return monture.conteneur;
}

function boutons(conteneur: HTMLElement): HTMLButtonElement[] {
  return Array.from(conteneur.querySelectorAll('button'));
}

function bouton(conteneur: HTMLElement, texte: string): HTMLButtonElement {
  const trouve = boutons(conteneur).find((b) => b.textContent?.trim() === texte);
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`);
  return trouve;
}

function ligne(conteneur: HTMLElement, nom: string): HTMLButtonElement {
  const trouve = boutons(conteneur).find((b) => b.textContent?.includes(nom));
  if (!trouve) throw new Error(`Ligne « ${nom} » introuvable`);
  return trouve;
}

function titres(conteneur: HTMLElement, niveau: string): string[] {
  return Array.from(conteneur.querySelectorAll(niveau)).map((t) => t.textContent ?? '');
}

function groupe(conteneur: HTMLElement, nom: string): HTMLElement {
  const trouve = Array.from(conteneur.querySelectorAll<HTMLElement>('[role="group"]')).find(
    (g) => g.querySelector('h2')?.textContent === nom,
  );
  if (!trouve) throw new Error(`Carte « ${nom} » introuvable`);
  return trouve;
}

async function ouvrirFichier(
  conteneur: HTMLElement,
  ouverture: OuvertureAc056,
  nom = NOM_VEOS,
): Promise<void> {
  vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouverture);
  await cliquer(ligne(conteneur, nom));
  await vider();
}

describe('EcranAc056 — choix du fichier', () => {
  it('affiche le titre, la légende et une carte par dossier', async () => {
    const c = await afficher();

    expect(titres(c, 'h1')).toEqual(['Fichier AC056']);
    expect(c.textContent).toContain("Cliquez sur un fichier pour l'ouvrir.");
    expect(titres(c, 'h2')).toEqual(['IN', 'OUT']);
    expect(groupe(c, 'IN').textContent).toContain('1 fichier · du plus récent au plus ancien');
    expect(groupe(c, 'OUT').textContent).toContain('1 fichier · du plus récent au plus ancien');
  });

  it('affiche nom, date locale, taille et type de chaque fichier', async () => {
    const c = await afficher();

    const veos = ligne(groupe(c, 'IN'), NOM_VEOS);
    expect(veos.textContent).toContain('17/10/2026 à 08:05');
    expect(veos.textContent).toContain('612 Ko');
    expect(veos.textContent).toContain('VEOS');
    expect(veos.querySelector('.font-mono')?.textContent).toBe(NOM_VEOS);

    const rejet = ligne(groupe(c, 'OUT'), NOM_REJET);
    expect(rejet.textContent).toContain('3,9 Mo');
    expect(rejet.textContent).toContain('Rejet');
  });

  it('affiche un tiret pour une date et une taille inconnues', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue({
      ok: true,
      in: [fichierListe({ taille: null, modification: null })],
      out: [],
    });
    const c = await afficher();

    expect(ligne(c, NOM_VEOS).textContent).toContain('——');
  });

  it('pose le pluriel sur le nombre de fichiers', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue({
      ok: true,
      in: [FICHIER_VEOS, fichierListe({ nom: 'AC056COUR_20261016.txt' })],
      out: [],
    });
    const c = await afficher();

    expect(groupe(c, 'IN').textContent).toContain('2 fichiers · du plus récent au plus ancien');
  });

  it('ouvre le fichier au clic sur sa ligne, par emplacement logique et nom', async () => {
    vi.mocked(ouvrirFichierAc056).mockReturnValue(differe<OuvertureAc056>().promesse);
    const c = await afficher();

    await cliquer(ligne(c, NOM_REJET));

    expect(ouvrirFichierAc056).toHaveBeenCalledTimes(1);
    expect(ouvrirFichierAc056).toHaveBeenCalledWith({ emplacement: 'out', nom: NOM_REJET });
  });

  it('affiche un état vide avec « Actualiser » pour un dossier sans fichier', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue({ ok: true, in: [FICHIER_VEOS], out: [] });
    const c = await afficher();

    const sortie = groupe(c, 'OUT');
    expect(sortie.textContent).toContain('Aucun fichier dans OUT');
    expect(sortie.textContent).toContain('Aucun fichier');
    expect(sortie.querySelector('ul')).toBeNull();

    await cliquer(bouton(sortie, 'Actualiser'));
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });

  it('affiche l’échec de lecture des dossiers avec sa cause, et le « Réessayer »', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValueOnce({
      ok: false,
      erreur: { code: 'lecteur-indisponible', message: 'lecteur de travail non monté' },
    });
    const c = await afficher();

    expect(titres(c, 'h2')).toEqual(['Dossiers de travail inaccessibles']);
    expect(c.querySelector('[role="alert"]')?.textContent).toContain(
      'Lecteur de travail non monté.',
    );
    expect(c.querySelector('[role="group"]')).toBeNull();

    await cliquer(bouton(c, 'Réessayer'));
    await vider();

    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
    expect(titres(c, 'h2')).toEqual(['IN', 'OUT']);
  });

  it('affiche des cartes en attente pendant la lecture des dossiers', async () => {
    vi.mocked(listerFichiersAc056).mockReturnValue(differe<ListeAc056>().promesse);
    monture = await monter(<EcranAc056 actif />);
    const c = monture.conteneur;

    expect(titres(c, 'h1')).toEqual(['Fichier AC056']);
    expect(c.querySelectorAll('[role="group"][aria-busy="true"]')).toHaveLength(2);
    expect(c.querySelector('ul')).toBeNull();
  });

  it('relit toute la liste avec « Actualiser »', async () => {
    const c = await afficher();

    await cliquer(bouton(c, 'Actualiser'));
    await vider();

    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });

  it('relit la liste quand l’écran redevient actif', async () => {
    await afficher(true);
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await monture?.rerendre(<EcranAc056 actif={false} />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await monture?.rerendre(<EcranAc056 actif />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });

  it('affiche les fichiers par tranches de 100', async () => {
    const nombreux = Array.from({ length: 250 }, (_, i) =>
      fichierListe({ nom: `AC056COUR_${String(i).padStart(8, '0')}.txt` }),
    );
    vi.mocked(listerFichiersAc056).mockResolvedValue({ ok: true, in: nombreux, out: [] });
    const c = await afficher();
    const entree = groupe(c, 'IN');

    expect(entree.querySelectorAll('li')).toHaveLength(100);
    expect(entree.textContent).toContain('250 fichiers');
    expect(entree.textContent).toContain('100 sur 250');

    await cliquer(bouton(entree, 'Afficher les fichiers suivants'));
    expect(entree.querySelectorAll('li')).toHaveLength(200);

    await cliquer(bouton(entree, 'Afficher les fichiers suivants'));
    expect(entree.querySelectorAll('li')).toHaveLength(250);
    expect(boutons(entree).some((b) => b.textContent === 'Afficher les fichiers suivants')).toBe(
      false,
    );
  });

  it('n’affiche aucun bouton « Afficher les fichiers suivants » à 100 fichiers', async () => {
    const cent = Array.from({ length: 100 }, (_, i) =>
      fichierListe({ nom: `AC056COUR_${String(i).padStart(8, '0')}.txt` }),
    );
    vi.mocked(listerFichiersAc056).mockResolvedValue({ ok: true, in: cent, out: [] });
    const c = await afficher();

    expect(groupe(c, 'IN').querySelectorAll('li')).toHaveLength(100);
    expect(c.textContent).not.toContain('Afficher les fichiers suivants');
  });
});

describe('EcranAc056 — fichier ouvert', () => {
  it('affiche le chargement dans la barre de fichier, « Changer de fichier » désactivé', async () => {
    vi.mocked(ouvrirFichierAc056).mockReturnValue(differe<OuvertureAc056>().promesse);
    const c = await afficher();

    await cliquer(ligne(c, NOM_VEOS));

    expect(titres(c, 'h1')).toEqual([NOM_VEOS]);
    expect(c.querySelector('h1')?.className).toContain('font-mono');
    expect(c.textContent).toContain('IN');
    expect(c.textContent).toContain('VEOS');
    expect(c.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      `Chargement de ${NOM_VEOS}…`,
    );
    expect(c.textContent).toContain(`Chargement de ${NOM_VEOS}…`);
    expect(bouton(c, 'Changer de fichier').disabled).toBe(true);
    expect(c.querySelector('[role="group"]')).toBeNull();
  });

  it('affiche le nombre d’erreurs d’un fichier VEOS, avec l’alerte du fichier', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS, { erreurs: 3 }));

    expect(titres(c, 'h1')).toEqual([NOM_VEOS]);
    expect(c.textContent).toContain('3 erreurs');
    expect(c.textContent).not.toContain('Aucune erreur');
    expect(c.querySelector('[role="alert"]')).toBeNull();
    const alerte = c.querySelector('[role="status"]');
    expect(alerte?.textContent).toBe('Le fichier contient 3 erreurs à corriger.');
    expect(alerte?.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(bouton(c, 'Changer de fichier').disabled).toBe(false);
  });

  it('met « erreur » au singulier pour une seule erreur', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS, { erreurs: 1 }));

    expect(c.textContent).toContain('1 erreur');
    expect(c.textContent).not.toContain('1 erreurs');
    expect(c.querySelector('[role="status"]')?.textContent).toBe(
      'Le fichier contient 1 erreur à corriger.',
    );
  });

  it('affiche « Aucune erreur » et l’alerte de succès pour un fichier VEOS sans erreur', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS));

    expect(c.textContent).toContain('Aucune erreur');
    expect(c.querySelector('[role="status"]')?.textContent).toBe(
      'Le fichier ne contient aucune erreur.',
    );
  });

  it('affiche les lignes rejetées d’un rejet, sans contrôle ni alerte d’état', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureRejet(), NOM_REJET);

    expect(titres(c, 'h1')).toEqual([NOM_REJET]);
    expect(c.textContent).toContain('OUT');
    expect(c.textContent).toContain('Rejet');
    expect(c.textContent).toContain('5 lignes rejetées');
    expect(c.textContent).not.toMatch(/\d erreurs?\b/);
    expect(c.querySelector('[role="alert"]')).toBeNull();
    expect(c.querySelector('[role="status"]')).toBeNull();
    expect(boutons(c).map((b) => b.textContent?.trim())).not.toContain('Enregistrer');
  });

  /** Notes de page d'un rejet : celles qui ne sont dans aucune colonne (alertes, au-dessus). */
  function notesDePage(conteneur: HTMLElement): HTMLElement[] {
    return Array.from(conteneur.querySelectorAll<HTMLElement>('[role="note"]')).filter(
      (note) => note.closest('section') === null,
    );
  }

  it('liste dans une seule note les lignes rejetées hors des évènements, avec leur détail', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureRejet(), NOM_REJET);

    const notes = notesDePage(c);
    expect(notes).toHaveLength(1);
    expect(notes[0].querySelector('h2')?.textContent).toBe('1 ligne rejetée hors des évènements');
    const lignes = notes[0].querySelectorAll('li');
    expect(lignes).toHaveLength(1);
    expect(lignes[0].querySelector('p')?.textContent).toBe(
      `Ligne${NB}${REPERES_REJET_VARIE.ligne995} (995)${NB}· code inconnu`,
    );
    expect(lignes[0].textContent).toContain(
      `Message MSP${NB}: «${NB}${MESSAGES_REJET_VARIE.dossier}${NB}»`,
    );
    expect(lignes[0].textContent).toContain(
      `Explication${NB}: Erreur inconnue. Contactez le service informatique.`,
    );
  });

  it('met le pluriel et le code des lignes rejetées hors des évènements', async () => {
    const c = await afficher();
    const message = enWindows1252(MESSAGES_REJET_VARIE.err021);
    const lignes = lignesRejet({
      message: (code) => (code === '000' || code === '999' ? message : undefined),
    });

    await ouvrirFichier(c, ouvertureSynthetique(NOM_REJET, lignes, 'out'), NOM_REJET);

    const notes = notesDePage(c);
    expect(notes).toHaveLength(1);
    expect(notes[0].querySelector('h2')?.textContent).toBe('2 lignes rejetées hors des évènements');
    const designations = Array.from(notes[0].querySelectorAll('li > p:first-child')).map(
      (p) => p.textContent,
    );
    expect(designations).toHaveLength(2);
    expect(designations[0]).toMatch(new RegExp(`^Ligne${NB}\\d+ \\(000\\)${NB}· ERR021$`));
    expect(designations[1]).toMatch(new RegExp(`^Ligne${NB}\\d+ \\(999\\)${NB}· ERR021$`));
  });

  it('n’affiche aucune alerte de page pour un rejet dont toutes les lignes rejetées sont dans des évènements', async () => {
    const c = await afficher();
    const message = enWindows1252(MESSAGES_REJET_VARIE.err021);
    const lignes = lignesRejet({ message: (code) => (code === '110' ? message : undefined) });

    await ouvrirFichier(c, ouvertureSynthetique(NOM_REJET, lignes, 'out'), NOM_REJET);

    expect(notesDePage(c)).toHaveLength(0);
    expect(c.querySelector('[role="alert"], [role="status"]')).toBeNull();
    expect(titres(c, 'h2')).not.toContain('hors des évènements');
  });

  it('met « ligne rejetée » au singulier pour une seule ligne', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureReussie(NOM_REJET, { lignesRejetees: 1 }, 'out'), NOM_REJET);

    expect(c.textContent).toContain('1 ligne rejetée');
    expect(c.textContent).not.toContain('1 lignes rejetées');
  });

  it('signale une structure incorrecte et la marche à suivre', async () => {
    const c = await afficher();

    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS, { erreurs: 4, structure: 2 }));

    const alerte = c.querySelector('[role="alert"]');
    expect(alerte?.querySelector('h2')?.textContent).toBe(
      `Ce fichier est mal formé${NB}: relancez l'export VEOS`,
    );
    expect(alerte?.textContent).toContain(
      `L'enregistrement est refusé${NB}: corriger les champs ne répare pas la structure du fichier. Relancez l'export dans VEOS, puis rechargez le fichier.`,
    );
    expect(c.textContent).toContain('4 erreurs');
    // Fichier mal formé : tout est en lecture seule, rien « à corriger » dans les champs
    expect(c.querySelector('[role="status"]')?.textContent).toBe('Le fichier contient 4 erreurs.');
  });

  it('n’affiche pas l’alerte de structure pour un rejet', async () => {
    const c = await afficher();

    await ouvrirFichier(
      c,
      ouvertureReussie(NOM_REJET, { structure: 1, lignesRejetees: 1 }, 'out'),
      NOM_REJET,
    );

    expect(c.querySelector('[role="alert"]')).toBeNull();
  });

  it('signale un fichier vide comme illisible, sans compteur', async () => {
    const c = await afficher();

    await ouvrirFichier(
      c,
      ouvertureReussie(NOM_VEOS, {
        anomalies: [anomalieFichierVide()],
        erreurs: 1,
        structure: 1,
      }),
    );

    const alertes = c.querySelectorAll('[role="alert"]');
    expect(alertes).toHaveLength(1);
    expect(alertes[0].querySelector('h2')?.textContent).toBe(
      "Ce fichier n'est pas un fichier AC056 lisible",
    );
    expect(alertes[0].textContent).toContain('Le fichier est vide : aucune ligne AC056.');
    expect(c.textContent).not.toContain('1 erreur');
    expect(c.textContent).not.toContain('Aucune erreur');
  });

  it('affiche l’échec de chargement avec sa cause, et recharge au « Réessayer »', async () => {
    vi.mocked(ouvrirFichierAc056).mockResolvedValueOnce({
      ok: false,
      erreur: { code: 'introuvable', message: 'fichier introuvable' },
    });
    const c = await afficher();
    await cliquer(ligne(c, NOM_VEOS));
    await vider();

    expect(titres(c, 'h1')).toEqual([NOM_VEOS]);
    const alerte = c.querySelector('[role="alert"]');
    expect(alerte?.querySelector('h2')?.textContent).toBe("Ce fichier n'a pas pu être chargé");
    expect(alerte?.textContent).toContain('Fichier introuvable.');
    expect(c.textContent).toContain('VEOS');

    vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_VEOS, { erreurs: 2 }));
    await cliquer(bouton(c, 'Réessayer'));
    await vider();

    expect(ouvrirFichierAc056).toHaveBeenCalledTimes(2);
    expect(c.querySelector('[role="alert"]')).toBeNull();
    expect(c.textContent).toContain('2 erreurs');
  });

  it('affiche un échec d’appel IPC sans reprendre le texte de l’exception', async () => {
    vi.mocked(ouvrirFichierAc056).mockRejectedValue(new Error('EPERM P:\\Transferts\\IN'));
    const c = await afficher();

    await cliquer(ligne(c, NOM_VEOS));
    await vider();

    const alerte = c.querySelector('[role="alert"]');
    expect(alerte?.textContent).toContain('Erreur inattendue à la lecture du fichier.');
    expect(c.textContent).not.toContain('Transferts');
  });

  it('revient au choix avec « Changer de fichier » et relit la liste', async () => {
    const c = await afficher();
    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS, { erreurs: 3 }));
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await cliquer(bouton(c, 'Changer de fichier'));
    await vider();

    expect(titres(c, 'h1')).toEqual(['Fichier AC056']);
    expect(titres(c, 'h2')).toEqual(['IN', 'OUT']);
    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });

  it('place le focus sur le titre quand on change de vue', async () => {
    const c = await afficher();
    await ouvrirFichier(c, ouvertureReussie(NOM_VEOS));
    expect(document.activeElement).toBe(c.querySelector('h1'));
    expect(document.activeElement?.textContent).toBe(NOM_VEOS);

    await cliquer(bouton(c, 'Changer de fichier'));
    await vider();
    expect(document.activeElement?.textContent).toBe('Fichier AC056');
  });
});
