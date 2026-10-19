import { CircleAlert, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { causeEnPhrase } from './format-ac056';

export interface AlerteReessayerProps {
  titre: string;
  /** Cause en minuscules sans point final : elle est mise en phrase à l'affichage. */
  cause: string;
  onReessayer: () => void;
}

/** Alerte d'erreur de l'écran AC056 avec la cause et un bouton « Réessayer ». */
export function AlerteReessayer({ titre, cause, onReessayer }: AlerteReessayerProps) {
  return (
    <Alert variant="error">
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertTitle as="h2">{titre}</AlertTitle>
      <AlertDescription>{causeEnPhrase(cause)}</AlertDescription>
      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onReessayer}>
          <RefreshCw aria-hidden="true" />
          Réessayer
        </Button>
      </div>
    </Alert>
  );
}
