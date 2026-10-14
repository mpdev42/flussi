import { useState, type ReactNode } from 'react';

import { CadreApplication, type EntreeNavigation } from '@/components/cadre-application';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConfiguration } from '@/hooks/use-configuration';
import { Accueil } from '@/pages/accueil';

// Pour ajouter un écran : une entrée ici et la page correspondante dans ECRANS.
const NAVIGATION: EntreeNavigation[] = [{ id: 'accueil', libelle: 'Accueil' }];

const ECRANS: Record<string, ReactNode> = {
  accueil: <Accueil />,
};

function App() {
  const { configuration, erreur } = useConfiguration();
  const [actif, setActif] = useState('accueil');

  if (erreur) {
    return (
      <div className="p-10">
        <Alert variant="destructive">
          <AlertTitle>Configuration indisponible</AlertTitle>
          <AlertDescription>
            Flussi n&apos;a pas pu lire sa configuration. Contactez le service informatique.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Chargement (très bref, IPC local) : conteneur vide, pas de flash de contenu
  if (!configuration) return <div className="h-screen" />;

  return (
    <CadreApplication
      environnement={configuration.mode}
      version={configuration.version}
      navigation={NAVIGATION}
      actif={actif}
      onNaviguer={setActif}
    >
      {ECRANS[actif]}
    </CadreApplication>
  );
}

export default App;
