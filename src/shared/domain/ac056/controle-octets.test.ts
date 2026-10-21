// Divergence 5 (octets interdits dans tout champ), un seul message par champ, `champsModifies`
// après `modifierChamp`, ordre du résultat, `controlerChamp` et tenue en charge.
// Fichiers synthétiques uniquement.
import { describe, expect, it } from 'vitest';
import {
  fichierSynthetique,
  ligneSynthetique,
  lignesCompletes,
} from '@shared/test/ac056-synthetique';
import {
  avecChamp,
  avecOctet,
  controle,
  dansBeneficiaire,
  dansEvenement,
  INTERDIT,
  ligne,
  lire,
  NON_AUTORISE,
  quadruplets,
  triplets,
} from '@shared/test/controle-ac056';
import { controlerAc056, controlerChamp } from './controle';
import { CODES_ENTITE, ENTITES } from './entites';
import { lireAc056 } from './lecteur';
import type { FichierAc056 } from './modele';
import { modifierChamp } from './modification';
import { octetsDepuisTexte } from './octets';

function modifier(
  fichier: FichierAc056,
  ligneCible: number,
  champ: string,
  valeur: string,
): FichierAc056 {
  const resultat = modifierChamp(fichier, { ligne: ligneCible, champ }, valeur);
  if (!resultat.ok) throw new Error(`modification refusée : ${resultat.erreur.code}`);
  return resultat.fichier;
}

