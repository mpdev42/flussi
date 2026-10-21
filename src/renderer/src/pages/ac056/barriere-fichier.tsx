import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { MESSAGE_AFFICHAGE_IMPOSSIBLE, TITRE_AFFICHAGE_IMPOSSIBLE } from './textes-ac056';

export interface BarriereFichierProps {
  children: ReactNode;
  /** Action proposée à la place du fichier (« Changer de fichier »). */
  action: ReactNode;
}

interface EtatBarriere {
  erreur: boolean;
}

/**
 * Barrière d'erreur autour du contenu du fichier ouvert seulement : si son affichage lève une
 * exception, un message et `action` remplacent les colonnes, au lieu d'un écran blanc. Le hook du
 * fichier et la barre sont au-dessus : les corrections restent en mémoire et « Enregistrer » reste
 * disponible. À remonter avec une `key` propre au fichier pour repartir à zéro au changement de
 * fichier.
 */
export class BarriereFichier extends Component<BarriereFichierProps, EtatBarriere> {
  state: EtatBarriere = { erreur: false };

  static getDerivedStateFromError(): EtatBarriere {
    return { erreur: true };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo): void {
    // Ni le message ni la pile de l'exception : ils pourraient citer une valeur du fichier
    console.error(
      `[ac056] Affichage du fichier impossible (${erreur.name}) :`,
      info.componentStack?.split('\n').slice(0, 3).join('\n'),
    );
  }

  render(): ReactNode {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="mx-auto w-full max-w-content py-4 pl-10 pr-0">
        <Alert variant="error">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertTitle as="h2">{TITRE_AFFICHAGE_IMPOSSIBLE}</AlertTitle>
          <AlertDescription>{MESSAGE_AFFICHAGE_IMPOSSIBLE}</AlertDescription>
          <div className="mt-3">{this.props.action}</div>
        </Alert>
      </div>
    );
  }
}
