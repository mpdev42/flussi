import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SessionJournal } from '@shared/types';
import {
  HistoriqueJournalVue,
  INFOBULLE_COPIE_CONFLIT,
  type HistoriqueJournalVueProps,
} from './historique-journal';

// Rendu statique en environnement node : pas de DOM, on lit le HTML produit
function session(surcharge: Partial<SessionJournal> = {}): SessionJournal {
  return {
    chemin: '2026/10/20261014-091500-dupont.txt',
    date: '2026-10-14',
    heure: '09:15:00',
    compte: 'dupont',
    enCours: false,
    copieConflitProbable: false,
    ...surcharge,
  };
}

function rendre(props: Partial<HistoriqueJournalVueProps> = {}): string {
  const html = renderToStaticMarkup(
    <HistoriqueJournalVue
      annees={['2026']}
      annee="2026"
      mois="10"
      sessions={[session()]}
      chargement={false}
      erreur={null}
      onChoisirAnnee={() => {}}
      onChoisirMois={() => {}}
      onOuvrir={() => {}}
      onReessayer={() => {}}
      {...props}
    />,
  );
  return html.replaceAll('<!-- -->', '');
}

function lignesDonnees(html: string): string[] {
  return (html.match(/<tr[^>]*>.*?<\/tr>/g) ?? []).filter((ligne) => ligne.includes('<button'));
}

describe('HistoriqueJournalVue — avec données', () => {
  it('affiche les en-têtes Date, Heure, Compte, Statut', () => {
    const html = rendre();
    const entetes = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(entetes).toEqual(['Date', 'Heure', 'Compte', 'Statut']);
  });

  it('affiche le titre « Journal »', () => {
    expect(rendre()).toMatch(/<h1[^>]*>Journal<\/h1>/);
  });

  it('affiche la date JJ/MM/AAAA, l’heure et le compte', () => {
    const html = rendre();
    expect(html).toMatch(/<td[^>]*><button[^>]*>14\/10\/2026<\/button><\/td>/);
    expect(html).toMatch(/<td[^>]*>09:15:00<\/td>/);
    expect(html).toMatch(/<td[^>]*>dupont<\/td>/);
  });

  it('n’affiche jamais le nom de fichier ni le chemin', () => {
    const html = rendre({
      sessions: [
        session({ chemin: '2026/10/20261014-091500-dupont.txt' }),
        session({ chemin: '2026/10/20261013-080000-martin.txt', compte: 'martin' }),
      ],
    });
    expect(html).not.toContain('.txt');
    expect(html).not.toContain('2026/10/');
    expect(html).not.toContain('20261014-091500');
    expect(html).not.toContain('20261013-080000');
  });

  it('affiche le badge « En cours » seulement pour la session en cours', () => {
    const html = rendre({
      sessions: [
        session({ enCours: true, compte: 'courant', chemin: 'a' }),
        session({ compte: 'ancien', chemin: 'b' }),
      ],
    });
    const lignes = lignesDonnees(html);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toContain('En cours');
    expect(lignes[1]).not.toContain('En cours');
  });

  it('n’affiche aucun badge « En cours » sans session en cours', () => {
    expect(rendre()).not.toContain('En cours');
  });

  it('affiche le badge « Copie de conflit » avec son infobulle', () => {
    const html = rendre({ sessions: [session({ copieConflitProbable: true })] });
    expect(html).toContain('Copie de conflit');
    // React échappe l'apostrophe en &#x27; dans les attributs
    expect(html).toContain(`title="${INFOBULLE_COPIE_CONFLIT.replaceAll("'", '&#x27;')}"`);
  });

  it('ne propose « Copie de conflit » que pour les copies probables', () => {
    const html = rendre({
      sessions: [
        session({ copieConflitProbable: true, chemin: 'a' }),
        session({ chemin: 'b', compte: 'martin' }),
      ],
    });
    const lignes = lignesDonnees(html);
    expect(lignes[0]).toContain('Copie de conflit');
    expect(lignes[1]).not.toContain('Copie de conflit');
  });

  it('affiche les deux badges quand la session est en cours et copie de conflit', () => {
    const html = rendre({ sessions: [session({ enCours: true, copieConflitProbable: true })] });
    expect(html).toContain('En cours');
    expect(html).toContain('Copie de conflit');
  });

  it('conserve l’ordre des sessions fourni', () => {
    const html = rendre({
      sessions: [
        session({ chemin: 'a', compte: 'zoe' }),
        session({ chemin: 'b', compte: 'alice' }),
        session({ chemin: 'c', compte: 'marc' }),
      ],
    });
    const comptes = lignesDonnees(html).map((l) => /font-medium[^>]*>([^<]*)</.exec(l)?.[1]);
    expect(comptes).toEqual(['zoe', 'alice', 'marc']);
  });

  it('ouvre une session par un vrai bouton nommé, la ligne n’étant pas focalisable', () => {
    const lignes = lignesDonnees(rendre());
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatch(/^<tr(?![^>]*tabindex)/);
    expect(lignes[0]).toContain(
      '<button type="button" aria-label="Ouvrir la session du 14/10/2026 à 09:15:00"',
    );
    expect(lignes[0].match(/<button/g)).toHaveLength(1);
  });

  it('écrit « 1 session en octobre 2026 » au singulier', () => {
    expect(rendre()).toContain('1 session en octobre 2026');
  });

  it('écrit « 3 sessions en octobre 2026 » au pluriel', () => {
    const html = rendre({
      sessions: [session({ chemin: 'a' }), session({ chemin: 'b' }), session({ chemin: 'c' })],
    });
    expect(html).toContain('3 sessions en octobre 2026');
  });

  it('inclut les sélecteurs de période', () => {
    const html = rendre();
    expect(html).toContain('aria-label="Année"');
    expect(html).toContain('aria-label="Mois"');
  });
});

