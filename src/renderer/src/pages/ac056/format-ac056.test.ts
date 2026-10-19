import { describe, expect, it } from 'vitest';
import { analyse, anomalieFichierVide as anomalieVide } from '@/test/ac056';
import {
  anomalieFichierVide,
  causeEnPhrase,
  descriptionCarte,
  formaterDateHeure,
  formaterTaille,
} from './format-ac056';

describe('formaterDateHeure', () => {
  it('met la date au format JJ/MM/AAAA à HH:MM, en heure locale', () => {
    expect(formaterDateHeure(new Date(2026, 9, 17, 8, 5).toISOString())).toBe('17/10/2026 à 08:05');
    expect(formaterDateHeure(new Date(2026, 0, 2, 23, 59).toISOString())).toBe(
      '02/01/2026 à 23:59',
    );
  });

  it('renvoie un tiret quand la date est inconnue ou illisible', () => {
    expect(formaterDateHeure(null)).toBe('—');
    expect(formaterDateHeure('pas une date')).toBe('—');
  });
});

describe('formaterTaille', () => {
  it('arrondit en Ko à l’unité', () => {
    expect(formaterTaille(626_688)).toBe('612 Ko');
    expect(formaterTaille(1024)).toBe('1 Ko');
    expect(formaterTaille(1536)).toBe('2 Ko');
  });

  it('affiche 1 Ko au minimum pour un fichier non vide, 0 Ko pour un fichier vide', () => {
    expect(formaterTaille(300)).toBe('1 Ko');
    expect(formaterTaille(0)).toBe('0 Ko');
  });

  it('passe en Mo avec une décimale et une virgule dès 1 024 Ko', () => {
    expect(formaterTaille(4_089_446)).toBe('3,9 Mo');
    expect(formaterTaille(1_048_576)).toBe('1,0 Mo');
    // 1 048 500 octets arrondiraient à 1 024 Ko : affichés en Mo
    expect(formaterTaille(1_048_500)).toBe('1,0 Mo');
  });

  it('renvoie un tiret quand la taille est inconnue', () => {
    expect(formaterTaille(null)).toBe('—');
  });
});

describe('causeEnPhrase', () => {
  it('met la première lettre en majuscule et ajoute le point final', () => {
    expect(causeEnPhrase('lecteur de travail non monté ou déconnecté')).toBe(
      'Lecteur de travail non monté ou déconnecté.',
    );
  });

  it('ne double pas la ponctuation finale', () => {
    expect(causeEnPhrase('Déjà une phrase.')).toBe('Déjà une phrase.');
  });

  it('garde une cause vide vide', () => {
    expect(causeEnPhrase('  ')).toBe('');
  });
});

describe('descriptionCarte', () => {
  it('gère l’absence de fichier et le pluriel', () => {
    expect(descriptionCarte(0)).toBe('Aucun fichier');
    expect(descriptionCarte(1)).toBe('1 fichier · du plus récent au plus ancien');
    expect(descriptionCarte(12)).toBe('12 fichiers · du plus récent au plus ancien');
  });
});

describe('anomalieFichierVide', () => {
  it('trouve l’anomalie de fichier vide, sinon rien', () => {
    expect(anomalieFichierVide(analyse({ anomalies: [anomalieVide()] }))?.code).toBe(
      'fichier-vide',
    );
    expect(anomalieFichierVide(analyse())).toBeUndefined();
  });
});
