// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationPublique } from '@shared/types';
import { NOM_VEOS, fichierListe, ouvertureReussie } from '@/test/ac056';
import { cliquer, monter, vider, type Monture } from '@/test/dom';
import App from './App';

// Services simulés : aucun appel à window.api
vi.mock('@/services/parametres', () => ({ lireConfiguration: vi.fn() }));
vi.mock('@/services/journal', () => ({
  lireEtatJournal: vi.fn(),
  surEtatJournal: vi.fn(),
  lireLignesSession: vi.fn(),
  surLigneJournal: vi.fn(),
}));
vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
}));
// Écrans hors sujet : leurs propres services ne sont pas simulés ici
vi.mock('@/pages/journal/journal', () => ({ Journal: () => <h1>Écran Journal</h1> }));
vi.mock('@/pages/parametres/parametres', () => ({ Parametres: () => <h1>Écran Paramètres</h1> }));

import { listerFichiersAc056, ouvrirFichierAc056 } from '@/services/ac056';
import {
  lireEtatJournal,
  lireLignesSession,
  surEtatJournal,
  surLigneJournal,
} from '@/services/journal';
import { lireConfiguration } from '@/services/parametres';

const CONFIGURATION = { mode: 'recette', version: '0.3.0' } as ConfigurationPublique;

let monture: Monture | null = null;

beforeEach(() => {
  vi.mocked(lireConfiguration).mockResolvedValue(CONFIGURATION);
  vi.mocked(lireEtatJournal).mockResolvedValue({ enregistre: true, lignesEnAttente: 0 });
  vi.mocked(surEtatJournal).mockReturnValue(() => {});
  vi.mocked(lireLignesSession).mockResolvedValue([
    { rang: 1, heure: '08:00:00', niveau: 'TITRE', message: 'Démarrage' },
  ]);
  vi.mocked(surLigneJournal).mockReturnValue(() => {});
  vi.mocked(listerFichiersAc056).mockResolvedValue({
    ok: true,
    in: [fichierListe()],
    out: [],
  });
});

afterEach(async () => {
  await monture?.demonter();
  monture = null;
  vi.resetAllMocks();
});

async function afficher(): Promise<HTMLElement> {
  monture = await monter(<App />);
  await vider();
  return monture.conteneur;
}

function navigation(c: HTMLElement, libelle: string): HTMLButtonElement {
  const trouve = Array.from(c.querySelectorAll<HTMLButtonElement>('nav button')).find(
    (b) => b.textContent === libelle,
  );
  if (!trouve) throw new Error(`Entrée de navigation « ${libelle} » introuvable`);
  return trouve;
}

function titreVisible(c: HTMLElement): string[] {
  return Array.from(c.querySelectorAll('main h1'))
    .filter((h1) => !h1.closest('[hidden]'))
    .map((h1) => h1.textContent ?? '');
}

describe('App — écran Fichier AC056', () => {
  it('place « Fichier AC056 » entre Accueil et Journal', async () => {
    const c = await afficher();

    const libelles = Array.from(c.querySelectorAll('nav button')).map((b) => b.textContent);
    expect(libelles).toEqual(['Accueil', 'Fichier AC056', 'Journal', 'Paramètres']);
  });

  it('affiche le panneau du journal de la session à côté de l’écran courant', async () => {
    const c = await afficher();

    const panneau = c.querySelector('aside[aria-label="Journal de la session"]');
    expect(panneau?.textContent).toContain('Démarrage');
  });

  it('ne lit pas les dossiers de travail avant la première visite de l’écran', async () => {
    await afficher();

    expect(listerFichiersAc056).not.toHaveBeenCalled();
  });

  it('affiche le choix du fichier à l’ouverture de l’écran', async () => {
    const c = await afficher();

    await cliquer(navigation(c, 'Fichier AC056'));
    await vider();

    expect(titreVisible(c)).toEqual(['Fichier AC056']);
  });

  it('garde l’écran monté, masqué, avec le fichier ouvert, après un aller-retour', async () => {
    vi.mocked(ouvrirFichierAc056).mockResolvedValue(ouvertureReussie(NOM_VEOS, { erreurs: 2 }));
    const c = await afficher();
    await cliquer(navigation(c, 'Fichier AC056'));
    await vider();
    const ligne = Array.from(c.querySelectorAll('main button')).find((b) =>
      b.textContent?.includes(NOM_VEOS),
    );
    await cliquer(ligne as HTMLElement);
    await vider();
    expect(titreVisible(c)).toEqual([NOM_VEOS]);

    await cliquer(navigation(c, 'Journal'));
    await vider();

    // L'écran Journal est affiché, celui du fichier reste dans le document, masqué
    expect(titreVisible(c)).toEqual(['Écran Journal']);
    const masque = Array.from(c.querySelectorAll('main h1')).find(
      (h1) => h1.textContent === NOM_VEOS,
    );
    expect(masque?.closest('[hidden]')).not.toBeNull();

    await cliquer(navigation(c, 'Fichier AC056'));
    await vider();

    expect(titreVisible(c)).toEqual([NOM_VEOS]);
    expect(c.textContent).toContain('2 erreurs');
    expect(ouvrirFichierAc056).toHaveBeenCalledTimes(1);
  });

  it('relit la liste des fichiers au retour sur le choix du fichier', async () => {
    const c = await afficher();
    await cliquer(navigation(c, 'Fichier AC056'));
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await cliquer(navigation(c, 'Accueil'));
    await cliquer(navigation(c, 'Fichier AC056'));
    await vider();

    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });
});
