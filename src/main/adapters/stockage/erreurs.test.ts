import { describe, expect, it } from 'vitest';
import {
  formaterErreursStockage,
  messageLecteurIndisponible,
  traduireCodeSysteme,
  type ContexteErreur,
} from './erreurs';
import type { ErreurStockage } from './types';

const CONTEXTE: ContexteErreur = {
  emplacement: 'out',
  racine: 'P:\\Fictif\\OUT',
  chemin: 'P:\\Fictif\\OUT\\rapport.txt',
};
const LECTEUR = 'P:\\';

describe('traduireCodeSysteme', () => {
  it('traduit EACCES en acces-refuse', () => {
    const erreur = traduireCodeSysteme('EACCES', CONTEXTE, LECTEUR);
    expect(erreur).toMatchObject({
      code: 'acces-refuse',
      emplacement: 'out',
      chemin: CONTEXTE.chemin,
    });
    expect(erreur.message).toContain('droits insuffisants');
    expect(erreur.message).not.toContain('OneDrive');
  });

  it('traduit EPERM en acces-refuse en citant OneDrive', () => {
    const erreur = traduireCodeSysteme('EPERM', CONTEXTE, LECTEUR);
    expect(erreur.code).toBe('acces-refuse');
    expect(erreur.chemin).toBe(CONTEXTE.chemin);
    expect(erreur.message).toContain('OneDrive');
  });

  it('traduit EBUSY en verrou', () => {
    const erreur = traduireCodeSysteme('EBUSY', CONTEXTE, LECTEUR);
    expect(erreur).toMatchObject({ code: 'verrou', chemin: CONTEXTE.chemin });
    expect(erreur.message).toContain('3 nouvelles tentatives');
  });

  it('traduit ENOTDIR en introuvable', () => {
    const erreur = traduireCodeSysteme('ENOTDIR', CONTEXTE, LECTEUR);
    expect(erreur).toMatchObject({ code: 'introuvable', chemin: CONTEXTE.chemin });
    expect(erreur.message).toBe('fichier ou dossier introuvable.');
  });

  it('traduit EISDIR en introuvable, avec un message propre', () => {
    const erreur = traduireCodeSysteme('EISDIR', CONTEXTE, LECTEUR);
    expect(erreur).toMatchObject({ code: 'introuvable', chemin: CONTEXTE.chemin });
    expect(erreur.message).toBe("ce chemin n'est pas un fichier.");
  });

  it.each(['ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'ENOTCONN'])(
    'traduit le code réseau %s en lecteur-indisponible, sur la racine',
    (code) => {
      const erreur = traduireCodeSysteme(code, CONTEXTE, LECTEUR);
      expect(erreur).toMatchObject({
        code: 'lecteur-indisponible',
        emplacement: 'out',
        chemin: CONTEXTE.racine,
        message: 'lecteur P: non monté ou déconnecté.',
      });
    },
  );

  it('cite le partage réseau pour un code réseau sur un chemin UNC', () => {
    const erreur = traduireCodeSysteme('ETIMEDOUT', CONTEXTE, '\\\\serveur\\partage\\');
    expect(erreur.message).toBe('partage réseau \\\\serveur\\partage inaccessible.');
  });

  it('traduit un code inconnu en erreur-systeme en citant le code', () => {
    const erreur = traduireCodeSysteme('EMFILE', CONTEXTE, LECTEUR);
    expect(erreur).toMatchObject({ code: 'erreur-systeme', chemin: CONTEXTE.chemin });
    expect(erreur.message).toBe('erreur système inattendue (code EMFILE).');
  });

  it('traduit un code absent en erreur-systeme avec « inconnu »', () => {
    const erreur = traduireCodeSysteme(undefined, CONTEXTE, LECTEUR);
    expect(erreur.code).toBe('erreur-systeme');
    expect(erreur.message).toBe('erreur système inattendue (code inconnu).');
  });

  it('ne traite pas ENOENT (diagnostic fait par l’implémentation disque)', () => {
    expect(traduireCodeSysteme('ENOENT', CONTEXTE, LECTEUR).code).toBe('erreur-systeme');
  });
});

describe('messageLecteurIndisponible', () => {
  it('cite la lettre du lecteur', () => {
    expect(messageLecteurIndisponible('P:\\')).toBe('lecteur P: non monté ou déconnecté.');
  });

  it('cite le partage réseau sans barre finale', () => {
    expect(messageLecteurIndisponible('\\\\serveur\\partage\\')).toBe(
      'partage réseau \\\\serveur\\partage inaccessible.',
    );
  });
});

describe('formaterErreursStockage', () => {
  const erreurIn: ErreurStockage = {
    code: 'lecteur-indisponible',
    emplacement: 'in',
    chemin: 'P:\\Fictif\\IN',
    message: 'lecteur P: non monté ou déconnecté.',
  };
  const erreurJournal: ErreurStockage = {
    code: 'dossier-absent',
    emplacement: 'journal',
    chemin: 'P:\\Fictif\\Journal',
    message: 'dossier absent : Flussi ne le crée pas, vérifiez le chemin dans la configuration.',
  };

  it('affiche le nom, le chemin et la cause probable de chaque erreur', () => {
    const texte = formaterErreursStockage([erreurIn, erreurJournal]);
    expect(texte).toContain('- IN : P:\\Fictif\\IN\n  Cause probable : lecteur P: non monté');
    expect(texte).toContain('- Journal : P:\\Fictif\\Journal\n  Cause probable : dossier absent');
  });

  it('nomme OUT pour l’emplacement out', () => {
    const texte = formaterErreursStockage([{ ...erreurIn, emplacement: 'out' }]);
    expect(texte).toContain('- OUT : ');
  });

  it('termine par la consigne Réessayer et le service informatique', () => {
    const texte = formaterErreursStockage([erreurIn]);
    expect(texte.endsWith('contactez le service informatique.')).toBe(true);
    expect(texte).toContain('« Réessayer »');
  });

  it('sépare les erreurs par une ligne et la consigne par une ligne vide', () => {
    const texte = formaterErreursStockage([erreurIn, erreurJournal]);
    const [blocs, consigne] = texte.split('\n\n');
    expect(blocs?.split('\n')).toHaveLength(4);
    expect(consigne).toContain('Réessayer');
  });
});
