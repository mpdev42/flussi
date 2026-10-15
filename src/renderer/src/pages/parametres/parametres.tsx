import type { ConfigurationPublique } from '@shared/types';

import { useOuvertureDossier } from '@/hooks/use-ouverture-dossier';

import { ParametresVue } from './parametres-vue';

/** Écran Paramètres : configuration résolue en lecture seule, ouverture des dossiers. */
export function Parametres({ configuration }: { configuration: ConfigurationPublique }) {
  const { ouvrir, enCours, erreur } = useOuvertureDossier();
  return (
    <ParametresVue
      configuration={configuration}
      enCours={enCours}
      erreur={erreur}
      onOuvrir={ouvrir}
    />
  );
}
