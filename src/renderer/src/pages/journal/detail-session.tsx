import { ArrowLeft, CircleAlert, CircleCheck, Heading, Info, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LigneJournal, SessionJournal } from '@shared/types';
import type { NiveauJournal } from '@shared/schemas/journal';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToneBadge, type ToneBadgeTone } from '@/components/ui/status-badge';

import {
  CLASSE_TD,
  EnTeteTableau,
  ErreurChargement,
  TableauChargement,
  type ColonneJournal,
} from './elements-tableau';
import { LIBELLES_NIVEAU, contientFinDeSession, titreSession } from './format-journal';
import { MiseEnPageJournal } from './mise-en-page-journal';

const COLONNES: ColonneJournal[] = [
  { libelle: 'Heure', largeur: 'w-1/6' },
  { libelle: 'Niveau', largeur: 'w-1/6' },
  { libelle: 'Message' },
];

const PRESENTATION_NIVEAU: Record<NiveauJournal, { tone: ToneBadgeTone; Icone: LucideIcon }> = {
  TITRE: { tone: 'neutral', Icone: Heading },
  INFO: { tone: 'info', Icone: Info },
  SUCCES: { tone: 'success', Icone: CircleCheck },
  ERREUR: { tone: 'error', Icone: CircleAlert },
};

export interface BadgeNiveauProps {
  niveau: NiveauJournal;
}

/** Niveau d'une ligne du journal : icône + mot, jamais la couleur seule. */
export function BadgeNiveau({ niveau }: BadgeNiveauProps) {
  const { tone, Icone } = PRESENTATION_NIVEAU[niveau];
  return (
    <ToneBadge tone={tone} icon={Icone}>
      {LIBELLES_NIVEAU[niveau]}
    </ToneBadge>
  );
}

function LigneDetail({ ligne }: { ligne: LigneJournal }) {
  return (
    <tr>
      <td className={`${CLASSE_TD} tabular-nums`}>{ligne.heure}</td>
      <td className={CLASSE_TD}>
        {ligne.niveau !== null && <BadgeNiveau niveau={ligne.niveau} />}
      </td>
      <td
        className={`${CLASSE_TD} whitespace-pre-wrap [overflow-wrap:anywhere] ${
          ligne.niveau === 'TITRE' ? 'font-semibold' : ''
        }`}
      >
        {ligne.message}
      </td>
    </tr>
  );
}

export interface DetailSessionVueProps {
  session: SessionJournal;
  /** `null` tant que les lignes ne sont pas chargées ou en cas d'erreur. */
  lignes: LigneJournal[] | null;
  chargement: boolean;
  /** Cause lisible de l'échec de lecture. */
  erreur: string | null;
  onRetour: () => void;
  onReessayer: () => void;
}

/** Détail d'une session : lignes du fichier, ou avertissement si « Fin de session » manque. */
export function DetailSessionVue({
  session,
  lignes,
  chargement,
  erreur,
  onRetour,
  onReessayer,
}: DetailSessionVueProps) {
  const sansFin = lignes !== null && !session.enCours && !contientFinDeSession(lignes);

  let corps;
  if (chargement) {
    corps = <TableauChargement colonnes={COLONNES} libelle="Chargement de la session" />;
  } else if (erreur !== null || lignes === null) {
    corps = (
      <ErreurChargement
        titre="Impossible de lire cette session"
        cause={erreur ?? 'Le contenu de la session est indisponible.'}
        onReessayer={onReessayer}
      />
    );
  } else {
    corps = (
      <table className="w-full border-collapse text-sm">
        <EnTeteTableau colonnes={COLONNES} />
        <tbody className="divide-y divide-neutral-200">
          {lignes.map((ligne, index) => (
            <LigneDetail key={index} ligne={ligne} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <MiseEnPageJournal
      titre={titreSession(session)}
      legende={session.enCours ? `${session.compte} · Session en cours` : session.compte}
      retour={
        <div>
          <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={onRetour}>
            <ArrowLeft aria-hidden="true" />
            Retour à l&apos;historique
          </Button>
        </div>
      }
    >
      {sansFin && (
        <Alert variant="warning">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Pas de ligne « Fin de session »</AlertTitle>
          <AlertDescription>
            Flussi a été fermé anormalement (plantage, arrêt du poste), ou la session est encore
            ouverte sur un autre poste.
          </AlertDescription>
        </Alert>
      )}
      <Card className="overflow-hidden">{corps}</Card>
    </MiseEnPageJournal>
  );
}