describe('controlerAc056 : divergence 5, octets interdits dans tout champ', () => {
  /** Anomalies d'une 405 (ligne 5) dont l'octet d'indice `indice` (base 0) vaut `caractere`. */
  const sur405 = (indice: number, caractere: string) =>
    quadruplets(controle(dansBeneficiaire('AUTRE', avecOctet(ligne('405'), indice, caractere))));

  const messagePrenom2 = (octet: number) =>
    `Entité 405 : caractère interdit dans le champ prenom2 (octets 108 à 127), octet ${octet}.`;

  it.each([
    ['au début', 107],
    ['au milieu', 117],
    ['à la fin', 126],
  ])('signale un octet 0x7F %s d un champ que Lazarus ne contrôle pas', (_nom, indice) => {
    expect(sur405(indice, '\x7F')).toEqual([[5, 'prenom2', INTERDIT, messagePrenom2(indice + 1)]]);
  });

  it('cite le premier octet interdit du champ, pas les suivants', () => {
    const texte = avecChamp(ligne('405'), '405', 'prenom2', 'AB\x01C\x02');
    expect(quadruplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      [5, 'prenom2', INTERDIT, messagePrenom2(110)],
    ]);
  });

  it('ne signale pas l octet qui borde le champ voisin', () => {
    expect(sur405(106, '\x7F').map((a) => a[1])).toEqual(['prenom1']);
    expect(sur405(127, '\x7F').map((a) => a[1])).toEqual(['prenom3']);
  });

  it('signale le premier octet de la ligne (numEmetteur)', () => {
    expect(sur405(0, '\x01')).toEqual([
      [
        5,
        'numEmetteur',
        INTERDIT,
        'Entité 405 : caractère interdit dans le champ numEmetteur (octets 1 à 9), octet 1.',
      ],
    ]);
  });

  it('signale le dernier octet de la ligne (zoneNonDecrite)', () => {
    expect(sur405(699, '\xFF')).toEqual([
      [
        5,
        'zoneNonDecrite',
        INTERDIT,
        'Entité 405 : caractère interdit dans le champ zoneNonDecrite (octets 248 à 700), octet 700.',
      ],
    ]);
  });

  it('signale les octets d en-tête : numDossier et numEvt', () => {
    const texte = avecOctet(avecOctet(ligne('110'), 10, '\x02'), 18, '\x03');
    expect(triplets(controle(dansEvenement(texte)))).toEqual([
      [4, 'numDossier', INTERDIT],
      [4, 'numEvt', INTERDIT],
    ]);
  });

  it.each([
    ['0x00', '\x00'],
    ['0x01', '\x01'],
    ['la tabulation', '\x09'],
    ['0x1F', '\x1F'],
    ['0x7F', '\x7F'],
    ['0x80', '\x80'],
    ['0xA0', '\xA0'],
    ['0xFF', '\xFF'],
  ])('interdit l octet %s', (_nom, caractere) => {
    expect(sur405(117, caractere).map((a) => a[2])).toEqual([INTERDIT]);
  });

  it.each([
    ['l espace', ' '],
    ['le tilde 0x7E', '~'],
    ['une lettre', 'a'],
    ['l arobase', '@'],
  ])('autorise %s', (_nom, caractere) => {
    expect(sur405(117, caractere)).toEqual([]);
  });

  it('ne signale qu une fois un champ qui contient plusieurs octets interdits', () => {
    const texte = avecChamp(ligne('405'), '405', 'prenom2', '\x01\x02A\x7F');
    expect(triplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      [5, 'prenom2', INTERDIT],
    ]);
  });

  it('signale deux champs voisins distincts', () => {
    const texte = avecChamp(
      avecChamp(ligne('405'), '405', 'prenom2', '\x01'),
      '405',
      'prenom3',
      '\x01',
    );
    expect(triplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      [5, 'prenom2', INTERDIT],
      [5, 'prenom3', INTERDIT],
    ]);
  });

  it('signale un octet interdit dans une entité que Lazarus ne contrôle pas : 110', () => {
    const texte = avecChamp(ligneSynthetique('110'), '110', 'numEmetteur', '\x01');
    expect(triplets(controle(dansEvenement(texte)))).toEqual([[4, 'numEmetteur', INTERDIT]]);
  });

  it('signale une tabulation de tête rognée dans un champ de Lazarus, avec son libellé', () => {
    // La tabulation est retirée par Trim : Lazarus ne voit rien, la divergence 5 la signale.
    const texte = avecChamp(ligne('405'), '405', 'nom', '\tDUPONT');
    expect(quadruplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
      [5, 'nom', INTERDIT, 'Entité 405 : caractère interdit dans le champ « Nom », octet 38.'],
    ]);
  });

  it('signale une tabulation de fin rognée dans un champ de Lazarus', () => {
    const texte = avecChamp(ligne('405'), '405', 'nom', 'DUPONT\t');
    expect(triplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([[5, 'nom', INTERDIT]]);
  });

  describe('lignes brutes 000, 001, 990, 995, 999', () => {
    it.each(['000', '001', '990', '995', '999'] as const)(
      'signale un octet interdit dans les données de la %s',
      (code) => {
        const lignes = dansEvenement();
        const indice = lignes.findIndex((texte) => texte.slice(22, 25) === code);
        lignes[indice] = avecOctet(ligneSynthetique(code), 100, '\x01');
        expect(quadruplets(controle(lignes))).toEqual([
          [
            indice + 1,
            'donnees',
            INTERDIT,
            `Entité ${code} : caractère interdit dans le champ donnees (octets 26 à 700), octet 101.`,
          ],
        ]);
      },
    );

    it('signale aussi un octet interdit dans l en-tête d une 999', () => {
      const lignes = dansEvenement();
      lignes[5] = avecOctet(ligneSynthetique('999'), 2, '\xE9');
      expect(triplets(controle(lignes))).toEqual([[6, 'numEmetteur', INTERDIT]]);
    });

    it('rattache les octets au-delà de 700 au dernier champ de la 000', () => {
      expect(triplets(controle([ligneSynthetique('000') + ' \x7F']))).toEqual([
        [1, 'donnees', INTERDIT],
      ]);
    });
  });

  describe('lignes que Lazarus ne reconnaît pas', () => {
    it('ne contrôle pas une ligne de code inconnu', () => {
      const inconnue = avecOctet(ligneSynthetique('405', { numEntite: '123' }), 117, '\x01');
      expect(controle(dansEvenement(inconnue))).toEqual([]);
    });

    it('ne contrôle pas une ligne de moins de 25 octets', () => {
      expect(controle(['\x01\x02'])).toEqual([]);
    });

    it('contrôle une ligne de 25 octets exactement', () => {
      const court = avecOctet(ligneSynthetique('405'), 3, '\x01').slice(0, 25);
      expect(triplets(controle(dansEvenement(court)))).toEqual([[4, 'numEmetteur', INTERDIT]]);
    });

    it('contrôle une ligne tronquée : seuls les champs présents', () => {
      const courte = avecOctet(ligneSynthetique('405'), 117, '\x01').slice(0, 120);
      expect(triplets(controle(dansEvenement(courte)))).toEqual([[4, 'prenom2', INTERDIT]]);
    });
  });

  describe('chaque champ de chaque entité', () => {
    it.each(CODES_ENTITE)('%s : un octet interdit en tête de chaque champ le désigne', (code) => {
      for (const champ of ENTITES[code].champs) {
        if (champ.nom === 'numEntite') continue;
        const texte = avecOctet(ligneSynthetique(code), champ.position - 1, '\x01');
        const anomalies = controlerAc056(lireAc056(fichierSynthetique([texte])).fichier);
        expect([champ.nom, anomalies.map((a) => a.champ)]).toEqual([champ.nom, [champ.nom]]);
      }
    });

    it.each(CODES_ENTITE)('%s : les champs couvrent les 700 octets sans trou', (code) => {
      let attendu = 1;
      for (const champ of ENTITES[code].champs) {
        expect([champ.nom, champ.position]).toEqual([champ.nom, attendu]);
        attendu += champ.longueur;
      }
      expect(attendu).toBe(701);
    });
  });

  describe('caractères UTF-8 multi-octets', () => {
    /**
     * 405 dont le champ `champ` vaut « JOS » + séquence + espaces, le bourrage étant calculé en
     * caractères comme le ferait un logiciel qui compte des caractères et non des octets : la
     * ligne dépasse 700 octets, les champs suivants sont décalés.
     */
    function ligneAvecSequence(champ: 'nom' | 'prenom2', sequence: string): string {
      const description = ENTITES['405'].champs.find((c) => c.nom === champ)!;
      const base = ligne('405', { prenom1: 'TEST' });
      const debut = description.position - 1;
      const contenu = 'JOS' + octetsDepuisTexte(sequence) + ' '.repeat(description.longueur - 4);
      return base.slice(0, debut) + contenu + base.slice(debut + description.longueur);
    }

    const SEQUENCES = [
      ['é', 2],
      ['€', 3],
      ['😀', 4],
    ] as const;

    it.each(SEQUENCES)(
      '%s (%i octets) dans un champ sans règle : un seul message',
      (car, octets) => {
        const texte = ligneAvecSequence('prenom2', car);
        expect(texte).toHaveLength(699 + octets);
        const lecture = lireAc056(fichierSynthetique(dansBeneficiaire('AUTRE', texte)));
        expect(lecture.anomalies.map((a) => a.code)).toContain('longueur-ligne');
        expect(triplets(controlerAc056(lecture.fichier))).toEqual([[5, 'prenom2', INTERDIT]]);
      },
    );

    it.each(SEQUENCES)('%s dans le nom : un seul message, le prénom décalé reste valide', (car) => {
      const lecture = lireAc056(
        fichierSynthetique(dansBeneficiaire('AUTRE', ligneAvecSequence('nom', car))),
      );
      expect(lecture.anomalies.map((a) => a.code)).toContain('longueur-ligne');
      expect(quadruplets(controlerAc056(lecture.fichier))).toEqual([
        [5, 'nom', NON_AUTORISE, 'Entité 405 : caractère non autorisé dans le nom'],
      ]);
    });
  });

  describe('un seul message par champ', () => {
    it('émet le jeu de caractères de Lazarus et non la divergence 5 sur un champ contrôlé', () => {
      const texte = avecChamp(ligne('405'), '405', 'nom', 'JOS\xC3\x89');
      expect(quadruplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
        [5, 'nom', NON_AUTORISE, 'Entité 405 : caractère non autorisé dans le nom'],
      ]);
    });

    it('émet un seul message pour plusieurs octets interdits qui échouent aussi le jeu', () => {
      const texte = avecChamp(ligne('405'), '405', 'nom', '\x7F\x80\xFF');
      expect(triplets(controle(dansBeneficiaire('AUTRE', texte)))).toEqual([
        [5, 'nom', NON_AUTORISE],
      ]);
    });

    it('émet la divergence 5 pour le même champ d une ligne non rattachée', () => {
      const lignes = dansBeneficiaire(
        'AUTRE',
        avecChamp(ligne('405'), '405', 'nom', 'JOS\xC3\x89'),
        ligne('405', { nom: 'DUPONT' }),
      );
      expect(triplets(controle(lignes))).toEqual([[5, 'nom', INTERDIT]]);
    });

    it('émet le jeu et la longueur du code postal, jamais la divergence 5 en plus', () => {
      const texte = avecChamp(ligne('120'), '120', 'codePostalLocalite', '\xC3\xA9');
      expect(triplets(controle(dansEvenement(texte)))).toEqual([
        [4, 'codePostalLocalite', NON_AUTORISE],
        [4, 'codePostalLocalite', 'code-postal-longueur'],
      ]);
    });

    it('émet le rang non numérique puis la divergence 5 sur le même rang', () => {
      const texte = ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: '\x01' });
      expect(triplets(controle(dansEvenement(texte)))).toEqual([
        [4, 'rang', 'rang-non-numerique'],
        [4, 'rang', INTERDIT],
      ]);
    });

    it('émet le rang incohérent seul quand le rang ne contient aucun octet interdit', () => {
      const texte = ligneSynthetique('400', { typeAssure: 'ASSPRI', rang: '45' });
      expect(triplets(controle(dansEvenement(texte)))).toEqual([[4, 'rang', 'rang-incoherent']]);
    });
  });
});

