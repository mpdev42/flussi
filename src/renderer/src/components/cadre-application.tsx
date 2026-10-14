import * as React from 'react';

import { EnvironmentBanner, type Environment } from '@/components/ui/environment-banner';
import { EnvironmentBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

/** Entrée de la navigation principale de l'en-tête. */
export interface EntreeNavigation {
  id: string;
  libelle: string;
}

export interface CadreApplicationProps {
  /** Mode actif : la recette affiche le bandeau et le badge, la production reste neutre. */
  environnement: Environment;
  /** Version de l'application, affichée discrètement à droite de l'en-tête. */
  version: string;
  /** Entrées de la navigation principale, dans l'ordre d'affichage (peut être vide). */
  navigation: EntreeNavigation[];
  /** Identifiant de l'entrée active. */
  actif: string;
  onNaviguer: (id: string) => void;
  /** Écran courant. */
  children: React.ReactNode;
}

const LIBELLES_ENVIRONNEMENT: Record<Environment, string> = {
  recette: 'Recette',
  prod: 'Production',
};

/**
 * Cadre commun à tous les écrans : bandeau Recette (rien en production), en-tête bleu marine avec
 * la navigation principale, puis l'écran courant sur toute la hauteur restante de la fenêtre.
 */
export function CadreApplication({
  environnement,
  version,
  navigation,
  actif,
  onNaviguer,
  children,
}: CadreApplicationProps) {
  return (
    <div className="flex h-screen flex-col">
      <EnvironmentBanner environment={environnement} />
      <header className="z-header flex h-12 shrink-0 items-stretch gap-8 bg-navy-700 px-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-white">Flussi</span>
          {environnement === 'recette' && <EnvironmentBadge />}
        </div>
        <nav aria-label="Navigation principale" className="flex items-stretch gap-1">
          {navigation.map((entree) => {
            const estActive = entree.id === actif;
            return (
              <button
                key={entree.id}
                type="button"
                aria-current={estActive ? 'page' : undefined}
                onClick={() => onNaviguer(entree.id)}
                className={cn(
                  'flex items-center border-b-2 px-4 pt-0.5 text-sm font-medium transition-colors duration-fast focus-visible:shadow-focus-dark focus-visible:outline-none',
                  estActive
                    ? 'border-blue-300 bg-navy-800 text-white'
                    : 'border-transparent text-navy-100 hover:bg-navy-800 hover:text-white',
                )}
              >
                {entree.libelle}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-body-sm text-navy-100">
          <span>Environnement : {LIBELLES_ENVIRONNEMENT[environnement]}</span>
          <span className="text-xs text-navy-100">Flussi {version}</span>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
