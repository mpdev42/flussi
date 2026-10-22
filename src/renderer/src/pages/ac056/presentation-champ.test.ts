import { describe, expect, it } from 'vitest';
import { CONSIGNE_VEOS, ENTITES, octetsDepuisTexte } from '@shared/domain/ac056';
import { octetsDepuisTableau } from '@shared/domain/ac056/octets';
import { enOctetsBruts, enWindows1252 } from '@shared/test/ac056-synthetique';

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
    expect(texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ASSPRI'), 'veos')).toBe(
      'ASSPRI - Assuré principal',
    );
    expect(
      texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('19850215'), 'veos'),
    ).toBe('15/02/1985');
  });

  it('ajoute « (absent de la liste) » à un code inconnu', () => {
    expect(texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ZZZ'), 'veos')).toBe(
      'ZZZ (absent de la liste)',
    );
  });

  it('ajoute « (date invalide) » à une date illisible et laisse vide une date vide', () => {
    expect(
      texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('19850231'), 'veos'),
    ).toBe('19850231 (date invalide)');
    expect(
      texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('        '), 'veos'),
    ).toBe('');
  });
});

/** Octets Windows-1252 d'un texte (« É » vaut l'octet 0xC9 seul). */
const octetsWindows1252 = (texte: string) =>
  octetsDepuisTableau(enOctetsBruts(enWindows1252(texte)));

describe('texteChampAffiche — provenance', () => {
  it('décode un accent Windows-1252 d’un rejet, et l’UTF-8 d’un fichier VEOS', () => {
    const nom = champ('405', 'nom');

    // Octet 0xC9 seul : « É » en Windows-1252, octet invalide en UTF-8
    expect(texteChampAffiche(nom, octetsWindows1252('BÉGUIN'), 'rejet')).toBe('BÉGUIN');
    expect(texteChampAffiche(nom, octetsWindows1252('BÉGUIN'), 'veos')).toContain('�');
    expect(texteChampAffiche(nom, octetsDepuisTexte('BÉGUIN'), 'veos')).toBe('BÉGUIN');
  });

  it('garde les listes et les dates d’un rejet lisibles', () => {
    expect(
      texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ASSPRI'), 'rejet'),
    ).toBe('ASSPRI - Assuré principal');
    expect(
      texteChampAffiche(champ('400', 'dateNaissance'), octetsDepuisTexte('19850215'), 'rejet'),
    ).toBe('15/02/1985');
    expect(texteChampAffiche(champ('400', 'typeAssure'), octetsDepuisTexte('ZZZ'), 'rejet')).toBe(
      'ZZZ (absent de la liste)',
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
