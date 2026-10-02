import * as React from 'react';
import { FlaskConical } from 'lucide-react';

/** Modes de fonctionnement de l'application (valeurs de FLUSSI_ENV). */
export type Environment = 'recette' | 'prod';

export interface EnvironmentBannerProps {
  environment: Environment;
  /** Seconde phrase ; par défaut, explique où partent les fichiers. */
  message?: React.ReactNode;
}

/**
 * Bandeau permanent tout en haut de la fenêtre, au-dessus de l'en-tête, sur CHAQUE écran tant que
 * le mode actif est la recette. Ne rend rien en production (la production reste neutre).
 * Non masquable. Les rayures à 45° le rendent reconnaissable sans la couleur.
 */
export function EnvironmentBanner({
  environment,
  message = 'Les fichiers sont déposés sur le serveur de test du partenaire, pas en production.',
}: EnvironmentBannerProps) {
  if (environment !== 'recette') return null;
  return (
    <div
      className="sticky top-0 z-banner flex h-8 items-center justify-center gap-2 bg-[repeating-linear-gradient(-45deg,theme(colors.testenv.solid)_0_8px,theme(colors.testenv.stripe)_8px_16px)] px-4 text-body-sm text-testenv-on-solid"
      role="note"
      aria-label="Environnement de recette"
    >
      <FlaskConical className="shrink-0" size={16} strokeWidth={1.75} aria-hidden="true" />
      <span className="font-semibold uppercase tracking-[0.04em]">Recette</span>
      <span className="h-4 w-px bg-testenv-on-solid opacity-50" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
