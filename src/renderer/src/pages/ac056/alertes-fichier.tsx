import { CircleAlert, CircleCheck } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OperationProgress } from '@/components/ui/operation-progress';
import type { EtatFichierAc056 } from '@/hooks/use-fichier-ac056';
import { pluralize } from '@/lib/pluralize';

import { AlerteReessayer } from './alerte-reessayer';
import { anomalieFichierVide } from './format-ac056';
import {
  MESSAGE_AUCUNE_ERREUR,
  MESSAGE_HORS_EVENEMENT,
  MESSAGE_STRUCTURE,
  messageErreursFichier,
  TITRE_ECHEC_CHARGEMENT,
  TITRE_FICHIER_ILLISIBLE,
  TITRE_STRUCTURE,
} from './textes-ac056';

export interface AlertesFichierProps {
  fichier: EtatFichierAc056;
  /** Erreurs rattachées à aucun évènement (000, 001, 995, 999, lignes perdues) : sans détail. */
  horsEvenement: number;
  onReessayer: () => void;
}

/**
 * Alertes d'écran, entre la barre du fichier et le contenu : chargement en cours, échec de
 * chargement, fichier illisible (vide) et, pour un fichier VEOS lisible, l'alerte du fichier (nombre
 * d'erreurs à corriger, ou succès à 0), structure incorrecte, erreurs hors des évènements. Les messages d'anomalie du domaine ne citent aucune valeur
 * lue : ils sont affichables.
 */
export function AlertesFichier({ fichier, horsEvenement, onReessayer }: AlertesFichierProps) {
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
      // Alerte du fichier : toujours là, seul son ton change quand le compte tombe à 0 (ou remonte).
      // Même forme dans les deux cas (icône et une ligne, sans titre) : la mise en page ne bouge pas
      // à la dernière correction, sinon le clic de navigation qui suit la saisie serait perdu.
      const sansErreur = analyse.erreurs === 0 && analyse.structure === 0;
      return (
        <>
          <Alert variant={sansErreur ? 'success' : 'error'} role="status">
            {sansErreur ? (
              <CircleCheck className="size-4" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4" aria-hidden="true" />
            )}
            <AlertDescription>
              {sansErreur
                ? MESSAGE_AUCUNE_ERREUR
                : messageErreursFichier(analyse.erreurs, analyse.structure === 0)}
            </AlertDescription>
          </Alert>
          {analyse.structure > 0 && (
            <Alert variant="error">
              <CircleAlert className="size-4" aria-hidden="true" />
              <AlertTitle as="h2">{TITRE_STRUCTURE}</AlertTitle>
              <AlertDescription>{MESSAGE_STRUCTURE}</AlertDescription>
            </Alert>
          )}
          {horsEvenement > 0 && (
            <Alert variant="error">
              <CircleAlert className="size-4" aria-hidden="true" />
              <AlertTitle as="h2">
                {horsEvenement} {pluralize(horsEvenement, 'erreur', 'erreurs')} hors des évènements
              </AlertTitle>
              <AlertDescription>{MESSAGE_HORS_EVENEMENT}</AlertDescription>
            </Alert>
          )}
        </>
      );
    }
  }
}