describe('controlerAc056 : champs modifiés (champsModifies)', () => {
  const lignes = dansBeneficiaire('AUTRE', avecChamp(ligne('405'), '405', 'nom', '\tDUPONT'));

  it('signale la tabulation de tête d origine', () => {
    expect(triplets(controle(lignes))).toEqual([[5, 'nom', INTERDIT]]);
  });

  it('juge la valeur saisie : le même texte visible efface l erreur', () => {
    const fichier = modifier(lire(lignes), 5, 'nom', 'DUPONT');
    expect(controlerAc056(fichier)).toEqual([]);
  });

  it('juge la valeur saisie : un octet interdit saisi est signalé une seule fois', () => {
    // À l'intérieur de la valeur : en bord, `Trim` le retirerait (précision B2).
    const fichier = modifier(lire(lignes), 5, 'nom', 'DUP\x07ONT');
    expect(triplets(controlerAc056(fichier))).toEqual([[5, 'nom', NON_AUTORISE]]);
  });

  it('juge la valeur saisie avec les règles de Lazarus', () => {
    const fichier = modifier(lire(lignes), 5, 'nom', 'dupont');
    expect(quadruplets(controlerAc056(fichier))).toEqual([
      [5, 'nom', NON_AUTORISE, 'Entité 405 : caractère non autorisé dans le nom'],
    ]);
  });

  it('n efface que le champ modifié', () => {
    const base = dansBeneficiaire(
      'AUTRE',
      avecChamp(avecChamp(ligne('405'), '405', 'nom', '\tDUPONT'), '405', 'prenom1', '\tJEAN'),
    );
    const fichier = modifier(lire(base), 5, 'nom', 'DUPONT');
    expect(triplets(controlerAc056(fichier))).toEqual([[5, 'prenom1', INTERDIT]]);
  });

  it('conserve l erreur d un champ non modifié de la même ligne', () => {
    const base = dansBeneficiaire('AUTRE', avecChamp(ligne('405'), '405', 'prenom2', '\x01'));
    const fichier = modifier(lire(base), 5, 'nom', 'DUPONT');
    expect(triplets(controlerAc056(fichier))).toEqual([[5, 'prenom2', INTERDIT]]);
  });

  it('un champ modifié deux fois reste jugé sur sa dernière valeur', () => {
    const un = modifier(lire(lignes), 5, 'nom', 'DUPONT');
    const deux = modifier(un, 5, 'nom', 'MARTIN');
    expect(controlerAc056(deux)).toEqual([]);
  });

  it('ne laisse saisir aucune tabulation dans un rang (chiffres seuls, précision B3)', () => {
    const fichier = lire(dansBeneficiaire('AUTRE', ligne('405')));
    expect(modifierChamp(fichier, { ligne: 5, champ: 'rang' }, '\t5')).toMatchObject({
      ok: false,
      erreur: { code: 'valeur-trop-courte' },
    });
  });

  it('juge le rang saisi avec le type d assuré de la 400', () => {
    const fichier = modifier(lire(dansBeneficiaire('ASSPRI', ligne('405'))), 5, 'rang', '25');
    expect(quadruplets(controlerAc056(fichier))).toEqual([
      [5, 'rang', 'rang-incoherent', 'Entité 405 : rang de bénéficiaire incohérent'],
    ]);
    expect(controlerAc056(modifier(fichier, 5, 'rang', '05'))).toEqual([]);
  });

  it('juge le rang de la 400 modifié pour les lignes du bénéficiaire qui en dépendent', () => {
    const base = dansEvenement(
      ligneSynthetique('400', { typeAssure: 'ASSPRI' }),
      ligne('405', { rang: '30' }),
    );
    expect(triplets(controle(base))).toEqual([[5, 'rang', 'rang-incoherent']]);
    const fichier = modifier(lire(base), 4, 'rang', '30');
    expect(triplets(controlerAc056(fichier))).toEqual([
      [4, 'rang', 'rang-incoherent'],
      [5, 'rang', 'rang-incoherent'],
    ]);
  });
});

