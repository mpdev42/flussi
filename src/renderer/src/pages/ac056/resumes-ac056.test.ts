import { describe, expect, it } from 'vitest';
import { indexerLignes } from '@shared/domain/ac056';
import {
  REPERES_REJET_VARIE,
  lignesCompletes,
  lignesRejetVarie,
} from '@shared/test/ac056-synthetique';
import { avecChamp } from '@shared/test/controle-ac056';
import { analyseSynthetique } from '@/test/ac056';

import {
  libelleBeneficiaire,
  nomComplet,
  resumeBeneficiaire,
  resumeEvenement,
  texteChamp,
} from './resumes-ac056';

// Évènement 1 du dossier 2 : la 115 (assuré principal) et la 405 du conjoint (rang 02) portent des
// noms différents, pour que les tests distinguent la source du nom
const lignes = lignesCompletes().map((ligne) => {
  const code = ligne.slice(22, 25);
  if (ligne.slice(9, 17) !== '00000002' || ligne.slice(17, 20) !== '001') return ligne;
  if (code === '115')
    return avecChamp(avecChamp(ligne, '115', 'nom', 'MARTIN'), '115', 'prenom1', 'ALICE');
  if (code === '405' && ligne.slice(20, 22) === '02') {
    return avecChamp(avecChamp(ligne, '405', 'nom', 'DURAND'), '405', 'prenom1', 'BOB');
  }
  return ligne;
});
const { fichier } = analyseSynthetique(lignes);
const index = indexerLignes(fichier);
const noeud = index.evenements[2]!.noeud;

describe('resumeEvenement', () => {
  it('lit les valeurs de la 100', () => {
    expect(resumeEvenement(fichier, noeud)).toEqual({
      dossier: '00000002',
      numEvt: '001',
      contrat: 'CTR2',
      codeEvt: '000',
    });
  });
});

describe('resumeBeneficiaire', () => {
  it('prend le rang, le nom et le prénom de la 115 pour l’assuré principal', () => {
    expect(resumeBeneficiaire(fichier, noeud, noeud.beneficiaires[0]!)).toEqual({
      implicite: false,
      lien: 'ASSPRI',
      rang: '00',
      nom: 'MARTIN',
      prenom: 'ALICE',
    });
  });

  it('prend le rang, le nom et le prénom de la 405 pour les autres liens', () => {
    expect(resumeBeneficiaire(fichier, noeud, noeud.beneficiaires[1]!)).toEqual({
      implicite: false,
      lien: 'CONJOI',
      rang: '02',
      nom: 'DURAND',
      prenom: 'BOB',
    });
  });
});

describe('résumés d’un fichier de rejet', () => {
  const rejet = analyseSynthetique(lignesRejetVarie(), 'rejet').fichier;
  const indexRejet = indexerLignes(rejet);

  it('décode les accents en Windows-1252, jamais U+FFFD', () => {
    const noeud = indexRejet.evenements[0]!.noeud;

    const conjoint = resumeBeneficiaire(rejet, noeud, noeud.beneficiaires[1]!);

    expect(conjoint.nom).toBe(REPERES_REJET_VARIE.nom405);
    expect(conjoint.prenom).toBe(REPERES_REJET_VARIE.prenom405);
    expect(conjoint.implicite).toBe(false);
    expect(nomComplet(conjoint)).not.toContain('�');
  });

  it('marque implicite le bénéficiaire d’une 700 sans 400', () => {
    const noeud = indexRejet.evenements[1]!.noeud;
    expect(noeud.beneficiaires[0]!.e400).toBeNull();

    const implicite = resumeBeneficiaire(rejet, noeud, noeud.beneficiaires[0]!);

    expect(implicite.implicite).toBe(true);
    expect(libelleBeneficiaire(implicite)).toBe('Bénéficiaire absent du rejet');
  });

  it('lit le contrat de l’évènement', () => {
    expect(resumeEvenement(rejet, indexRejet.evenements[1]!.noeud).contrat).toBe('CTR1');
  });
});

describe('libelleBeneficiaire', () => {
  it('donne le nom et le prénom d’un bénéficiaire explicite', () => {
    const resume = resumeBeneficiaire(fichier, noeud, noeud.beneficiaires[1]!);

    expect(libelleBeneficiaire(resume)).toBe('DURAND BOB');
  });
});

describe('texteChamp', () => {
  it('renvoie un texte vide sans ligne', () => {
    expect(texteChamp(fichier, null, 'nom')).toBe('');
    expect(texteChamp(fichier, undefined, 'nom')).toBe('');
    expect(texteChamp(fichier, 0, 'nom')).toBe('');
  });
});

describe('nomComplet', () => {
  it('joint le nom et le prénom', () => {
    expect(nomComplet({ nom: 'DURAND', prenom: 'BOB' })).toBe('DURAND BOB');
  });

  it('n’ajoute pas d’espace quand l’un des deux est vide', () => {
    expect(nomComplet({ nom: 'DURAND', prenom: '' })).toBe('DURAND');
    expect(nomComplet({ nom: '', prenom: 'BOB' })).toBe('BOB');
    expect(nomComplet({ nom: '', prenom: '' })).toBe('');
  });
});
