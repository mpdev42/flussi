import type { ReactNode } from 'react';
import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const CLASSE_TH =
  'border-b border-border px-4 py-3 text-left align-bottom text-body-sm font-medium text-neutral-600';
export const CLASSE_TD = 'px-4 py-3 align-middle';

export interface ColonneJournal {
  libelle: string;
  /** Classe de largeur de la colonne (en-tête et squelette). */
  largeur?: string;
}

export interface EnTeteTableauProps {
  colonnes: ColonneJournal[];
}

/** En-tête de tableau (fond subtil), conservé pendant le chargement. */
export function EnTeteTableau({ colonnes }: EnTeteTableauProps) {
  return (
    <thead className="bg-muted">
      <tr>
        {colonnes.map((colonne) => (
          <th key={colonne.libelle} scope="col" className={`${CLASSE_TH} ${colonne.largeur ?? ''}`}>
            {colonne.libelle}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export interface TableauChargementProps {
  colonnes: ColonneJournal[];
  /** Nom accessible du tableau pendant le chargement. */
  libelle: string;
}

/** En-tête de tableau et lignes squelettes. */
export function TableauChargement({ colonnes, libelle }: TableauChargementProps) {
  return (
    <table className="w-full border-collapse text-sm" aria-busy="true" aria-label={libelle}>
      <EnTeteTableau colonnes={colonnes} />
      <tbody className="divide-y divide-neutral-200">
        {[0, 1, 2, 3, 4].map((ligne) => (
          <tr key={ligne}>
            {colonnes.map((colonne) => (
              <td key={colonne.libelle} className={CLASSE_TD}>
                <Skeleton className="h-4 w-3/5 rounded-sm bg-neutral-200" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface EtatVideProps {
  titre: string;
  legende: string;
}

/** État vide centré, sans action : il n'y a rien à créer. */
export function EtatVide({ titre, legende }: EtatVideProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox className="size-5 text-neutral-600" aria-hidden="true" />
      <h2 className="text-base font-semibold text-navy-700">{titre}</h2>
      <p className="max-w-prose text-xs text-neutral-600">{legende}</p>
    </div>
  );
}

export interface ErreurChargementProps {
  titre: string;
  /** Cause lisible renvoyée par le main. */
  cause: string;
  onReessayer: () => void;
}

/** Alerte d'erreur à la place du corps du tableau, avec « Réessayer ». */
export function ErreurChargement({ titre, cause, onReessayer }: ErreurChargementProps) {
  return (
    <div className="p-6">
      <Alert
        variant="destructive"
        className="border-error-border bg-error-bg text-error-text [&>svg]:text-error-text"
      >
        <CircleAlert className="size-4" aria-hidden="true" />
        <AlertTitle>{titre}</AlertTitle>
        <AlertDescription>{cause}</AlertDescription>
        <div className="mt-3 pl-7">
          <Button type="button" variant="outline" size="sm" onClick={onReessayer}>
            <RefreshCw aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      </Alert>
    </div>
  );
}

/** Pastille de ton libre (icône + mot), pour les statuts que StatusBadge ne couvre pas. */
export type TonPastille = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const CLASSES_PASTILLE: Record<TonPastille, string> = {
  neutral: 'border-border bg-muted text-neutral-700',
  info: 'border-info-border bg-info-bg text-info-text',
  success: 'border-success-border bg-success-bg text-success-text',
  warning: 'border-warning-border bg-warning-bg text-warning-text',
  error: 'border-error-border bg-error-bg text-error-text',
};

export interface PastilleProps {
  ton: TonPastille;
  icone: ReactNode;
  children: ReactNode;
  title?: string;
}

export function Pastille({ ton, icone, children, title }: PastilleProps) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 align-middle text-xs font-medium ${CLASSES_PASTILLE[ton]}`}
    >
      {icone}
      {children}
    </span>
  );
}
