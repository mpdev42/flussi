// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { MessageRejet } from '@shared/domain/ac056';
import { monter, type Monture } from '@/test/dom';

import { DetailRejet, EncadreRejet } from './encadre-rejet';

const NB = '\u00a0';

const SANS_EXPLICATION: MessageRejet = {
  message: 'Incohérence du centre de paiement',
  code: 'ERR009',
  explication: null,
};
const AVEC_EXPLICATION: MessageRejet = { ...SANS_EXPLICATION, explication: 'Texte validé.' };
const INCONNU: MessageRejet = {
  message: 'Garantie refusée.',
  code: null,
  explication: 'Erreur inconnue. Contactez le service informatique.',
};

let monture: Monture | null = null;

afterEach(async () => {
  await monture?.demonter();
  monture = null;
});

async function afficher(element: React.ReactElement): Promise<HTMLElement> {
  monture = await monter(element);
  return monture.conteneur;
}

describe('EncadreRejet', () => {
  it('est une note, avec un titre du niveau demandé et le code en police mono', async () => {
    const c = await afficher(<EncadreRejet rejet={SANS_EXPLICATION} niveau="h3" />);

    const note = c.querySelector('[role="note"]')!;
    expect(c.querySelector('[role="alert"]')).toBeNull();
    expect(note.querySelector('h3')?.textContent).toBe(`Ligne rejetée par MSP${NB}· ERR009`);
    expect(note.querySelector('h3 .font-mono')?.textContent).toBe('ERR009');
  });

  it('écrit le message avec des espaces insécables avant « : » et dans les guillemets', async () => {
    const c = await afficher(<EncadreRejet rejet={SANS_EXPLICATION} niveau="h3" />);

    expect(c.querySelector('p')?.textContent).toBe(
      `Message MSP${NB}: «${NB}Incohérence du centre de paiement${NB}»`,
    );
  });

  it('rogne les espaces du message à l’affichage seulement', async () => {
    const rejet: MessageRejet = { ...SANS_EXPLICATION, message: '  Incohérence du centre \t' };
    const c = await afficher(<EncadreRejet rejet={rejet} niveau="h3" />);

    expect(c.querySelector('p')?.textContent).toBe(
      `Message MSP${NB}: «${NB}Incohérence du centre${NB}»`,
    );
    expect(rejet.message).toBe('  Incohérence du centre \t');
  });

  it('n’affiche pas la ligne « Explication » quand aucun texte n’est validé', async () => {
    const c = await afficher(<EncadreRejet rejet={SANS_EXPLICATION} niveau="h3" />);

    expect(c.querySelectorAll('p')).toHaveLength(1);
    expect(c.textContent).not.toContain('Explication');
  });

  it('affiche l’explication quand un texte est validé', async () => {
    const c = await afficher(<EncadreRejet rejet={AVEC_EXPLICATION} niveau="h2" />);

    expect(c.querySelector('h2')?.textContent).toBe(`Ligne rejetée par MSP${NB}· ERR009`);
    expect(c.querySelectorAll('p')[1].textContent).toBe(`Explication${NB}: Texte validé.`);
  });

  it('écrit « code inconnu » et l’erreur inconnue pour un message sans code', async () => {
    const c = await afficher(<EncadreRejet rejet={INCONNU} niveau="h3" />);

    expect(c.querySelector('h3')?.textContent).toBe(`Ligne rejetée par MSP${NB}· code inconnu`);
    expect(c.querySelector('h3 .font-mono')).toBeNull();
    expect(c.textContent).toContain(
      `Explication${NB}: Erreur inconnue. Contactez le service informatique.`,
    );
  });

  it('reprend le sujet donné dans le titre', async () => {
    const c = await afficher(
      <EncadreRejet rejet={SANS_EXPLICATION} niveau="h2" sujet="Ligne 10 (990) de l’évènement" />,
    );

    expect(c.querySelector('h2')?.textContent).toBe(
      `Ligne 10 (990) de l’évènement rejetée par MSP${NB}· ERR009`,
    );
  });
});

describe('DetailRejet', () => {
  it('ne rend que le message sans explication, et les deux lignes avec', async () => {
    const sans = await afficher(<DetailRejet rejet={SANS_EXPLICATION} />);
    expect(sans.querySelectorAll('p')).toHaveLength(1);
    await monture?.demonter();

    const avec = await afficher(<DetailRejet rejet={AVEC_EXPLICATION} />);
    expect(avec.querySelectorAll('p')).toHaveLength(2);
  });
});
