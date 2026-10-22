import { describe, expect, it } from 'vitest';
import { compterLignesRejetees, indexerLignes } from '@shared/domain/ac056';
import {
  MESSAGES_REJET_VARIE,
  REPERES_REJET_VARIE,
  enWindows1252,
  lignesRejet,
  lignesRejetVarie,
} from '@shared/test/ac056-synthetique';
import { analyseSynthetique } from '@/test/ac056';

import { lignesRejeteesHorsEvenement } from './rejets-ac056';

function lire(lignes: readonly string[]) {
  const { fichier } = analyseSynthetique(lignes, 'rejet');
  return { fichier, index: indexerLignes(fichier) };
}

describe('lignesRejeteesHorsEvenement', () => {
  it('ne rend que la 995 rejetée du rejet varié, avec son code et son message', () => {
    const { fichier, index } = lire(lignesRejetVarie());

    const lignes = lignesRejeteesHorsEvenement(fichier, index);

    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.numero).toBe(REPERES_REJET_VARIE.ligne995);
    expect(lignes[0]!.code).toBe('995');
    expect(lignes[0]!.rejet.message).toBe(MESSAGES_REJET_VARIE.dossier);
    expect(lignes[0]!.rejet.code).toBeNull();
  });

  it('rend dans l’ordre du fichier les 000, 001, 995 et 999 rejetées', () => {
    const message = enWindows1252('Message de test');
    const { fichier, index } = lire(
      lignesRejet({
        message: (code) => (['000', '001', '995', '999'].includes(code) ? message : undefined),
      }),
    );

    const lignes = lignesRejeteesHorsEvenement(fichier, index);

    // 995 puis 001 de chaque dossier, puis 000 et 999 à la fin (ordre de MSP)
    expect(lignes.map((l) => l.code)).toEqual(['995', '001', '995', '001', '000', '999']);
    expect(lignes.map((l) => l.numero)).toEqual(
      [...lignes.map((l) => l.numero)].sort((a, b) => a - b),
    );
  });

  it('vaut le nombre « hors évènement » des compteurs de lignes rejetées', () => {
    const message = enWindows1252('Message de test');
    for (const lignesFichier of [
      lignesRejetVarie(),
      lignesRejet({ message: (code) => (code === '995' || code === '110' ? message : undefined) }),
      lignesRejet(),
    ]) {
      const { fichier, index } = lire(lignesFichier);

      expect(lignesRejeteesHorsEvenement(fichier, index)).toHaveLength(
        compterLignesRejetees(index, fichier).horsEvenement,
      );
    }
  });

  it('ne rend rien pour un rejet sans message', () => {
    const { fichier, index } = lire(lignesRejet());

    expect(lignesRejeteesHorsEvenement(fichier, index)).toEqual([]);
  });

  it('ne rend pas les lignes rejetées rattachées à un évènement', () => {
    const { fichier, index } = lire(lignesRejetVarie());

    const numeros = lignesRejeteesHorsEvenement(fichier, index).map((l) => l.numero);

    for (const rattachee of [5, 6, 10, 12]) expect(numeros).not.toContain(rattachee);
  });
});
