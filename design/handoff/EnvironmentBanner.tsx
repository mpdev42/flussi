import * as React from 'react';
import { FlaskConical } from 'lucide-react';
import { ICON, ICON_STROKE } from './utils';

export type Environment = 'recette' | 'production';

export interface EnvironmentBannerProps {
  environment: Environment;
  /** Second sentence; default explains where files go. */
  message?: React.ReactNode;
}

/**
 * Persistent banner at the very top of the window, above the header, on EVERY screen while the
 * active environment is Recette. Renders nothing in production (production stays neutral).
 * Not dismissible.
 */
export function EnvironmentBanner({ environment, message = 'Les fichiers sont déposés sur le serveur de test du partenaire, pas en production.' }: EnvironmentBannerProps) {
  if (environment !== 'recette') return null;
  return (
    <div className="fl-env-banner" role="note" aria-label="Environnement de recette">
      <FlaskConical className="fl-icon" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span className="fl-env-banner-label">Recette</span>
      <span className="fl-env-banner-sep" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
