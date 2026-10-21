import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OperationProgress } from '@/components/ui/operation-progress';
import type { EtatFichierAc056, RetourEnregistrement } from '@/hooks/use-fichier-ac056';
import { pluralize } from '@/lib/pluralize';

import { AlerteReessayer } from './alerte-reessayer';
import { anomalieFichierVide } from './format-ac056';
import {
  MESSAGE_A_JOUR,
  MESSAGE_AUCUNE_ERREUR,
  MESSAGE_ENREGISTRE,
  MESSAGE_HORS_EVENEMENT,
  MESSAGE_PLUS_D_ERREUR,
  MESSAGE_STRUCTURE,
  messageEnregistreAvecErreurs,
  messageErreursFichier,
  TITRE_ECHEC_CHARGEMENT,
  TITRE_ECHEC_ENREGISTREMENT,
  TITRE_ENREGISTREMENT_INTERROMPU,
  TITRE_FICHIER_ILLISIBLE,
  TITRE_STRUCTURE,
} from './textes-ac056';

export interface AlertesFichierProps {
  fichier: EtatFichierAc056;
  /** Erreurs rattachées à aucun évènement (000, 001, 995, 999, lignes perdues) : sans détail. */
  horsEvenement: number;
  /** Résultat du dernier enregistrement, sinon `null`. */
  retour: RetourEnregistrement | null;
  /** « Réessayer » après un échec de chargement. */
  onReessayer: () => void;
  /** « Réessayer » après un échec d'enregistrement. */
  onReessayerEnregistrement: () => void;
}

interface AlerteDuFichier {
  variant: 'success' | 'error' | 'warning' | 'info';
  Icone: LucideIcon;
  texte: string;
}

/**
 * Alerte du fichier : une seule ligne, toujours là. Son ton et son texte suivent l'état (erreurs à
 * corriger, plus d'erreur, résultat de l'enregistrement), jamais sa forme : la mise en page ne bouge
 * pas à la dernière correction ni à l'effacement du retour par la saisie suivante, sinon le clic de
 * navigation qui suit la saisie serait perdu.
 */
function alerteDuFichier(
  analyse: Extract<EtatFichierAc056, { etat: 'ouvert' }>['analyse'],
  modifie: boolean,
  retour: RetourEnregistrement | null,
): AlerteDuFichier {
  if (retour?.type === 'enregistre') {
    return { variant: 'success', Icone: CircleCheck, texte: MESSAGE_ENREGISTRE };
  }
  if (retour?.type === 'enregistre-avec-erreurs') {
    return {
      variant: 'warning',
      Icone: TriangleAlert,
      texte: messageEnregistreAvecErreurs(retour.erreurs),
    };
  }
  if (retour?.type === 'a-jour') {
    return { variant: 'info', Icone: Info, texte: MESSAGE_A_JOUR };
  }
  if (analyse.erreurs === 0 && analyse.structure === 0) {
    return {
      variant: 'success',
      Icone: CircleCheck,
      texte: modifie ? MESSAGE_PLUS_D_ERREUR : MESSAGE_AUCUNE_ERREUR,
    };
  }
  return {
    variant: 'error',
    Icone: CircleAlert,
    texte: messageErreursFichier(analyse.erreurs, analyse.structure === 0),
  };
}

/**
 * Alertes d'écran, entre la barre du fichier et le contenu : chargement en cours, échec de
 * chargement, fichier illisible (vide) et, pour un fichier VEOS lisible, l'alerte du fichier (nombre
 * d'erreurs à corriger, succès à 0, résultat de l'enregistrement), l'échec de l'enregistrement,
 * structure incorrecte, erreurs hors des évènements. Les messages d'anomalie du domaine ne citent
 * aucune valeur lue : ils sont affichables.
 */
export function AlertesFichier({
  fichier,
  horsEvenement,
  retour,
  onReessayer,
  onReessayerEnregistrement,
}: AlertesFichierProps) {
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
      const { variant, Icone, texte } = alerteDuFichier(analyse, fichier.modifie, retour);
      return (
        <>
          <Alert variant={variant} role="status">
            <Icone className="size-4" aria-hidden="true" />
            <AlertDescription>{texte}</AlertDescription>
          </Alert>
          {(retour?.type === 'echec' || retour?.type === 'interrompu') && (
            <AlerteReessayer
              titre={
                retour.type === 'echec'
                  ? TITRE_ECHEC_ENREGISTREMENT
                  : TITRE_ENREGISTREMENT_INTERROMPU
              }
              cause={retour.message}
              onReessayer={onReessayerEnregistrement}
            />
          )}
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
