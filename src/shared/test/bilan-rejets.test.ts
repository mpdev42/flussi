// Logique pure du bilan des rejets MSP, sur des messages fictifs (aucune donnée du corpus).
import { describe, expect, it } from 'vitest';
import {
  SCRIPT_BILAN,
  anneeDuNom,
  anneeRejet,
  compterDoublons,
  compterGroupes,
  echapperCellule,
  espacesVisibles,
  masquerMessage,
  masquerMots,
  regrouperAnomalies,
  regrouperRejets,
  repartir,
  tableauBilan,
  verifierLancementBilan,
  type EntreeRejet,
  type TotauxBilan,
} from './bilan-rejets';

const CHIFFRE = /\p{N}/u;

function entree(fichier: string, message: string, code: string | null = 'ERR001', entite = '400') {
  return { fichier, entite, message, code } satisfies EntreeRejet;
}

const TOTAUX: TotauxBilan = {
  dossier: 'X:\\Travail\\OUT',
  annee: 2026,
  sousDossiers: 12,
  sousDossiersIllisibles: 1,
  fichiersVus: 9,
  nonRejets: [
    { valeur: '(sans extension)', nombre: 1 },
    { valeur: '.xlsx', nombre: 2 },
  ],
  retenusParSousDossier: [
    { valeur: '2026', nombre: 1 },
    { valeur: '2026\\03', nombre: 3 },
  ],
  retenusParNom: 3,
  retenusParModification: 1,
  doublons: { noms: 1, fichiers: 2 },
  ecartes: 2,
  illisibles: ['2026\\AC056COUR_REJ_20260105.txt'],
  lignes: 120,
  lignesAvecMessage: 4,
  anomalies: [{ code: 'entite-mal-placee', entite: '700', nombre: 2, fichiers: 1 }],
};

describe('masquerMessage', () => {
  it.each([
    'Date d effet 20260101 incorrecte',
    'Date de naissance 12/03/1985 invalide',
    'Montant de 1 234,56 € supérieur au plafond de 99.99',
    'Rang 01 déjà utilisé pour le contrat 4521-AB',
    'Garantie CI9101M inconnue pour le produit SANTE1',
    'Contrat n°123456 : bénéficiaire 2e rang',
    'Référence ABC_12/X.3-Y absente',
    'Puissance 10² hors bornes',
  ])('ne laisse aucun chiffre : %s', (message) => {
    expect(masquerMessage(message)).not.toMatch(CHIFFRE);
  });

  it('remplace les mots contenant un chiffre et garde accents et ponctuation', () => {
    expect(masquerMessage('Rang 01 déjà utilisé (contrat CI9101M) : à vérifier !')).toBe(
      'Rang … déjà utilisé (contrat …) : à vérifier !',
    );
    expect(masquerMessage('Date 12/03/2026.')).toBe('Date ….');
    expect(masquerMessage("Bénéficiaire l'ENFANT n°3, rang 02-A")).toBe(
      "Bénéficiaire l'ENFANT n°…, rang …",
    );
  });

  it('fusionne les masques séparés par des espaces ou des virgules', () => {
    expect(masquerMessage('Montant 1 234,56 € refusé')).toBe('Montant … € refusé');
    expect(masquerMessage('Montant 12 € refusé')).toBe('Montant … € refusé');
  });

  it('réduit les espaces et rogne le message', () => {
    expect(masquerMessage('  Nom   absent  ')).toBe('Nom absent');
  });

  it('ne masque pas un mot sans chiffre (limite documentée)', () => {
    expect(masquerMessage('Assuré DUPONT inconnu')).toBe('Assuré DUPONT inconnu');
  });
});

describe('masquerMots', () => {
  it('masque les mots chiffrés comme masquerMessage, sans toucher aux espaces', () => {
    expect(masquerMots(' Acte de gestion  Radiation rang : 01 ,contrat : 12 ')).toBe(
      ' Acte de gestion  Radiation rang : … ,contrat : … ',
    );
    expect(masquerMots('Montant 1 234,56 € refusé')).toBe('Montant … € refusé');
  });
});

