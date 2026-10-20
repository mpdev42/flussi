// Message MSP d'une ligne de rejet (`messageRejet`) et clé de dossier (`cleDossierRejet`).
// Lignes synthétiques : 700 octets AC056, 18 octets d'identification MSP, message en Windows-1252.
import { describe, expect, it } from 'vitest';
import {
  IDENTIFICATION_MSP_FICTIVE,
  enWindows1252,
  ligneRejet,
  ligneRejetSynthetique,
  ligneSynthetique,
  lignesRejet,
} from '@shared/test/ac056-synthetique';
import { MESSAGE_REJET_INCONNU, REJETS, type DescriptionRejet } from './codes-rejet';
import type { Octets } from './octets';
import {
  LONGUEUR_MINIMALE_REJET,
  POSITION_MESSAGE_REJET,
  cleDossierRejet,
  messageRejet,
} from './rejet';

const binaire = (chaine: string) => chaine as Octets;

const L405 = ligneSynthetique('405', { nom: 'DUPONT' });

/** Origine d'une ligne de rejet portant ce message (chaîne binaire Windows-1252). */
const avecMessage = (message: string): Octets => binaire(ligneRejet(L405, message));

const RANG_MODE = { debut: 0, egalite: 0, contenu: 1, fin: 2 } as const;

/** Message synthétique : les textes des recherches séparés par des valeurs, début en tête, fin en queue. */
function messageDepuis(description: DescriptionRejet): string {
  return [...description.recherches]
    .sort((a, b) => RANG_MODE[a.mode] - RANG_MODE[b.mode])
    .map((recherche) => recherche.texte)
    .join(' 123 ');
}

describe('constantes du format de rejet', () => {
  it('fixe la longueur minimale à 718 octets et le message à l octet 719', () => {
    expect(LONGUEUR_MINIMALE_REJET).toBe(718);
    expect(POSITION_MESSAGE_REJET).toBe(719);
  });

  it('correspond à la ligne fictive de 700 octets suivie de son identification', () => {
    expect(ligneRejet(L405)).toHaveLength(LONGUEUR_MINIMALE_REJET);
    expect(IDENTIFICATION_MSP_FICTIVE).toHaveLength(18);
  });
});

