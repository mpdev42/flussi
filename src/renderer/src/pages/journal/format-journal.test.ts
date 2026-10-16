import { describe, expect, it } from 'vitest';
import type { LigneJournal, SessionJournal } from '@shared/types';
import {
  LIBELLES_NIVEAU,
  MOIS_JOURNAL,
  contientFinDeSession,
  mettreMajuscule,
  nomMois,
  periodeEnLettres,
  titreSession,
} from './format-journal';

function ligne(niveau: LigneJournal['niveau'], message: string): LigneJournal {
  return { heure: niveau === null ? null : '09:15:00', niveau, message };
}

describe('MOIS_JOURNAL et nomMois', () => {
  it('compte 12 mois de 01 à 12', () => {
    expect(MOIS_JOURNAL.map((m) => m.valeur)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ]);
  });

  it('donne les noms en toutes lettres et en minuscules', () => {
    expect(MOIS_JOURNAL.map((m) => m.long)).toEqual([
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ]);
  });

  it('donne les libellés abrégés des boutons', () => {
    expect(MOIS_JOURNAL.map((m) => m.court)).toEqual([
      'Janv.',
      'Févr.',
      'Mars',
      'Avr.',
      'Mai',
      'Juin',
      'Juil.',
      'Août',
      'Sept.',
      'Oct.',
      'Nov.',
      'Déc.',
    ]);
  });

  it('nomMois renvoie le nom du mois', () => {
    expect(nomMois('10')).toBe('octobre');
    expect(nomMois('02')).toBe('février');
  });

  it('nomMois renvoie le code reçu si le mois est inconnu', () => {
    expect(nomMois('13')).toBe('13');
  });
});

describe('periodeEnLettres', () => {
  it('écrit « octobre 2026 »', () => {
    expect(periodeEnLettres('2026', '10')).toBe('octobre 2026');
  });

  it('écrit « août 2025 »', () => {
    expect(periodeEnLettres('2025', '08')).toBe('août 2025');
  });
});

describe('mettreMajuscule', () => {
  it('met la première lettre en majuscule', () => {
    expect(mettreMajuscule('octobre')).toBe('Octobre');
    expect(mettreMajuscule('août')).toBe('Août');
  });
});

describe('titreSession', () => {
  it('écrit « Session du JJ/MM/AAAA à HH:MM:SS »', () => {
    const session: SessionJournal = {
      chemin: '2026/10/20261014-091500-dupont.txt',
      date: '2026-10-14',
      heure: '09:15:00',
      compte: 'dupont',
      enCours: false,
      copieConflitProbable: false,
    };
    expect(titreSession(session)).toBe('Session du 14/10/2026 à 09:15:00');
  });
});

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

describe('contientFinDeSession', () => {
  it('est vrai pour une ligne conforme « Fin de session »', () => {
    expect(contientFinDeSession([ligne('TITRE', 'Début'), ligne('TITRE', 'Fin de session')])).toBe(
      true,
    );
  });

  it('est faux sans ligne', () => {
    expect(contientFinDeSession([])).toBe(false);
  });

  it('est faux si le message diffère', () => {
    expect(contientFinDeSession([ligne('TITRE', 'Fin de session '), ligne('INFO', 'fin')])).toBe(
      false,
    );
    expect(contientFinDeSession([ligne('TITRE', 'fin de session')])).toBe(false);
  });

  it('est faux pour une ligne non conforme qui porte le même texte', () => {
    expect(contientFinDeSession([ligne(null, 'Fin de session')])).toBe(false);
  });
});
