import { describe, expect, it } from 'vitest';
import { indexerLignes } from '@shared/domain/ac056';
import { lignesCompletes } from '@shared/test/ac056-synthetique';
import { avecChamp } from '@shared/test/controle-ac056';
import { analyseSynthetique } from '@/test/ac056';

import { nomComplet, resumeBeneficiaire, resumeEvenement, texteChamp } from './resumes-ac056';

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
      lien: 'ASSPRI',
      rang: '00',
      nom: 'MARTIN',
      prenom: 'ALICE',
    });
  });

  it('prend le rang, le nom et le prénom de la 405 pour les autres liens', () => {
    expect(resumeBeneficiaire(fichier, noeud, noeud.beneficiaires[1]!)).toEqual({
      lien: 'CONJOI',
      rang: '02',
      nom: 'DURAND',
      prenom: 'BOB',
    });
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