describe('messageRejet', () => {
  describe('ligne sans message', () => {
    it('renvoie undefined pour une ligne de 718 octets', () => {
      expect(messageRejet(avecMessage(''))).toBeUndefined();
    });

    it('renvoie undefined pour une ligne de 700 octets (fichier VEOS)', () => {
      expect(messageRejet(binaire(L405))).toBeUndefined();
    });

    it('renvoie undefined pour une ligne vide', () => {
      expect(messageRejet(binaire(''))).toBeUndefined();
    });

    it.each([
      ['espaces', '     '],
      ['tabulation, NUL et CR', '\t\x00\r'],
      ['un seul espace', ' '],
    ])('renvoie undefined pour un message fait de blancs : %s', (_nom, blancs) => {
      expect(messageRejet(avecMessage(blancs))).toBeUndefined();
    });
  });

  describe('message présent', () => {
    it('lit un message d un seul octet, à partir de l octet 719', () => {
      expect(messageRejet(avecMessage('X'))?.message).toBe('X');
    });

    it('lit le message à partir de l octet 719, sans l identification MSP', () => {
      const lu = messageRejet(avecMessage('Texte du rejet'));
      expect(lu?.message).toBe('Texte du rejet');
      expect(lu?.message).not.toContain('TESTID01');
    });

    it('conserve les espaces de tête et retire ceux de fin (parité Trim de Lazarus)', () => {
      expect(messageRejet(avecMessage('  Texte  '))?.message).toBe('  Texte');
    });

    it('retire en fin les octets de 0x00 à 0x20 : tabulation, NUL, CR, LF', () => {
      expect(messageRejet(avecMessage('Texte \t\x00\r\n'))?.message).toBe('Texte');
    });

    it('conserve les blancs à l intérieur du message', () => {
      expect(messageRejet(avecMessage('Un  deux\ttrois'))?.message).toBe('Un  deux\ttrois');
    });

    it('conserve 0xA0 en fin (ce n est pas un blanc pour Trim)', () => {
      expect(messageRejet(avecMessage('Texte\xA0'))?.message).toBe('Texte ');
    });
  });

  describe('décodage Windows-1252', () => {
    it('décode un message accentué', () => {
      expect(messageRejet(avecMessage('Assur\xE9 radi\xE9e \xE0 la date'))?.message).toBe(
        'Assuré radiée à la date',
      );
    });

    it('décode 0x80 en « € » et 0x92 en « ’ »', () => {
      expect(messageRejet(avecMessage('Prime 12 \x80 l\x92assur\xE9'))?.message).toBe(
        'Prime 12 € l’assuré',
      );
    });

    it('ne produit pas U+FFFD sur un octet non défini en Windows-1252 (0x81)', () => {
      const lu = messageRejet(avecMessage('A\x81B'));
      expect(lu?.message).toBe('A\u0081B');
      expect(lu?.message.includes('\uFFFD')).toBe(false);
    });

    it('décode du texte UTF-8 comme du Windows-1252 (le rejet n est pas en UTF-8)', () => {
      expect(messageRejet(avecMessage('\xC3\xA9'))?.message).toBe('Ã©');
    });
  });

  describe('identification du code ERRxxx', () => {
    it.each(REJETS.map((d) => [d.code, d] as const))(
      'reconnaît %s à partir de ses octets Windows-1252',
      (code, d) => {
        const texte = messageDepuis(d);
        const lu = messageRejet(avecMessage(enWindows1252(texte)));
        expect(lu?.code).toBe(code);
        expect(lu?.explication).toBe(`Aide ${code}`);
        expect(lu?.message).toBe(texte);
      },
    );

    it('rend le même résultat avec des blancs de fin après un message reconnu', () => {
      const d = REJETS[8]!;
      const texte = messageDepuis(d);
      const lu = messageRejet(avecMessage(enWindows1252(texte) + '   '));
      expect(lu?.code).toBe(d.code);
    });

    it('ne reconnaît pas un message qui commence par un espace (mode début)', () => {
      const d = REJETS[8]!;
      expect(d.recherches.some((r) => r.mode === 'debut')).toBe(true);
      const lu = messageRejet(avecMessage(' ' + enWindows1252(messageDepuis(d))));
      expect(lu?.code).toBeNull();
    });

    it('renvoie code null et l explication d erreur inconnue pour un message inconnu', () => {
      const lu = messageRejet(avecMessage('Message sans rapport'));
      expect(lu?.code).toBeNull();
      expect(lu?.explication).toBe(MESSAGE_REJET_INCONNU);
      expect(lu?.message).toBe('Message sans rapport');
    });

    it('renvoie un résultat gelé, reconnu ou non', () => {
      expect(Object.isFrozen(messageRejet(avecMessage('Message sans rapport')))).toBe(true);
      const reconnu = messageRejet(avecMessage(enWindows1252(messageDepuis(REJETS[0]!))));
      expect(reconnu?.code).toBe('ERR001');
      expect(Object.isFrozen(reconnu)).toBe(true);
    });
  });

  describe('décodage par zones (divergence voulue avec Lazarus)', () => {
    it('ne décale pas le message quand un octet accentué figure dans les 718 premiers octets', () => {
      const ligne = ligneSynthetique('405', { nom: 'CAF\xE9', prenom1: '\xE9\xE8\xE0' });
      const origine = binaire(ligneRejet(ligne, 'Message complet'));
      expect(messageRejet(origine)?.message).toBe('Message complet');
    });

    it('ne décale pas le message quand l identification MSP contient un octet accentué', () => {
      const origine = binaire(L405 + '000000001 TESTID\xE9\xE9' + 'Message complet');
      expect(messageRejet(origine)?.message).toBe('Message complet');
    });
  });
});

describe('cleDossierRejet', () => {
  it('renvoie les 17 premiers octets : émetteur et numéro de dossier', () => {
    expect(cleDossierRejet(binaire(ligneRejetSynthetique('100', 7)))).toBe('TEST     00000007');
  });

  it('renvoie la ligne entière quand elle fait moins de 17 octets', () => {
    expect(cleDossierRejet(binaire('TEST'))).toBe('TEST');
  });

  it('renvoie une chaîne vide pour une ligne vide', () => {
    expect(cleDossierRejet(binaire(''))).toBe('');
  });

  it('est identique pour les 100, 990, 995 et 001 d un dossier de l ordre MSP', () => {
    const premier = lignesRejet().slice(0, 68);
    const cles = new Set(
      premier
        .filter((ligne) => ['100', '990', '995', '001'].includes(ligne.slice(22, 25)))
        .map((ligne) => cleDossierRejet(binaire(ligne))),
    );
    expect(cles.size).toBe(1);
  });

  it('diffère entre deux dossiers et pour la 000 et la 999', () => {
    const lignes = lignesRejet();
    const cle = (indice: number) => cleDossierRejet(binaire(lignes[indice]!));
    expect(cle(0)).not.toBe(cle(68));
    expect(cle(136)).not.toBe(cle(0));
    expect(cle(136)).toBe(cle(137));
  });

  it('ne dépend pas du message ni de l identification MSP', () => {
    const avec = binaire(ligneRejet(L405, 'Un message'));
    const sans = binaire(ligneRejet(L405));
    expect(cleDossierRejet(avec)).toBe(cleDossierRejet(sans));
  });
});
