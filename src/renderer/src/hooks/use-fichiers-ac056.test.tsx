// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListeAc056 } from '@shared/types';
import { fichierListe, NOM_REJET } from '@/test/ac056';
import { monter, vider, type Monture } from '@/test/dom';
import { useFichiersAc056, type FichiersAc056 } from './use-fichiers-ac056';
import type { EtatChargement } from './use-chargement-stockage';

vi.mock('@/services/ac056', () => ({
  listerFichiersAc056: vi.fn(),
  ouvrirFichierAc056: vi.fn(),
}));

import { listerFichiersAc056 } from '@/services/ac056';

const LISTE: ListeAc056 = {
  ok: true,
  in: [fichierListe()],
  out: [fichierListe({ emplacement: 'out', nom: NOM_REJET, provenance: 'rejet' })],
};

let monture: Monture | null = null;
const sonde: { etat?: EtatChargement<FichiersAc056> } = {};

function Sonde({ actif }: { actif: boolean }) {
  const valeur = useFichiersAc056(actif);
  useEffect(() => {
    sonde.etat = valeur;
  });
  return null;
}

function etat(): EtatChargement<FichiersAc056> {
  if (!sonde.etat) throw new Error('hook non monté');
  return sonde.etat;
}

beforeEach(() => {
  sonde.etat = undefined;
});

afterEach(async () => {
  await monture?.demonter();
  monture = null;
  vi.resetAllMocks();
});

describe('useFichiersAc056', () => {
  it('charge les fichiers de IN et de OUT', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
    monture = await monter(<Sonde actif />);
    await vider();

    expect(etat().chargement).toBe(false);
    expect(etat().erreur).toBeNull();
    expect(etat().valeur).toEqual({ in: LISTE.ok ? LISTE.in : [], out: LISTE.ok ? LISTE.out : [] });
  });

  it('expose la cause lisible quand les dossiers sont inaccessibles', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue({
      ok: false,
      erreur: { code: 'lecteur-indisponible', message: 'lecteur de travail non monté' },
    });
    monture = await monter(<Sonde actif />);
    await vider();

    expect(etat().erreur).toBe('lecteur de travail non monté');
    expect(etat().valeur).toBeNull();
  });

  it('transforme une exception IPC en erreur affichable', async () => {
    vi.mocked(listerFichiersAc056).mockRejectedValue(new Error('canal fermé'));
    monture = await monter(<Sonde actif />);
    await vider();

    expect(etat().erreur).toBe('canal fermé');
  });

  it('relit la liste à la demande', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
    monture = await monter(<Sonde actif />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    const recharger = etat().recharger;
    await act(async () => {
      recharger();
    });
    await vider();

    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
    expect(etat().valeur).not.toBeNull();
  });

  it('relit la liste quand l’écran redevient actif, pas quand il est quitté', async () => {
    vi.mocked(listerFichiersAc056).mockResolvedValue(LISTE);
    monture = await monter(<Sonde actif />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await monture.rerendre(<Sonde actif={false} />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(1);

    await monture.rerendre(<Sonde actif />);
    await vider();
    expect(listerFichiersAc056).toHaveBeenCalledTimes(2);
  });
});
