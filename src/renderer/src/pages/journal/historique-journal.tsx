import { TriangleAlert } from 'lucide-react';
import type { SessionJournal } from '@shared/types';

import { Card } from '@/components/ui/card';
import { StatusBadge, ToneBadge } from '@/components/ui/status-badge';
import { formaterDate } from '@/lib/dates';
import { pluralize } from '@/lib/pluralize';

import {
  CLASSE_TD,
  EnTeteTableau,
  ErreurChargement,
  EtatVide,
  TableauChargement,
  type ColonneJournal,
} from './elements-tableau';
import { periodeEnLettres } from './format-journal';
import { MiseEnPageJournal } from './mise-en-page-journal';
import { SelecteursPeriode } from './selecteurs-periode';

const COLONNES: ColonneJournal[] = [
  { libelle: 'Date', largeur: 'w-1/5' },
  { libelle: 'Heure', largeur: 'w-1/5' },
  { libelle: 'Compte' },
  { libelle: 'Statut', largeur: 'w-1/4' },
];

export const INFOBULLE_COPIE_CONFLIT =
  "Copie de conflit OneDrive probable : rien n'a été supprimé ni fusionné";

export interface HistoriqueJournalVueProps {
  /** Années proposées, de la plus ancienne à la plus récente. */
  annees: string[];
  annee: string;
  /** `01` à `12` */
  mois: string;
  /** Sessions dans l'ordre d'affichage (le main trie), `null` tant qu'elles ne sont pas chargées. */
  sessions: SessionJournal[] | null;
  chargement: boolean;
  /** Cause lisible de l'échec de chargement. */
  erreur: string | null;
  onChoisirAnnee: (annee: string) => void;
  onChoisirMois: (mois: string) => void;
  onOuvrir: (session: SessionJournal) => void;
  onReessayer: () => void;
}

function legendeHistorique(
  { sessions, chargement, erreur }: HistoriqueJournalVueProps,
  periode: string,
): string {
  if (chargement) return 'Chargement des sessions…';
  if (erreur !== null || sessions === null) return 'Historique indisponible';
  const n = sessions.length;
  return `${n} ${pluralize(n, 'session', 'sessions')} en ${periode}`;
}

function StatutSession({ session }: { session: SessionJournal }) {
  if (!session.enCours && !session.copieConflitProbable) return null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {session.enCours && <StatusBadge status="du-jour" label="En cours" />}
      {session.copieConflitProbable && (
        <ToneBadge tone="warning" title={INFOBULLE_COPIE_CONFLIT} icon={TriangleAlert}>
          Copie de conflit
        </ToneBadge>
      )}
    </span>
  );
}

/** Nom accessible du bouton : commence par la date visible, puis donne l'heure. */
function libelleOuvrir(session: SessionJournal): string {
  return `Ouvrir la session du ${formaterDate(session.date)} à ${session.heure}`;
}

function LigneSession({
  session,
  onOuvrir,
}: {
  session: SessionJournal;
  onOuvrir: (session: SessionJournal) => void;
}) {
  // Le bouton de la première cellule porte le focus et l'activation clavier ; le clic sur le
  // reste de la ligne est un confort à la souris.
  return (
    <tr
      onClick={() => onOuvrir(session)}
      className="cursor-pointer transition-colors duration-fast hover:bg-blue-50 focus-within:bg-blue-50"
    >
      <td className={`${CLASSE_TD} tabular-nums`}>
        <button
          type="button"
          aria-label={libelleOuvrir(session)}
          onClick={(evenement) => {
            evenement.stopPropagation();
            onOuvrir(session);
          }}
          className="cursor-pointer rounded-sm tabular-nums focus-visible:outline-none focus-visible:shadow-focus"
        >
          {formaterDate(session.date)}
        </button>
      </td>
      <td className={`${CLASSE_TD} tabular-nums`}>{session.heure}</td>
      <td className={`${CLASSE_TD} font-medium text-foreground`}>{session.compte}</td>
      <td className={CLASSE_TD}>
        <StatutSession session={session} />
      </td>
    </tr>
  );
}

/** Historique du journal : sélecteurs d'année et de mois, puis les sessions du mois. */
export function HistoriqueJournalVue(props: HistoriqueJournalVueProps) {
  const { annees, annee, mois, sessions, chargement, erreur } = props;
  const periode = periodeEnLettres(annee, mois);
  const legende = legendeHistorique(props, periode);

  let corps;
  if (chargement) {
    corps = <TableauChargement colonnes={COLONNES} libelle="Chargement des sessions" />;
  } else if (erreur !== null) {
    corps = (
      <ErreurChargement
        titre="Impossible de charger l'historique"
        cause={erreur}
        onReessayer={props.onReessayer}
      />
    );
  } else if (sessions === null || sessions.length === 0) {
    corps = (
      <EtatVide
        titre={`Aucune session en ${periode}`}
        legende="Les sessions de ce mois apparaîtront ici."
      />
    );
  } else {
    corps = (
      <table className="w-full border-collapse text-sm">
        <EnTeteTableau colonnes={COLONNES} />
        <tbody className="divide-y divide-neutral-200">
          {sessions.map((session) => (
            <LigneSession key={session.chemin} session={session} onOuvrir={props.onOuvrir} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <MiseEnPageJournal titre="Journal" legende={legende}>
      <SelecteursPeriode
        annees={annees}
        annee={annee}
        mois={mois}
        onChoisirAnnee={props.onChoisirAnnee}
        onChoisirMois={props.onChoisirMois}
      />
      <Card className="overflow-hidden">{corps}</Card>
    </MiseEnPageJournal>
  );
}
