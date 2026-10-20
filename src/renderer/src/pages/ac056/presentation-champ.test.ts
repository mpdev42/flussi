import { describe, expect, it } from 'vitest';
import { CONSIGNE_VEOS, ENTITES, octetsDepuisTexte } from '@shared/domain/ac056';

import {
  anomaliesBloquantesParLigne,
  champModifiable,
  messageChamp,
  presentationChamp,
  texteChampAffiche,
} from './presentation-champ';

function champ(code: '100' | '400' | '405' | '115', nom: string) {
  return ENTITES[code].champs.find((c) => c.nom === nom)!;
}

describe('presentationChamp', () => {
  it('met en mono les codes et rangs courts, à leur largeur', () => {
    expect(presentationChamp(champ('400', 'rangPersonne'))).toEqual({
      mono: true,
      largeurCaracteres: 2,
    });
    expect(presentationChamp(champ('115', 'numInsee')).mono).toBe(true);
  });

  it('laisse en police normale les listes, les dates et les textes', () => {
    expect(presentationChamp(champ('400', 'typeAssure'))).toEqual({ mono: false });
    expect(presentationChamp(champ('400', 'dateNaissance'))).toEqual({ mono: false });
    expect(presentationChamp(champ('405', 'nom'))).toEqual({ mono: false });
  });
});

describe('texteChampAffiche', () => {
  it('affiche « CODE - Libellé » et la date en JJ/MM/AAAA', () => {
    expect(texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ASSPRI'))).toBe(
      'ASSPRI - Assuré principal',
    );
    expect(texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('19850215'))).toBe(
      '15/02/1985',
    );
  });

  it('ajoute « (absent de la liste) » à un code inconnu', () => {
    expect(texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ZZZ'))).toBe(
      'ZZZ (absent de la liste)',
    );
  });

  it('ajoute « (date invalide) » à une date illisible et laisse vide une date vide', () => {
    expect(texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('19850231'))).toBe(
      '19850231 (date invalide)',
    );
    expect(texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('        '))).toBe(
      '',
    );
  });
});

describe('messages d’anomalie', () => {
  const anomalie = (ligne: number | null, bloquante: boolean, message: string, consigne?: string) =>
    ({ code: 'caractere-interdit', ligne, message, bloquante, champ: 'nom', consigne }) as const;

  it('préfère la consigne au message', () => {
    expect(messageChamp([anomalie(1, true, 'Message', 'Consigne')])).toBe('Consigne');
    expect(messageChamp([anomalie(1, true, 'Message')])).toBe('Message');
    expect(messageChamp([anomalie(1, true, 'Un.'), anomalie(1, true, 'Deux.')])).toBe('Un. Deux.');
    expect(messageChamp([])).toBeUndefined();
  });

  it('ajoute la consigne VEOS à la demande', () => {
    expect(messageChamp([anomalie(1, true, 'Message', 'Consigne.')], true)).toBe(
      `Consigne. ${CONSIGNE_VEOS}`,
    );
    expect(messageChamp([], true)).toBeUndefined();
  });

  it('n’écrit la mention VEOS qu’une fois, à la fin, quand plusieurs consignes la portent', () => {
    const message = messageChamp([
      anomalie(1, true, 'M1', `Un. ${CONSIGNE_VEOS}`),
      anomalie(1, true, 'M2', `Deux. ${CONSIGNE_VEOS}`),
    ]);

    expect(message).toBe(`Un. Deux. ${CONSIGNE_VEOS}`);
  });

  it('n’écrit la mention VEOS qu’une fois quand le fichier est mal formé et que la consigne la porte', () => {
    const message = messageChamp([anomalie(1, true, 'M', `Un. ${CONSIGNE_VEOS}`)], true);

    expect(message).toBe(`Un. ${CONSIGNE_VEOS}`);
  });

  it('place la mention VEOS à la fin même si seule la première consigne la porte', () => {
    const message = messageChamp([
      anomalie(1, true, 'M1', `Un. ${CONSIGNE_VEOS}`),
      anomalie(1, true, 'M2', 'Deux.'),
    ]);

    expect(message).toBe(`Un. Deux. ${CONSIGNE_VEOS}`);
  });

  it('regroupe les anomalies bloquantes par ligne', () => {
    const parLigne = anomaliesBloquantesParLigne([
      anomalie(3, true, 'A'),
      anomalie(3, false, 'B'),
      anomalie(null, true, 'C'),
      anomalie(7, true, 'D'),
    ]);

    expect([...parLigne.keys()]).toEqual([3, 7]);
    expect(parLigne.get(3)?.map((a) => a.message)).toEqual(['A']);
  });
});

describe('champModifiable', () => {
  const erreur = [{ code: 'caractere-interdit', ligne: 3, message: 'M', bloquante: true }] as const;

  it('autorise un champ modifiable en erreur ou déjà corrigé', () => {
    expect(champModifiable(champ('405', 'nom'), erreur, false, true)).toBe(true);
    expect(champModifiable(champ('405', 'nom'), [], true, true)).toBe(true);
  });

  it('laisse en lecture seule un champ modifiable sans erreur ni correction', () => {
    expect(champModifiable(champ('405', 'nom'), [], false, true)).toBe(false);
  });

  it('laisse en lecture seule un champ non modifiable, même en erreur', () => {
    expect(champModifiable(champ('400', 'typeAssure'), erreur, false, true)).toBe(false);
  });

  it('laisse tout en lecture seule quand le fichier est mal formé', () => {
    expect(champModifiable(champ('405', 'nom'), erreur, true, false)).toBe(false);
  });
});
