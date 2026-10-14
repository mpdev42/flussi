import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LigneJournal, SessionJournal } from '@shared/types';
import { BadgeNiveau, DetailSessionVue, type DetailSessionVueProps } from './detail-session';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
const SESSION: SessionJournal = {
  chemin: '2026/10/20261014-091500-dupont.txt',
  date: '2026-10-14',
  heure: '09:15:00',
  compte: 'dupont',
  enCours: false,
  copieConflitProbable: false,
};

const LIGNE_DEBUT: LigneJournal = {
  heure: '09:15:00',
  niveau: 'TITRE',
  message: 'Début de session le 14/10/2026 à 09:15:00',
};
const LIGNE_FIN: LigneJournal = { heure: '09:40:12', niveau: 'TITRE', message: 'Fin de session' };

function rendre(props: Partial<DetailSessionVueProps> = {}): string {
  const html = renderToStaticMarkup(
    <DetailSessionVue
      session={SESSION}
      lignes={[LIGNE_DEBUT, LIGNE_FIN]}
      chargement={false}
      erreur={null}
      onRetour={() => {}}
      onReessayer={() => {}}
      {...props}
    />,
  );
  return html.replaceAll('<!-- -->', '');
}

const AVERTISSEMENT = 'Pas de ligne « Fin de session »';

describe('DetailSessionVue — contenu', () => {
  it('affiche le titre « Session du 14/10/2026 à 09:15:00 »', () => {
    expect(rendre()).toMatch(/<h1[^>]*>Session du 14\/10\/2026 à 09:15:00<\/h1>/);
  });

  it('affiche le compte en légende', () => {
    expect(rendre()).toMatch(/<p[^>]*>dupont<\/p>/);
  });

  it('précise « Session en cours » en légende pour la session en cours', () => {
    expect(rendre({ session: { ...SESSION, enCours: true } })).toContain(
      'dupont · Session en cours',
    );
  });

  it('affiche les en-têtes Heure, Niveau, Message', () => {
    const entetes = [...rendre().matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(entetes).toEqual(['Heure', 'Niveau', 'Message']);
  });

  it('affiche l’heure, le niveau et le message de chaque ligne', () => {
    const html = rendre();
    expect(html).toContain('>09:15:00</td>');
    expect(html).toContain('>09:40:12</td>');
    expect(html).toContain('Début de session le 14/10/2026 à 09:15:00');
    expect(html).toContain('>Fin de session</td>');
  });

  it('affiche le bouton « Retour à l’historique »', () => {
    expect(rendre()).toMatch(/<button[^>]*>.*Retour à l&#x27;historique<\/button>/);
  });

  it('rend une ligne non conforme en brut, sans heure ni badge', () => {
    const html = rendre({
      lignes: [{ heure: null, niveau: null, message: '{\\rtf1 ligne brute}' }, LIGNE_FIN],
    });
    expect(html).toContain('{\\rtf1 ligne brute}');
    const lignes = html.match(/<tr>.*?<\/tr>/g) ?? [];
    // En-tête + 2 lignes de données
    expect(lignes).toHaveLength(3);
    const brute = lignes.find((l) => l.includes('ligne brute')) as string;
    expect(brute).toMatch(/<td[^>]*><\/td><td[^>]*><\/td><td/);
  });

  it('affiche le titre en gras (niveau TITRE)', () => {
    expect(rendre()).toContain('font-semibold');
  });
});

describe('DetailSessionVue — badges de niveau', () => {
  it('affiche « Titre », « Info », « Succès » et « Erreur » dans le tableau', () => {
    const html = rendre({
      lignes: [
        { heure: '09:15:00', niveau: 'TITRE', message: 'a' },
        { heure: '09:15:01', niveau: 'INFO', message: 'b' },
        { heure: '09:15:02', niveau: 'SUCCES', message: 'c' },
        { heure: '09:15:03', niveau: 'ERREUR', message: 'd' },
        LIGNE_FIN,
      ],
    });
    for (const libelle of ['Titre', 'Info', 'Succès', 'Erreur']) {
      expect(html).toMatch(new RegExp(`</svg>${libelle}</span>`));
    }
  });

  it('BadgeNiveau associe une icône au mot, jamais la couleur seule', () => {
    const niveaux = ['TITRE', 'INFO', 'SUCCES', 'ERREUR'] as const;
    const attendus = ['Titre', 'Info', 'Succès', 'Erreur'];
    niveaux.forEach((niveau, i) => {
      const html = renderToStaticMarkup(<BadgeNiveau niveau={niveau} />);
      expect(html).toContain('<svg');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain(`</svg>${attendus[i]}</span>`);
    });
  });
});

describe('DetailSessionVue — avertissement de fin de session', () => {
  it('apparaît si la session n’est pas en cours et sans « Fin de session »', () => {
    const html = rendre({ lignes: [LIGNE_DEBUT] });
    expect(html).toContain(AVERTISSEMENT);
    expect(html).toContain('role="alert"');
  });

  it('est absent pour la session en cours', () => {
    const html = rendre({ session: { ...SESSION, enCours: true }, lignes: [LIGNE_DEBUT] });
    expect(html).not.toContain(AVERTISSEMENT);
  });

  it('est absent si la ligne « Fin de session » existe', () => {
    expect(rendre({ lignes: [LIGNE_DEBUT, LIGNE_FIN] })).not.toContain(AVERTISSEMENT);
  });

  it('apparaît si le texte « Fin de session » n’est que dans une ligne non conforme', () => {
    const html = rendre({
      lignes: [LIGNE_DEBUT, { heure: null, niveau: null, message: 'Fin de session' }],
    });
    expect(html).toContain(AVERTISSEMENT);
  });

  it('apparaît pour un fichier vide qui n’est pas la session en cours', () => {
    expect(rendre({ lignes: [] })).toContain(AVERTISSEMENT);
  });

  it('est absent pendant le chargement et en erreur (lignes inconnues)', () => {
    expect(rendre({ lignes: null, chargement: true })).not.toContain(AVERTISSEMENT);
    expect(rendre({ lignes: null, erreur: 'Illisible' })).not.toContain(AVERTISSEMENT);
  });
});

describe('DetailSessionVue — chargement et erreur', () => {
  it('affiche un tableau aria-busy sans ligne de données pendant le chargement', () => {
    const html = rendre({ lignes: null, chargement: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Chargement de la session"');
    expect(html).not.toContain('Fin de session');
  });

  it('affiche « Impossible de lire cette session », la cause et « Réessayer »', () => {
    const html = rendre({ lignes: null, erreur: 'Fichier introuvable' });
    expect(html).toContain('Impossible de lire cette session');
    expect(html).toContain('Fichier introuvable');
    expect(html).toMatch(/<button[^>]*>.*Réessayer<\/button>/);
    expect(html).not.toContain('<table');
  });

  it('affiche une cause par défaut si les lignes sont absentes sans erreur', () => {
    const html = rendre({ lignes: null, erreur: null });
    expect(html).toContain('Impossible de lire cette session');
    expect(html).toContain('Le contenu de la session est indisponible.');
  });

  it('garde le bouton de retour en erreur et en chargement', () => {
    expect(rendre({ lignes: null, erreur: 'x' })).toContain('Retour à l&#x27;historique');
    expect(rendre({ lignes: null, chargement: true })).toContain('Retour à l&#x27;historique');
  });
});
