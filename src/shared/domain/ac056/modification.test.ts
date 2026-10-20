// Modification d'un champ : contrôles dans l'ordre (ligne, nature, champ, modifiable, saut de ligne,
// longueur), messages exacts sans jamais citer la valeur, écriture à la bonne position et
// immuabilité du fichier d'entrée.
import { describe, expect, it } from 'vitest';
import {
  enChaineBinaire,
  fichierSynthetique,
  ligneSynthetique,
  type OptionsFichierSynthetique,
} from '@shared/test/ac056-synthetique';
import { ecrireAc056 } from './ecrivain';
import { ENTITES, type CodeEntite } from './entites';
import { lireAc056 } from './lecteur';
import type { FichierAc056 } from './modele';
import {
  modifierChamp,
  type CodeErreurModification,
  type ResultatModification,
} from './modification';

// Les 23 champs modifiables (TDonneeModifiable de Lazarus), comme dans entites.test.ts.
const MODIFIABLES: readonly [CodeEntite, string][] = [
  ['115', 'nom'],
  ['115', 'prenom1'],
  ['115', 'numInsee'],
  ['120', 'complementGeographique'],
  ['120', 'numeroVoie'],
  ['120', 'libelleVoie'],
  ['120', 'lieuDit'],
  ['120', 'codePostalLocalite'],
  ['120', 'libelleLocalite'],
  ['125', 'valeurCoordonneeCommunication'],
  ['400', 'rang'],
  ['400', 'rangPersonne'],
  ['405', 'rang'],
  ['405', 'nom'],
  ['405', 'prenom1'],
  ['405', 'numInsee'],
  ['405', 'nomJeuneFille'],
  ['410', 'rang'],
  ['485', 'rang'],
  ['490', 'rang'],
  ['700', 'rang'],
  ['800', 'rang'],
  ['800', 'rangPersonne'],
];

const L400 = ligneSynthetique('400');
const L405 = ligneSynthetique('405', { nom: 'DUPONT', prenom1: 'TEST' });

function fichierDe(lignes: readonly string[], options?: OptionsFichierSynthetique): FichierAc056 {
  return lireAc056(fichierSynthetique(lignes, options)).fichier;
}

function reussir(resultat: ResultatModification): FichierAc056 {
  if (!resultat.ok) throw new Error(`échec inattendu : ${resultat.erreur.code}`);
  return resultat.fichier;
}

function echouer(resultat: ResultatModification): {
  code: CodeErreurModification;
  message: string;
} {
  if (resultat.ok) throw new Error('échec attendu');
  return resultat.erreur;
}

const sortieDe = (fichier: FichierAc056) => enChaineBinaire(ecrireAc056(fichier));

function deepFreeze<T>(valeur: T): T {
  if (typeof valeur === 'object' && valeur !== null && !Object.isFrozen(valeur)) {
    Object.freeze(valeur);
    for (const enfant of Object.values(valeur)) deepFreeze(enfant);
  }
  return valeur;
}

