import { useState } from 'react';
import type { SessionJournal } from '@shared/types';

import { useHistoriqueJournal } from '@/hooks/use-historique-journal';
import { useSessionJournal } from '@/hooks/use-session-journal';

import { DetailSessionVue } from './detail-session';
import { HistoriqueJournalVue } from './historique-journal';

function DetailSession({ session, onRetour }: { session: SessionJournal; onRetour: () => void }) {
  const { valeur, chargement, erreur, recharger } = useSessionJournal(session.chemin);
  return (
    <DetailSessionVue
      session={session}
      lignes={valeur}
      chargement={chargement}
      erreur={erreur}
      onRetour={onRetour}
      onReessayer={recharger}
    />
  );
}

/**
 * Écran Journal : historique par année et mois, ou détail d'une session. Le choix de l'année et
 * du mois vit ici, au-dessus de la bascule : le retour retrouve la même période.
 */
export function Journal() {
  const historique = useHistoriqueJournal();
  const [ouverte, setOuverte] = useState<SessionJournal | null>(null);

  if (ouverte) return <DetailSession session={ouverte} onRetour={() => setOuverte(null)} />;

  return (
    <HistoriqueJournalVue
      annees={historique.annees}
      annee={historique.annee}
      mois={historique.mois}
      sessions={historique.sessions}
      chargement={historique.chargement}
      erreur={historique.erreur}
      onChoisirAnnee={historique.choisirAnnee}
      onChoisirMois={historique.choisirMois}
      onOuvrir={setOuverte}
      onReessayer={historique.recharger}
    />
  );
}
