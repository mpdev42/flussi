import { useState, type ReactNode } from 'react';

import { CadreApplication, type EntreeNavigation } from '@/components/cadre-application';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConfiguration } from '@/hooks/use-configuration';
import { useEtatJournal } from '@/hooks/use-etat-journal';
import { Accueil } from '@/pages/accueil';
import { BandeauJournal } from '@/pages/journal/bandeau-journal';
import { Journal } from '@/pages/journal/journal';
import { Parametres } from '@/pages/parametres/parametres';

// Pour ajouter un écran : une entrée ici et la page correspondante dans la table des écrans,
// construite dans App une fois la configuration chargée.
const NAVIGATION: EntreeNavigation[] = [
  { id: 'accueil', libelle: 'Accueil' },
  { id: 'journal', libelle: 'Journal' },
  { id: 'parametres', libelle: 'Paramètres' },
];

function App() {
  const { configuration, erreur } = useConfiguration();
  const etatJournal = useEtatJournal();
  const [actif, setActif] = useState('accueil');

  if (erreur) {
    return (
      <div className="p-10">
        <Alert variant="error">
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

  const ecrans: Record<string, ReactNode> = {
    accueil: <Accueil />,
    journal: <Journal />,
    parametres: <Parametres configuration={configuration} />,
  };

  return (
    <CadreApplication
      environnement={configuration.mode}
      version={configuration.version}
      navigation={NAVIGATION}
      actif={actif}
      onNaviguer={setActif}
      alerte={
        etatJournal &&
        !etatJournal.enregistre && <BandeauJournal lignesEnAttente={etatJournal.lignesEnAttente} />
      }
    >
      {ecrans[actif]}
    </CadreApplication>
  );
}

export default App;