describe('espacesVisibles', () => {
  it('garde une espace simple entre deux mots', () => {
    expect(espacesVisibles('Rang … inconnu')).toBe('Rang … inconnu');
  });

  it('rend visibles les espaces en double, en tête et en fin', () => {
    expect(espacesVisibles('Acte de gestion  Radiation')).toBe('Acte de gestion␠␠Radiation');
    expect(espacesVisibles(' Nom absent ')).toBe('␠Nom absent␠');
    expect(espacesVisibles('a   b')).toBe('a␠␠␠b');
  });

  it('rend visibles une tabulation et un autre blanc par son code', () => {
    expect(espacesVisibles('a\tb')).toBe('a␉b');
    expect(espacesVisibles('a\u00a0b')).toBe('a⟨U+00A0⟩b');
    expect(espacesVisibles('a \u00a0b')).toBe('a␠⟨U+00A0⟩b');
  });
});

describe('verifierLancementBilan', () => {
  it('accepte le seul script npm run bilan:rejets', () => {
    expect(SCRIPT_BILAN).toBe('bilan:rejets');
    expect(() => verifierLancementBilan('bilan:rejets')).not.toThrow();
  });

  it.each([
    ['test', 'test'],
    ['test:corpus', 'test:corpus'],
    ['npx', 'npx'],
    [undefined, 'aucun'],
    ['', 'aucun'],
  ])('refuse un autre lancement (%s)', (evenement, recu) => {
    expect(() => verifierLancementBilan(evenement)).toThrow(
      `Lancez le bilan par npm run bilan:rejets (script npm reçu : ${recu}).`,
    );
  });
});

describe('anneeDuNom', () => {
  it('prend la première date AAAAMMJJ valide du nom', () => {
    expect(anneeDuNom('AC056COUR_REJ_20261014.txt')).toBe(2026);
    expect(anneeDuNom('AC056COUR_REJ_20261014120000.txt')).toBe(2026);
    expect(anneeDuNom('AC056COUR_REJ_20251231.txt')).toBe(2025);
  });

  it('ignore une suite de huit chiffres qui n est pas une date', () => {
    expect(anneeDuNom('AC056COUR_REJ_99999999_20260230_20260228.txt')).toBe(2026);
    expect(anneeDuNom('AC056COUR_REJ_20261340.txt')).toBeNull();
    expect(anneeDuNom('AC056COUR_REJ_lot.txt')).toBeNull();
  });
});

describe('anneeRejet', () => {
  const modification = new Date(2025, 5, 15, 10, 0, 0);

  /** Date de modification qui compte ses appels (le `stat` du bilan). */
  function lecture(): { readonly date: () => Date; readonly appels: () => number } {
    let appels = 0;
    return {
      date: () => {
        appels++;
        return modification;
      },
      appels: () => appels,
    };
  }

  it('prend l année du nom sans lire la date de modification', () => {
    const l = lecture();
    expect(anneeRejet('AC056COUR_REJ_20261014.txt', l.date)).toEqual({
      annee: 2026,
      source: 'nom',
    });
    expect(l.appels()).toBe(0);
  });

  it('ne lit jamais la date d un fichier d une autre année d après son nom', () => {
    const illisible = (): Date => {
      throw new Error('stat impossible');
    };
    expect(anneeRejet('AC056COUR_REJ_20251014.txt', illisible)).toEqual({
      annee: 2025,
      source: 'nom',
    });
  });

  it('prend l année de la date de modification sans date valide dans le nom', () => {
    for (const nom of ['AC056COUR_REJ_lot.txt', 'AC056COUR_REJ_20261340.txt']) {
      const l = lecture();
      expect(anneeRejet(nom, l.date)).toEqual({ annee: 2025, source: 'modification' });
      expect(l.appels()).toBe(1);
    }
  });
});

describe('compterDoublons', () => {
  it('compte les noms présents dans plusieurs dossiers et leurs fichiers', () => {
    expect(
      compterDoublons([
        { dossier: '', nom: 'AC056COUR_REJ_20260105.txt' },
        { dossier: '2026', nom: 'AC056COUR_REJ_20260105.txt' },
        { dossier: '2026\\01', nom: 'AC056COUR_REJ_20260105.txt' },
        { dossier: '2026', nom: 'AC056COUR_REJ_20260212.txt' },
        { dossier: '2026', nom: 'AC056COUR_REJ_20260301.txt' },
        { dossier: '2026\\03', nom: 'AC056COUR_REJ_20260301.txt' },
      ]),
    ).toEqual({ noms: 2, fichiers: 5 });
  });

  it('ne compte aucun doublon pour des noms tous distincts', () => {
    expect(
      compterDoublons([
        { dossier: '2026', nom: 'a.txt' },
        { dossier: '2026', nom: 'b.txt' },
      ]),
    ).toEqual({ noms: 0, fichiers: 0 });
    expect(compterDoublons([])).toEqual({ noms: 0, fichiers: 0 });
  });
});

