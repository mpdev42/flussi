// @vitest-environment jsdom
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { lignesCompletes } from '@shared/test/ac056-synthetique';
import { analyseSynthetique, ouvertureSynthetique } from './ac056';
import { monter, quitter } from './dom';

describe('quitter', () => {
  it("déclenche onBlur d'un champ monté", async () => {
    const surSortie = vi.fn();
    const monture = await monter(createElement('input', { onBlur: surSortie }));
    const champ = monture.conteneur.querySelector('input')!;

    await quitter(champ);

    expect(surSortie).toHaveBeenCalledTimes(1);
    await monture.demonter();
  });
});

describe('analyseSynthetique', () => {
  it('analyse un fichier complet sans erreur, avec des évènements', () => {
    const analyse = analyseSynthetique(lignesCompletes());

    expect(analyse.erreurs).toBe(0);
    expect(analyse.fichier.dossiers).toHaveLength(2);
    expect(analyse.fichier.dossiers[0]!.evenements).toHaveLength(2);
  });

  it('renvoie des objets non gelés (comme après le clonage de l’IPC)', () => {
    const analyse = analyseSynthetique(lignesCompletes());

    expect(Object.isFrozen(analyse)).toBe(false);
    expect(Object.isFrozen(analyse.fichier.dossiers)).toBe(false);
  });

  it('transmet la provenance', () => {
    expect(analyseSynthetique(lignesCompletes(), 'rejet').fichier.provenance).toBe('rejet');
  });
});

describe('ouvertureSynthetique', () => {
  it('renvoie une ouverture réussie avec la provenance déduite du nom', () => {
    const ouverture = ouvertureSynthetique('AC056COUR_20261017.txt', lignesCompletes(), 'out');

    expect(ouverture).toMatchObject({ ok: true, emplacement: 'out', provenance: 'veos' });
    if (ouverture.ok) expect(ouverture.analyse.erreurs).toBe(0);
  });
});