describe('HistoriqueJournalVue — chargement', () => {
  const html = () => rendre({ chargement: true, sessions: null });

  it('affiche un tableau aria-busy avec les en-têtes', () => {
    expect(html()).toContain('aria-busy="true"');
    expect(html()).toContain('aria-label="Chargement des sessions"');
    expect(html()).toContain('>Statut</th>');
  });

  it('n’affiche aucune ligne de données', () => {
    expect(lignesDonnees(html())).toHaveLength(0);
  });

  it('affiche la légende de chargement', () => {
    expect(html()).toContain('Chargement des sessions…');
  });

  it('garde la priorité au chargement même si des sessions précédentes existent', () => {
    const avecSessions = rendre({ chargement: true, sessions: [session()] });
    expect(avecSessions).toContain('aria-busy="true"');
    expect(lignesDonnees(avecSessions)).toHaveLength(0);
  });
});

describe('HistoriqueJournalVue — vide', () => {
  it('affiche « Aucune session en octobre 2026 »', () => {
    const html = rendre({ sessions: [] });
    expect(html).toContain('Aucune session en octobre 2026');
    expect(html).toContain('Les sessions de ce mois apparaîtront ici.');
  });

  it('n’affiche ni tableau ni ligne de données', () => {
    const html = rendre({ sessions: [] });
    expect(html).not.toContain('<table');
    expect(lignesDonnees(html)).toHaveLength(0);
  });

  it('suit l’année et le mois sélectionnés', () => {
    expect(rendre({ sessions: [], annee: '2024', mois: '02' })).toContain(
      'Aucune session en février 2024',
    );
  });

  it('écrit « 0 session en octobre 2026 » dans la légende', () => {
    expect(rendre({ sessions: [] })).toContain('0 session en octobre 2026');
  });
});

describe('HistoriqueJournalVue — erreur', () => {
  const html = () =>
    rendre({ sessions: null, erreur: 'Le lecteur P: est inaccessible', chargement: false });

  it('affiche « Impossible de charger l’historique » et la cause', () => {
    expect(html()).toContain('Impossible de charger l&#x27;historique');
    expect(html()).toContain('Le lecteur P: est inaccessible');
  });

  it('propose le bouton « Réessayer »', () => {
    expect(html()).toMatch(/<button[^>]*>.*Réessayer<\/button>/);
  });

  it('affiche la légende « Historique indisponible » sans tableau', () => {
    expect(html()).toContain('Historique indisponible');
    expect(html()).not.toContain('<table');
  });

  it('garde les sélecteurs de période pour changer de mois', () => {
    expect(html()).toContain('aria-label="Mois"');
  });
});