describe('regrouperRejets', () => {
  it('regroupe deux messages qui ne diffèrent que par un nombre', () => {
    const groupes = regrouperRejets([
      entree('a.txt', 'Rang 01 inconnu'),
      entree('a.txt', 'Rang 02 inconnu'),
    ]);
    expect(groupes).toEqual([
      {
        modele: 'Rang … inconnu',
        exemple: 'Rang … inconnu',
        variantes: 1,
        occurrences: 2,
        fichiers: 1,
        codes: ['ERR001'],
        entites: ['400'],
      },
    ]);
  });

  it('compte les fichiers distincts', () => {
    const [groupe] = regrouperRejets([
      entree('a.txt', 'Contrat 1 absent'),
      entree('b.txt', 'Contrat 2 absent'),
      entree('b.txt', 'Contrat 3 absent'),
    ]);
    expect(groupe).toMatchObject({ occurrences: 3, fichiers: 2 });
  });

  it('liste les codes triés, « aucun » pour un message non reconnu, et les entités', () => {
    const groupes = regrouperRejets([
      entree('a.txt', 'Valeur 1 hors liste', 'ERR014', '410'),
      entree('a.txt', 'Valeur 2 hors liste', null, '400'),
      entree('a.txt', 'Valeur 3 hors liste', 'ERR002', '410'),
    ]);
    expect(groupes).toEqual([
      {
        modele: 'Valeur … hors liste',
        exemple: 'Valeur … hors liste',
        variantes: 1,
        occurrences: 3,
        fichiers: 1,
        codes: ['ERR002', 'ERR014', 'aucun'],
        entites: ['400', '410'],
      },
    ]);
    expect(compterGroupes(groupes)).toEqual({ reconnus: 0, ambigus: 0, sansCode: 0, mixtes: 1 });
  });

  it('regroupe les variantes d espaces et garde la plus fréquente comme exemple', () => {
    const [groupe, ...autres] = regrouperRejets([
      entree('a.txt', 'Acte de gestion Radiation rang 01', null),
      entree('a.txt', 'Acte de gestion  Radiation rang 02', 'ERR002'),
      entree('b.txt', 'Acte de gestion  Radiation rang 03', 'ERR002'),
    ]);
    expect(autres).toEqual([]);
    expect(groupe).toMatchObject({
      modele: 'Acte de gestion Radiation rang …',
      exemple: 'Acte de gestion  Radiation rang …',
      variantes: 2,
      occurrences: 3,
    });
  });

  it('garde la première forme vue comme exemple à égalité', () => {
    const [groupe] = regrouperRejets([
      entree('a.txt', 'Nom  absent'),
      entree('a.txt', 'Nom absent'),
    ]);
    expect(groupe).toMatchObject({ exemple: 'Nom  absent', variantes: 2 });
  });

  it('compte à part les groupes ambigus, à plusieurs codes non nuls', () => {
    const groupes = regrouperRejets([
      entree('a.txt', 'Garantie 1 absente', 'ERR010'),
      entree('a.txt', 'Garantie 2 absente', 'ERR027'),
      entree('a.txt', 'Zone absente', 'ERR001'),
      entree('a.txt', 'Champ absent', null),
      entree('a.txt', 'Rang 1 inconnu', 'ERR013'),
      entree('a.txt', 'Rang 2 inconnu', null),
    ]);
    expect(groupes.find((g) => g.modele === 'Garantie … absente')?.codes).toEqual([
      'ERR010',
      'ERR027',
    ]);
    expect(compterGroupes(groupes)).toEqual({ reconnus: 1, ambigus: 1, sansCode: 1, mixtes: 1 });
  });

  it('trie par occurrences décroissantes puis par modèle', () => {
    const groupes = regrouperRejets([
      entree('a.txt', 'Zone absente'),
      entree('a.txt', 'Champ B absent', null),
      entree('a.txt', 'Champ A absent'),
      entree('b.txt', 'Zone absente'),
    ]);
    expect(groupes.map((g) => g.modele)).toEqual([
      'Zone absente',
      'Champ A absent',
      'Champ B absent',
    ]);
    expect(compterGroupes(groupes)).toEqual({ reconnus: 2, ambigus: 0, sansCode: 1, mixtes: 0 });
  });
});