describe('controlerAc056 : ordre du résultat', () => {
  it('trie par ligne puis par position du champ', () => {
    const l405 = avecChamp(
      avecChamp(
        avecChamp(ligne('405', { rang: '30', nom: '#' }), '405', 'numInsee', '#'),
        '405',
        'prenom2',
        '\x01',
      ),
      '405',
      'nomJeuneFille',
      '#',
    );
    const lignes = dansBeneficiaire('ASSPRI', l405, ligne('485', { code: 'X' }));
    expect(triplets(controle(lignes))).toEqual([
      [5, 'rang', 'rang-incoherent'],
      [5, 'nom', NON_AUTORISE],
      [5, 'prenom2', INTERDIT],
      [5, 'numInsee', NON_AUTORISE],
      [5, 'nomJeuneFille', NON_AUTORISE],
      [6, 'code', 'valeur-imposee'],
    ]);
  });

  it('trie par numéro de ligne avant la position du champ', () => {
    const lignes = dansBeneficiaire(
      'AUTRE',
      ligne('485', { valeur: 'X' }),
      ligne('485', { code: 'X' }),
    );
    expect(triplets(controle(lignes))).toEqual([
      [5, 'valeur', 'valeur-imposee'],
      [6, 'code', 'valeur-imposee'],
    ]);
  });

  it('numérote les lignes d origine malgré une ligne vide supprimée', () => {
    const lignes = dansEvenement('', ligne('115', { nom: '#' }));
    expect(triplets(controle(lignes))).toEqual([[5, 'nom', NON_AUTORISE]]);
  });
});