describe('modifierChamp', () => {
  describe('ligne introuvable', () => {
    const fichier = fichierDe([L400, L405, L400]);

    it.each([0, -1, 4, 99, 1.5])('refuse le numéro de ligne %s', (ligne) => {
      const erreur = echouer(modifierChamp(fichier, { ligne, champ: 'nom' }, 'MARTIN'));
      expect(erreur).toEqual({
        code: 'ligne-introuvable',
        message: `Ligne ${ligne} introuvable.`,
      });
    });

    it('refuse le numéro d une ligne vide supprimée', () => {
      const avecVide = fichierDe([L400, '', L405]);
      const erreur = echouer(modifierChamp(avecVide, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(erreur).toEqual({ code: 'ligne-introuvable', message: 'Ligne 2 introuvable.' });
    });

    it('refuse sur un fichier vide', () => {
      const vide = fichierDe([]);
      const erreur = echouer(modifierChamp(vide, { ligne: 1, champ: 'nom' }, 'MARTIN'));
      expect(erreur.code).toBe('ligne-introuvable');
    });
  });

  describe('ligne non décrite', () => {
    it.each(['000', '001', '990', '995', '999'] as const)(
      'refuse la ligne %s de 700 octets : entité non modifiable',
      (code) => {
        const fichier = fichierDe([L400, ligneSynthetique(code)]);
        const erreur = echouer(modifierChamp(fichier, { ligne: 2, champ: 'donnees' }, 'X'));
        expect(erreur).toEqual({
          code: 'ligne-non-decrite',
          message: `Ligne 2 : entité ${code} non modifiable.`,
        });
      },
    );

    it.each(['000', '001', '990', '995', '999'] as const)(
      'refuse la ligne %s de 699 octets : entité non modifiable, quelle que soit sa longueur',
      (code) => {
        const fichier = fichierDe([L400, ligneSynthetique(code).slice(0, 699)]);
        const erreur = echouer(modifierChamp(fichier, { ligne: 2, champ: 'donnees' }, 'X'));
        expect(erreur).toEqual({
          code: 'ligne-non-decrite',
          message: `Ligne 2 : entité ${code} non modifiable.`,
        });
      },
    );

    it('refuse une 000 de 701 octets : entité 000 non modifiable', () => {
      const fichier = fichierDe([ligneSynthetique('000') + ' ']);
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'donnees' }, 'X'));
      expect(erreur).toEqual({
        code: 'ligne-non-decrite',
        message: 'Ligne 1 : entité 000 non modifiable.',
      });
    });

    it('refuse une 405 de 699 octets : ligne non conforme', () => {
      const fichier = fichierDe([ligneSynthetique('405', { nom: 'DUPONT' }).slice(0, 699)]);
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, 'X'));
      expect(erreur).toEqual({
        code: 'ligne-non-decrite',
        message: 'Ligne 1 : ligne non conforme, aucun champ modifiable.',
      });
    });

    it.each([
      ['de 699 octets', L400.slice(0, 699)],
      ['de 701 octets', L400 + ' '],
      ['d espaces', ' '.repeat(700)],
      ['au code inconnu', ligneSynthetique('400', { numEntite: '123' })],
      ['de moins de 25 octets', 'TEST'],
    ])('refuse une ligne brute %s : ligne non conforme', (_nom, ligne) => {
      const fichier = fichierDe([ligne]);
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, 'X'));
      expect(erreur).toEqual({
        code: 'ligne-non-decrite',
        message: 'Ligne 1 : ligne non conforme, aucun champ modifiable.',
      });
    });

    it('contrôle la nature avant le champ : champ inconnu sur une ligne brute', () => {
      const fichier = fichierDe([ligneSynthetique('000')]);
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'inexistant' }, 'X'));
      expect(erreur.code).toBe('ligne-non-decrite');
    });

    it('contrôle la ligne avant la nature', () => {
      const fichier = fichierDe([ligneSynthetique('000')]);
      const erreur = echouer(modifierChamp(fichier, { ligne: 2, champ: 'inexistant' }, 'X'));
      expect(erreur.code).toBe('ligne-introuvable');
    });
  });

  describe('champ inconnu', () => {
    const fichier = fichierDe([L405]);

    it('refuse un champ qui n existe pas dans l entité', () => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'inexistant' }, 'X'));
      expect(erreur).toEqual({
        code: 'champ-inconnu',
        message: 'Entité 405 : champ inexistant inconnu.',
      });
    });

    it('refuse un champ d une autre entité', () => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'refExterne' }, 'X'));
      expect(erreur.code).toBe('champ-inconnu');
    });

    it('est sensible à la casse du nom du champ', () => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'Nom' }, 'X'));
      expect(erreur.code).toBe('champ-inconnu');
    });

    it('refuse un nom de champ vide', () => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: '' }, 'X'));
      expect(erreur.code).toBe('champ-inconnu');
    });
  });

  describe('champ non modifiable', () => {
    const fichier = fichierDe([L405]);

    it.each([
      ['prenom2', 'prenom2 (octets 108 à 127)'],
      ['codeCivilite', '« Civilité »'],
      ['numEntite', 'numEntite (octets 23 à 25)'],
      ['numDossier', 'numDossier (octets 10 à 17)'],
      ['zoneNonDecrite', 'zoneNonDecrite (octets 248 à 700)'],
    ])('refuse le champ %s, désigné par son libellé ou ses octets', (champ, designation) => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ }, 'X'));
      expect(erreur).toEqual({
        code: 'champ-non-modifiable',
        message: `Entité 405 : champ ${designation} non modifiable.`,
      });
    });

    it('contrôle la modifiabilité avant le saut de ligne', () => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'prenom2' }, 'A\nB'));
      expect(erreur.code).toBe('champ-non-modifiable');
    });

    it('contrôle la modifiabilité avant la longueur', () => {
      const erreur = echouer(
        modifierChamp(fichier, { ligne: 1, champ: 'prenom2' }, 'A'.repeat(99)),
      );
      expect(erreur.code).toBe('champ-non-modifiable');
    });
  });

  describe('saut de ligne', () => {
    const fichier = fichierDe([L405]);

    it.each([
      ['LF', 'A\nB'],
      ['CR', 'A\rB'],
      ['CRLF', 'A\r\nB'],
      ['LF seul', '\n'],
    ])('refuse un %s dans la valeur', (_nom, valeur) => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, valeur));
      expect(erreur).toEqual({
        code: 'saut-de-ligne',
        message: 'Entité 405 : saut de ligne interdit dans le champ « Nom ».',
      });
    });

    it('contrôle le saut de ligne avant la longueur', () => {
      const erreur = echouer(
        modifierChamp(fichier, { ligne: 1, champ: 'nom' }, `${'A'.repeat(99)}\n`),
      );
      expect(erreur.code).toBe('saut-de-ligne');
    });
  });

  describe('caractère illisible (U+FFFD)', () => {
    const fichier = fichierDe([L405]);

    it.each([
      ['seul', '\uFFFD'],
      ['en tête', '\uFFFDDUPONT'],
      ['au milieu', 'DUP\uFFFDONT'],
    ])('refuse U+FFFD %s, sans citer la valeur', (_nom, valeur) => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, valeur));
      expect(erreur).toEqual({
        code: 'caractere-illisible',
        message:
          'Entité 405 : caractère illisible dans le champ « Nom », à remplacer par le bon caractère.',
      });
    });

    it('contrôle le saut de ligne avant U+FFFD, et U+FFFD avant la longueur', () => {
      const saut = echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, '\uFFFD\n'));
      expect(saut.code).toBe('saut-de-ligne');
      const long = `\uFFFD${'A'.repeat(99)}`;
      expect(echouer(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, long)).code).toBe(
        'caractere-illisible',
      );
    });

    it('accepte les autres caractères non ASCII', () => {
      expect(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, 'CAFÉ €').ok).toBe(true);
    });
  });

  describe('valeur trop longue', () => {
    it('refuse 26 « é » dans 405 nom : 52 octets pour 50', () => {
      const erreur = echouer(
        modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'é'.repeat(26)),
      );
      expect(erreur).toEqual({
        code: 'valeur-trop-longue',
        message: 'Entité 405 : valeur trop longue pour le champ « Nom » (52 octets pour 50).',
      });
    });

    it('accepte 25 « é » dans 405 nom (50 octets)', () => {
      const res = reussir(
        modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'é'.repeat(25)),
      );
      expect(sortieDe(res)).toBe(
        ligneSynthetique('405', { nom: '\xC3\xA9'.repeat(25), prenom1: 'TEST' }),
      );
    });

    it('compte les octets UTF-8 et non les caractères', () => {
      const erreur = echouer(
        modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, '€'.repeat(17)),
      );
      expect(erreur.message).toBe(
        'Entité 405 : valeur trop longue pour le champ « Nom » (51 octets pour 50).',
      );
    });

    it('refuse un rang de 3 caractères (maxLength 2)', () => {
      const erreur = echouer(modifierChamp(fichierDe([L400]), { ligne: 1, champ: 'rang' }, '123'));
      expect(erreur).toEqual({
        code: 'valeur-trop-longue',
        message:
          'Entité 400 : valeur trop longue pour le champ « Rang bénéficiaire » (3 caractères pour 2).',
      });
    });

    it('applique maxLength en caractères : code postal de 6 caractères refusé (maxLength 5, 10 octets)', () => {
      const fichier = fichierDe([ligneSynthetique('120')]);
      const erreur = echouer(
        modifierChamp(fichier, { ligne: 1, champ: 'codePostalLocalite' }, '123456'),
      );
      expect(erreur).toEqual({
        code: 'valeur-trop-longue',
        message:
          'Entité 120 : valeur trop longue pour le champ « Code postal » (6 caractères pour 5).',
      });
    });

    it('compte maxLength en unités UTF-16, comme <input maxLength> : « 𝄞 » vaut 2', () => {
      const fichier = fichierDe([L400]);
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ: 'rang' }, '1𝄞'));
      expect(erreur.message).toBe(
        'Entité 400 : valeur trop longue pour le champ « Rang bénéficiaire » (3 caractères pour 2).',
      );
    });

    it('contrôle maxLength avant la longueur en octets', () => {
      const erreur = echouer(
        modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'é'.repeat(51)),
      );
      expect(erreur.message).toBe(
        'Entité 405 : valeur trop longue pour le champ « Nom » (51 caractères pour 50).',
      );
    });

    it('accepte un rang de 2 caractères', () => {
      const res = reussir(modifierChamp(fichierDe([L400]), { ligne: 1, champ: 'rang' }, '12'));
      expect(sortieDe(res)).toBe(ligneSynthetique('400', { rang: '12' }));
    });

    it.each(MODIFIABLES)(
      '%s %s : accepte la longueur maximale et refuse un caractère de plus',
      (code, nom) => {
        const champ = ENTITES[code].champs.find((c) => c.nom === nom)!;
        // Tous les champs modifiables ont un maxLength, au plus égal à leur longueur en octets.
        expect(champ.maxLength).toBeDefined();
        const maximum = champ.maxLength!;
        expect(maximum).toBeLessThanOrEqual(champ.longueur);
        const fichier = fichierDe([ligneSynthetique(code)]);

        const ok = reussir(modifierChamp(fichier, { ligne: 1, champ: nom }, 'X'.repeat(maximum)));
        expect(sortieDe(ok)).toBe(ligneSynthetique(code, { [nom]: 'X'.repeat(maximum) }));

        const erreur = echouer(
          modifierChamp(fichier, { ligne: 1, champ: nom }, 'X'.repeat(maximum + 1)),
        );
        expect(erreur).toEqual({
          code: 'valeur-trop-longue',
          message: `Entité ${code} : valeur trop longue pour le champ « ${champ.libelle} » (${maximum + 1} caractères pour ${maximum}).`,
        });
      },
    );
  });

  describe('les messages ne citent jamais la valeur', () => {
    const fichier = fichierDe([L405]);
    const SECRET = 'SECRET-VALEUR';

    it.each([
      ['saut de ligne', 'nom', `${SECRET}\nX`],
      ['valeur trop longue', 'nom', SECRET.repeat(10)],
      ['champ non modifiable', 'prenom2', SECRET],
      ['champ inconnu', 'inexistant', SECRET],
    ])('%s', (_nom, champ, valeur) => {
      const erreur = echouer(modifierChamp(fichier, { ligne: 1, champ }, valeur));
      expect(erreur.message).not.toContain('SECRET');
    });
  });

  describe('succès', () => {
    it('renvoie ok: true et un nouveau fichier', () => {
      const fichier = fichierDe([L400, L405, L400]);
      const resultat = modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN');
      expect(resultat.ok).toBe(true);
      expect(reussir(resultat)).not.toBe(fichier);
    });

    it('écrit la valeur à la bonne position, le reste du fichier restant identique', () => {
      const fichier = fichierDe([L400, L405, L400]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      const attendu = fichierSynthetique([
        L400,
        ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'TEST' }),
        L400,
      ]);
      expect(sortieDe(res)).toBe(enChaineBinaire(attendu));
    });

    it('encode la valeur en UTF-8', () => {
      const res = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'Éloïse'));
      expect(sortieDe(res)).toBe(
        ligneSynthetique('405', { nom: '\xC3\x89lo\xC3\xAFse', prenom1: 'TEST' }),
      );
    });

    it('bourre à droite avec des espaces un champ alphanumérique', () => {
      const res = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'AB'));
      expect(sortieDe(res).slice(37, 87)).toBe('AB' + ' '.repeat(48));
    });

    it('écrit une valeur vide comme des espaces dans un champ alphanumérique', () => {
      const res = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, ''));
      expect(sortieDe(res)).toBe(ligneSynthetique('405', { prenom1: 'TEST' }));
    });

    it('n applique pas de Trim : les espaces de tête sont écrits tels quels', () => {
      const res = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, '  X'));
      expect(sortieDe(res)).toBe(ligneSynthetique('405', { nom: '  X', prenom1: 'TEST' }));
    });

    it('n applique pas de Trim : les espaces de fin sont conservés dans la longueur', () => {
      const res = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'X  '));
      expect(sortieDe(res)).toBe(ligneSynthetique('405', { nom: 'X  ', prenom1: 'TEST' }));
    });

    it('écrit une valeur de la longueur exacte du champ', () => {
      const res = reussir(
        modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'N'.repeat(50)),
      );
      expect(sortieDe(res)).toBe(ligneSynthetique('405', { nom: 'N'.repeat(50), prenom1: 'TEST' }));
    });

    it.each([
      ['400', 'rang', '1', '10'],
      ['400', 'rang', '', '00'],
      ['400', 'rangPersonne', '1', '10'],
      ['400', 'rangPersonne', '', '00'],
      ['800', 'rangPersonne', '1', '10'],
      ['800', 'rangPersonne', '', '00'],
      ['800', 'rang', '5', '50'],
    ] as const)(
      '%s %s « %s » est écrit « %s » (bourrage de zéros à droite)',
      (code, champ, valeur, attendu) => {
        const res = reussir(
          modifierChamp(fichierDe([ligneSynthetique(code)]), { ligne: 1, champ }, valeur),
        );
        expect(sortieDe(res)).toBe(ligneSynthetique(code, { [champ]: attendu }));
      },
    );

    it('cible la ligne par son numéro d origine malgré une ligne vide supprimée', () => {
      const fichier = fichierDe([L400, '', L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 3, champ: 'nom' }, 'MARTIN'));
      expect(res.lignes).toHaveLength(2);
      expect(res.lignes[1]?.numero).toBe(3);
      expect(sortieDe(res)).toBe(
        enChaineBinaire(
          fichierSynthetique([L400, ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'TEST' })]),
        ),
      );
    });

    it('permet d enchaîner deux modifications', () => {
      const fichier = fichierDe([L400, L405]);
      const un = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      const deux = reussir(modifierChamp(un, { ligne: 2, champ: 'prenom1' }, 'JEAN'));
      expect(sortieDe(deux)).toBe(
        enChaineBinaire(
          fichierSynthetique([L400, ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'JEAN' })]),
        ),
      );
    });

    it('permet de modifier deux fois le même champ', () => {
      const un = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'MARTIN'));
      const deux = reussir(modifierChamp(un, { ligne: 1, champ: 'nom' }, 'DURAND'));
      expect(sortieDe(deux)).toBe(ligneSynthetique('405', { nom: 'DURAND', prenom1: 'TEST' }));
    });

    it('modifie le bon champ parmi plusieurs lignes de même entité', () => {
      const fichier = fichierDe([L405, L405, L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      const lignes = sortieDe(res).split('\r\n');
      expect(lignes[0]).toBe(L405);
      expect(lignes[1]).toBe(ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'TEST' }));
      expect(lignes[2]).toBe(L405);
    });

    it.each(MODIFIABLES)('%s %s : écrit la valeur au bon endroit', (code, nom) => {
      const fichier = fichierDe([ligneSynthetique(code)]);
      const res = reussir(modifierChamp(fichier, { ligne: 1, champ: nom }, 'AB'));
      expect(sortieDe(res)).toBe(ligneSynthetique(code, { [nom]: 'AB' }));
    });
  });

  describe('immuabilité et partage', () => {
    it('ne modifie pas le fichier d entrée (profondément gelé)', () => {
      const fichier = deepFreeze(fichierDe([L400, L405, L400]));
      const avant = sortieDe(fichier);
      const resultat = modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN');
      expect(resultat.ok).toBe(true);
      expect(sortieDe(fichier)).toBe(avant);
    });

    it('ne modifie pas le fichier d entrée en cas d échec', () => {
      const fichier = deepFreeze(fichierDe([L400, L405]));
      const avant = sortieDe(fichier);
      expect(modifierChamp(fichier, { ligne: 2, champ: 'prenom2' }, 'X').ok).toBe(false);
      expect(sortieDe(fichier)).toBe(avant);
    });

    it('partage par référence les autres lignes', () => {
      const fichier = fichierDe([L400, L405, L400]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(res.lignes).toHaveLength(3);
      expect(res.lignes[0]).toBe(fichier.lignes[0]);
      expect(res.lignes[2]).toBe(fichier.lignes[2]);
      expect(res.lignes[1]).not.toBe(fichier.lignes[1]);
    });

    it('partage par référence la hiérarchie', () => {
      const fichier = fichierDe([L400, L405, L400]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(res.dossiers).toBe(fichier.dossiers);
      expect(res.e000).toBe(fichier.e000);
      expect(res.e999).toBe(fichier.e999);
    });

    it('conserve le numéro, la fin de ligne et l origine de la ligne modifiée', () => {
      const fichier = fichierDe([L400, L405, L400], { fin: ['\r\n', '\n', '\r\n'] });
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      const avant = fichier.lignes[1]!;
      const apres = res.lignes[1]!;
      expect(apres.nature).toBe('decrite');
      expect(apres.code).toBe('405');
      expect(apres.numero).toBe(2);
      expect(apres.finDeLigne).toBe('\n');
      expect(apres.origine).toBe(avant.origine);
    });

    it('met à jour les valeurs de la ligne modifiée seulement', () => {
      const fichier = fichierDe([L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 1, champ: 'nom' }, 'MARTIN'));
      const avant = fichier.lignes[0]!;
      const apres = res.lignes[0]!;
      if (avant.nature !== 'decrite' || apres.nature !== 'decrite')
        throw new Error('décrite attendue');
      expect(avant.valeurs.nom).toBe('DUPONT');
      expect(apres.valeurs.prenom1).toBe(avant.valeurs.prenom1);
    });

    it('consigne le champ modifié dans champsModifies', () => {
      const fichier = fichierDe([L400, L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(res.lignes[1]).toMatchObject({ champsModifies: ['nom'] });
      expect(Object.isFrozen((res.lignes[1] as { champsModifies: unknown }).champsModifies)).toBe(
        true,
      );
    });

    it('n ajoute pas de doublon quand le même champ est modifié deux fois', () => {
      const un = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'nom' }, 'MARTIN'));
      const deux = reussir(modifierChamp(un, { ligne: 1, champ: 'nom' }, 'DURAND'));
      expect(deux.lignes[0]).toMatchObject({ champsModifies: ['nom'] });
    });

    it('accumule les champs modifiés dans l ordre des modifications', () => {
      const un = reussir(modifierChamp(fichierDe([L405]), { ligne: 1, champ: 'prenom1' }, 'JEAN'));
      const deux = reussir(modifierChamp(un, { ligne: 1, champ: 'nom' }, 'MARTIN'));
      expect(deux.lignes[0]).toMatchObject({ champsModifies: ['prenom1', 'nom'] });
    });

    it('ne consigne rien sur les autres lignes ni sur le fichier d entrée', () => {
      const fichier = fichierDe([L400, L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(res.lignes[0]).not.toHaveProperty('champsModifies');
      expect(fichier.lignes[1]).not.toHaveProperty('champsModifies');
    });

    it('ne consigne rien quand la modification est refusée', () => {
      const fichier = fichierDe([L405]);
      expect(modifierChamp(fichier, { ligne: 1, champ: 'prenom2' }, 'X').ok).toBe(false);
      expect(fichier.lignes[0]).not.toHaveProperty('champsModifies');
    });

    it('conserve le BOM', () => {
      const fichier = fichierDe([L400, L405], { bom: true });
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(res.bom).toBe(true);
      expect(sortieDe(res).startsWith('\xEF\xBB\xBF')).toBe(true);
    });

    it('conserve le format LF', () => {
      const fichier = fichierDe([L400, L405], { fin: '\n', sautFinal: true });
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(sortieDe(res)).toBe(
        enChaineBinaire(
          fichierSynthetique([L400, ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'TEST' })], {
            fin: '\n',
            sautFinal: true,
          }),
        ),
      );
    });

    it('conserve l absence de saut final', () => {
      const fichier = fichierDe([L400, L405]);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(sortieDe(res).endsWith('\r\n')).toBe(false);
    });

    it('conserve les fins de ligne mixtes de tout le fichier', () => {
      const options: OptionsFichierSynthetique = { fin: ['\r\n', '\n', '\r'], sautFinal: true };
      const fichier = fichierDe([L400, L405, L400], options);
      const res = reussir(modifierChamp(fichier, { ligne: 2, champ: 'nom' }, 'MARTIN'));
      expect(sortieDe(res)).toBe(
        enChaineBinaire(
          fichierSynthetique(
            [L400, ligneSynthetique('405', { nom: 'MARTIN', prenom1: 'TEST' }), L400],
            options,
          ),
        ),
      );
    });
  });
});
