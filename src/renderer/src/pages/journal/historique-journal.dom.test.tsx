// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionJournal } from '@shared/types';
import { cliquer, monter, type Monture } from '@/test/dom';
import { HistoriqueJournalVue } from './historique-journal';

const SESSION: SessionJournal = {
  chemin: '2026/10/20261014-091500-dupont.txt',
  date: '2026-10-14',
  heure: '09:15:00',
  compte: 'dupont',
  enCours: false,
  copieConflitProbable: false,
};

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

async function afficher(onOuvrir: (session: SessionJournal) => void): Promise<HTMLElement> {
  monture = await monter(
    <HistoriqueJournalVue
      annees={['2026']}
      annee="2026"
      mois="10"
      sessions={[SESSION]}
      chargement={false}
      erreur={null}
      onChoisirAnnee={() => {}}
      onChoisirMois={() => {}}
      onOuvrir={onOuvrir}
      onReessayer={() => {}}
    />,
  );
  return monture.conteneur;
}

describe('HistoriqueJournalVue (DOM) — ouverture d’une session', () => {
  it('ouvre la session une seule fois au clic sur le bouton de la ligne', async () => {
    const onOuvrir = vi.fn();
    const conteneur = await afficher(onOuvrir);
    const bouton = conteneur.querySelector<HTMLButtonElement>(
      'button[aria-label="Ouvrir la session du 14/10/2026 à 09:15:00"]',
    );
    expect(bouton).not.toBeNull();

    await cliquer(bouton as HTMLButtonElement);

    expect(onOuvrir).toHaveBeenCalledTimes(1);
    expect(onOuvrir).toHaveBeenCalledWith(SESSION);
  });

  it('ouvre aussi la session au clic ailleurs sur la ligne', async () => {
    const onOuvrir = vi.fn();
    const conteneur = await afficher(onOuvrir);
    const cellule = [...conteneur.querySelectorAll('tbody td')].find(
      (td) => td.textContent === 'dupont',
    );

    await cliquer(cellule as HTMLElement);

    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it('ne rend la ligne elle-même pas focalisable', async () => {
    const conteneur = await afficher(vi.fn());
    const ligne = conteneur.querySelector('tbody tr');
    expect(ligne?.hasAttribute('tabindex')).toBe(false);
  });
});
