import type { ConfigurationPublique } from '@shared/types';

import { useOuvertureDossier } from '@/hooks/use-ouverture-dossier';
import { useSecrets } from '@/hooks/use-secrets';

import { ParametresVue } from './parametres-vue';
import { SecretsVue } from './secrets-vue';

/** Écran Paramètres : configuration résolue en lecture seule, ouverture des dossiers, secrets. */
export function Parametres({ configuration }: { configuration: ConfigurationPublique }) {
  const { ouvrir, enCours, erreur } = useOuvertureDossier();
  const secrets = useSecrets();
  return (
    <ParametresVue
      configuration={configuration}
      enCours={enCours}
      erreur={erreur}
      onOuvrir={ouvrir}
      secrets={<SecretsVue {...secrets} />}
    />
  );
}
