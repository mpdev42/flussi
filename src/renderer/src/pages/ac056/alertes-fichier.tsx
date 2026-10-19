import { CircleAlert, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OperationProgress } from '@/components/ui/operation-progress';
import type { EtatFichierAc056 } from '@/hooks/use-fichier-ac056';

import { AlerteReessayer } from './alerte-reessayer';
import { anomalieFichierVide } from './format-ac056';
import {
  MESSAGE_AUCUNE_ERREUR,
  MESSAGE_STRUCTURE,
  TITRE_ECHEC_CHARGEMENT,
  TITRE_FICHIER_ILLISIBLE,
  TITRE_STRUCTURE,
} from './textes-ac056';

export interface AlertesFichierProps {
  fichier: EtatFichierAc056;
  onReessayer: () => void;
}

/**
 * Alertes d'écran, entre la barre du fichier et le contenu : chargement en cours, échec de
 * chargement, fichier illisible (vide), structure incorrecte d'un fichier VEOS, fichier VEOS sans
 * erreur. Les messages d'anomalie du domaine ne citent aucune valeur lue : ils sont affichables.
 */
export function AlertesFichier({ fichier, onReessayer }: AlertesFichierProps) {
  switch (fichier.etat) {
    case 'aucun':
      return null;
    case 'chargement':
      return <OperationProgress title={`Chargement de ${fichier.cible.nom}…`} />;
    case 'echec':
      return (
        <AlerteReessayer
          titre={TITRE_ECHEC_CHARGEMENT}
          cause={fichier.erreur.message}
          onReessayer={onReessayer}
        />
      );
    case 'ouvert': {
      const { analyse, provenance } = fichier;
      const vide = anomalieFichierVide(analyse);
      if (vide) {
        return (
          <Alert variant="error">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle as="h2">{TITRE_FICHIER_ILLISIBLE}</AlertTitle>
            <AlertDescription>{vide.message}</AlertDescription>
          </Alert>
        );
      }
      if (provenance !== 'veos') return null;
      if (analyse.structure > 0) {
        return (
          <Alert variant="error">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle as="h2">{TITRE_STRUCTURE}</AlertTitle>
            <AlertDescription>{MESSAGE_STRUCTURE}</AlertDescription>
          </Alert>
        );
      }
      if (analyse.erreurs === 0) {
        return (
          <Alert variant="success" role="status">
            <CircleCheck className="size-4" aria-hidden="true" />
            <AlertDescription>{MESSAGE_AUCUNE_ERREUR}</AlertDescription>
          </Alert>
        );
      }
      return null;
    }
  }
}