describe('repartir', () => {
  it('compte chaque valeur distincte, dans l ordre des valeurs', () => {
    expect(repartir(['2026\\03', '2026', '2026\\03', '.xlsx'])).toEqual([
      { valeur: '.xlsx', nombre: 1 },
      { valeur: '2026', nombre: 1 },
      { valeur: '2026\\03', nombre: 2 },
    ]);
    expect(repartir([])).toEqual([]);
  });
});

describe('regrouperAnomalies', () => {
  it('compte par code d anomalie et entité, avec les fichiers distincts', () => {
    expect(
      regrouperAnomalies([
        { fichier: 'a.txt', code: 'entite-mal-placee', entite: '700' },
        { fichier: 'b.txt', code: 'entite-mal-placee', entite: '700' },
        { fichier: 'b.txt', code: 'entite-mal-placee', entite: '700' },
        { fichier: 'a.txt', code: 'bom', entite: 'fichier' },
      ]),
    ).toEqual([
      { code: 'bom', entite: 'fichier', nombre: 1, fichiers: 1 },
      { code: 'entite-mal-placee', entite: '700', nombre: 3, fichiers: 2 },
    ]);
  });
});

describe('tableauBilan', () => {
  it('échappe les barres verticales, les chevrons, les barres obliques inverses et les sauts de ligne', () => {
    expect(echapperCellule('a | b\\c <d>\r\ne\nf')).toBe('a \\| b\\\\c &lt;d><br>e<br>f');
  });

  it('produit le titre, les totaux, l avertissement, le tableau et les anomalies', () => {
    const groupes = regrouperRejets([
      entree('a.txt', 'Rang 01 | inconnu'),
      entree('b.txt', 'Rang 02 | inconnu'),
      entree('a.txt', 'Nom absent', null, '100'),
      entree('a.txt', 'Acte de gestion  Radiation rang 01', 'ERR002'),
      entree('b.txt', 'Acte de gestion  Radiation rang 02', 'ERR002'),
      entree('b.txt', 'Acte de gestion Radiation rang 03', null),
    ]);
    const document = tableauBilan(groupes, TOTAUX, new Date(2026, 9, 22, 8, 5));

    expect(document).toContain('# Bilan des messages de rejet MSP 2026');
    expect(document).toContain('Généré le 22/10/2026 à 08:05');
    expect(document).toContain('données personnelles possibles (noms non masqués)');
    expect(document).toContain(
      'noms des sous-dossiers et des fichiers illisibles cités dans les totaux',
    );
    expect(document).toContain(
      '- Fichiers retenus : 4 (3 par la date du nom, 1 par la date de modification)',
    );
    // Barre oblique inverse doublée par l'échappement Markdown (affichée simple).
    expect(document).toContain('  - 2026\\\\AC056COUR_REJ_20260105.txt');
    expect(document).toContain('- Sous-dossiers parcourus : 12 (1 impossibles à lister)');
    expect(document).toContain('- Fichiers vus : 9');
    expect(document).toContain('- Fichiers écartés (pas un rejet .txt) : 3');
    expect(document).toContain('  - .xlsx : 2');
    expect(document).toContain('  - (sans extension) : 1');
    expect(document).toContain('  - 2026\\\\03 : 3');
    expect(document).toContain(
      '- Noms de fichiers retenus présents dans plusieurs sous-dossiers : 1 (2 fichiers)',
    );
    expect(document).toContain(
      '- Messages masqués distincts : 3 (1 reconnus, 0 ambigus à plusieurs codes, 1 sans code, 1 mixtes avec et sans code)',
    );
    expect(document).toContain(
      '| Message (masqué, espaces visibles) | Variantes | Occurrences | Fichiers | Entités | Code | À relire |',
    );
    expect(document).toContain('| Rang … \\| inconnu |  | 2 | 2 | 400 | ERR001 |  |');
    expect(document).toContain('| Nom absent |  | 1 | 1 | 100 | aucun | oui |');
    expect(document).toContain(
      '| Acte de gestion␠␠Radiation rang … | 2 | 3 | 2 | 400 | ERR002, aucun |  |',
    );
    expect(document).toContain('| entite-mal-placee | 700 | 2 | 1 |');
  });

  it('annonce l absence de message et d anomalie', () => {
    const document = tableauBilan([], { ...TOTAUX, anomalies: [] }, new Date(2026, 0, 1));
    expect(document).toContain('Aucun message.');
    expect(document).toContain('Aucune anomalie.');
  });
});