describe('controlerChamp', () => {
  const fichier = lire(
    dansBeneficiaire(
      'ASSPRI',
      avecChamp(ligne('405', { rang: '30', nom: '#', prenom1: '#' }), '405', 'prenom2', '\x01'),
    ),
  );

  it('ne renvoie que les anomalies du champ visé', () => {
    expect(quadruplets(controlerChamp(fichier, { ligne: 5, champ: 'nom' }))).toEqual([
      [5, 'nom', NON_AUTORISE, 'Entité 405 : caractère non autorisé dans le nom'],
    ]);
    expect(triplets(controlerChamp(fichier, { ligne: 5, champ: 'prenom1' }))).toEqual([
      [5, 'prenom1', NON_AUTORISE],
    ]);
    expect(triplets(controlerChamp(fichier, { ligne: 5, champ: 'prenom2' }))).toEqual([
      [5, 'prenom2', INTERDIT],
    ]);
    expect(triplets(controlerChamp(fichier, { ligne: 5, champ: 'rang' }))).toEqual([
      [5, 'rang', 'rang-incoherent'],
    ]);
  });

  it('renvoie les deux anomalies du code postal', () => {
    const f = lire(dansEvenement(ligne('120', { codePostalLocalite: 'AB' })));
    expect(triplets(controlerChamp(f, { ligne: 4, champ: 'codePostalLocalite' }))).toEqual([
      [4, 'codePostalLocalite', NON_AUTORISE],
      [4, 'codePostalLocalite', 'code-postal-longueur'],
    ]);
  });

  it('renvoie une liste vide pour un champ conforme', () => {
    expect(controlerChamp(fichier, { ligne: 5, champ: 'numInsee' })).toEqual([]);
  });

  it('renvoie une liste vide pour une ligne ou un champ inconnu', () => {
    expect(controlerChamp(fichier, { ligne: 99, champ: 'nom' })).toEqual([]);
    expect(controlerChamp(fichier, { ligne: 5, champ: 'inexistant' })).toEqual([]);
  });

  it('juge le rang d un champ avec le type d assuré de la 400', () => {
    const f = lire(dansBeneficiaire('ENFANT', ligne('405', { rang: '30' })));
    expect(controlerChamp(f, { ligne: 5, champ: 'rang' })).toEqual([]);
  });

  it('couvre toutes les anomalies du contrôle complet, champ par champ', () => {
    const parChamp = ['rang', 'nom', 'prenom1', 'prenom2'].flatMap((champ) =>
      controlerChamp(fichier, { ligne: 5, champ }),
    );
    expect(parChamp).toHaveLength(controlerAc056(fichier).length);
  });
});

describe('controlerAc056 : tenue en charge', () => {
  // Le cas conforme (lecture + contrôle) est mesuré par `structure.test.ts`.
  it('contrôle 5 442 lignes dont chaque 405 a un nom en erreur', () => {
    const modifiees = lignesCompletes({ dossiers: 80 }).map((texte) =>
      texte.slice(22, 25) === '405' ? avecChamp(texte, '405', 'nom', '#') : texte,
    );
    const fichier = lire(modifiees);
    const debut = performance.now();
    const anomalies = controlerAc056(fichier);
    expect(performance.now() - debut).toBeLessThan(5000);
    expect(anomalies).toHaveLength(80 * 4);
  });

  it('contrôle 5 442 lignes dont chaque octet est interdit', () => {
    const interdites = lignesCompletes({ dossiers: 80 }).map(
      (texte) => texte.slice(0, 25) + '\x01'.repeat(675),
    );
    const fichier = lire(interdites);
    const debut = performance.now();
    const anomalies = controlerAc056(fichier);
    expect(performance.now() - debut).toBeLessThan(5000);
    expect(anomalies.length).toBeGreaterThan(5442);
  });
});
