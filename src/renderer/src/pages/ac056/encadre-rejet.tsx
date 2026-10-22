import { CircleAlert } from 'lucide-react';
import type { MessageRejet } from '@shared/domain/ac056';

import { Alert, AlertDescription, AlertTitle, type BaliseTitreAlerte } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import {
  LIBELLE_CODE_INCONNU,
  SUJET_LIGNE,
  TITRE_REJETEE_PAR_MSP,
  explicationMsp,
  messageMsp,
} from './textes-ac056';

/** Code `ERRxxx` en police à chasse fixe, ou « code inconnu » quand le message n'en a pas. */
export function CodeMsp({ code }: { code: MessageRejet['code'] }) {
  return code === null ? (
    LIBELLE_CODE_INCONNU
  ) : (
    <span className="font-mono text-data font-medium">{code}</span>
  );
}

/**
 * Message de MSP et, quand un texte est validé pour le code, son explication. Un code reconnu sans
 * texte validé (`explication === null`) n'affiche que le message ; un message inconnu affiche
 * l'explication « Erreur inconnue » du domaine (divergence 10).
 */
export function DetailRejet({ rejet }: { rejet: MessageRejet }) {
  return (
    <>
      <p className="m-0 break-words">{messageMsp(rejet.message)}</p>
      {rejet.explication !== null && (
        <p className="m-0 mt-1 break-words">{explicationMsp(rejet.explication)}</p>
      )}
    </>
  );
}

export interface EncadreRejetProps {
  rejet: MessageRejet;
  /** Niveau du titre, d'après la place de l'encadré dans la hiérarchie des titres de l'écran. */
  niveau: Extract<BaliseTitreAlerte, 'h2' | 'h3'>;
  /**
   * Début du titre, avant « rejetée par MSP » : « Ligne » par défaut, « Ligne N (990) de
   * l'évènement » pour la 990, que la navigation n'affiche pas comme une fiche.
   */
  sujet?: string;
  className?: string;
}

/**
 * Encadré d'une ligne rejetée par MSP (`role="note"`, jamais une alerte annoncée d'office) : titre
 * « Ligne rejetée par MSP · ERR009 » (ou « · code inconnu »), puis message et explication.
 */
export function EncadreRejet({ rejet, niveau, sujet = SUJET_LIGNE, className }: EncadreRejetProps) {
  return (
    <Alert variant="error" role="note" className={cn('mb-4', className)}>
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertTitle as={niveau}>
        {sujet}
        {TITRE_REJETEE_PAR_MSP}
        <CodeMsp code={rejet.code} />
      </AlertTitle>
      <AlertDescription>
        <DetailRejet rejet={rejet} />
      </AlertDescription>
    </Alert>
  );
}
