import { CircleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { pluralize } from '@/lib/pluralize';

export interface BandeauJournalProps {
  /** Nombre de lignes gardées en mémoire faute d'avoir pu être écrites. */
  lignesEnAttente: number;
}

/** Alerte globale « Journal non enregistré », pleine largeur, sous l'en-tête de l'application. */
export function BandeauJournal({ lignesEnAttente }: BandeauJournalProps) {
  return (
    <Alert
      variant="destructive"
      className="rounded-none border-x-0 border-error-border bg-error-bg px-10 text-error-text [&>svg]:left-10 [&>svg]:text-error-text"
    >
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Journal non enregistré</AlertTitle>
      <AlertDescription>
        {lignesEnAttente} {pluralize(lignesEnAttente, 'ligne', 'lignes')} en attente : Flussi
        réessaie à chaque nouvel évènement. Vérifiez que le lecteur P: est connecté.
      </AlertDescription>
    </Alert>
  );
}
