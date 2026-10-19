import { CircleAlert, CircleCheck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { NIVEAUX_JOURNAL } from '@shared/schemas/journal';
import { LIBELLES_NIVEAU, PRESENTATION_NIVEAU } from './niveaux-journal';

describe('LIBELLES_NIVEAU', () => {
  it('donne un libellé français à chaque niveau', () => {
    expect(LIBELLES_NIVEAU).toEqual({
      TITRE: 'Titre',
      INFO: 'Info',
      SUCCES: 'Succès',
      ERREUR: 'Erreur',
    });
  });
});

describe('PRESENTATION_NIVEAU', () => {
  it('associe un ton et une icône à chaque niveau', () => {
    for (const niveau of NIVEAUX_JOURNAL) {
      expect(PRESENTATION_NIVEAU[niveau].tone).toBeTruthy();
      expect(PRESENTATION_NIVEAU[niveau].Icone).toBeTruthy();
    }
  });

  it('marque Succès et Erreur par leurs tons et icônes', () => {
    expect(PRESENTATION_NIVEAU.SUCCES).toEqual({ tone: 'success', Icone: CircleCheck });
    expect(PRESENTATION_NIVEAU.ERREUR).toEqual({ tone: 'error', Icone: CircleAlert });
  });
});
