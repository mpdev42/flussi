import { useState, type ReactNode } from 'react';

import { CadreApplication, type EntreeNavigation } from '@/components/cadre-application';
import { JournalSessionEnDirect } from '@/components/journal-session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConfiguration } from '@/hooks/use-configuration';
import { useEtatJournal } from '@/hooks/use-etat-journal';
import { Accueil } from '@/pages/accueil';
import { EcranAc056 } from '@/pages/ac056/ac056';
import { BandeauJournal } from '@/pages/journal/bandeau-journal';
import { Journal } from '@/pages/journal/journal';
import { Parametres } from '@/pages/parametres/parametres';

// Pour ajouter un écran : une entrée ici et la page correspondante dans la table des écrans,
// construite dans App une fois la configuration chargée. L'écran AC056 fait exception : une fois
// visité, il reste monté (masqué) quand un autre écran est affiché, pour garder le fichier ouvert.
const NAVIGATION: EntreeNavigation[] = [
  { id: 'accueil', libelle: 'Accueil' },
  { id: 'ac056', libelle: 'Fichier AC056' },
  { id: 'journal', libelle: 'Journal' },
  { id: 'parametres', libelle: 'Paramètres' },
];

function App() {
  const { configuration, erreur } = useConfiguration();
  const etatJournal = useEtatJournal();
  const [actif, setActif] = useState('accueil');
  // L'écran AC056 n'est monté qu'à la première visite (pas de lecture du lecteur réseau au
  // démarrage), puis reste monté, masqué, quand un autre écran est affiché.
  const [ac056Visite, setAc056Visite] = useState(false);

  const naviguer = (id: string) => {
    if (id === 'ac056') setAc056Visite(true);
    setActif(id);
  };

  if (erreur) {
    return (
      <div className="p-10">
        <Alert variant="error">
          <AlertTitle as="h1">Configuration indisponible</AlertTitle>
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
      onNaviguer={naviguer}
      // Le panneau s'abonne lui-même aux lignes : une ligne du journal ne re-rend pas App
      journal={<JournalSessionEnDirect />}
      alerte={
        etatJournal &&
        !etatJournal.enregistre && <BandeauJournal lignesEnAttente={etatJournal.lignesEnAttente} />
      }
    >
      {ecrans[actif]}
      {ac056Visite && (
        // h-full : l'écran prend la hauteur visible de <main> (colonnes à défilement propre). Jamais
        // de classe d'affichage ici (flex, grid, block) : elle l'emporterait sur [hidden].
        <div hidden={actif !== 'ac056'} className="h-full">
          <EcranAc056 actif={actif === 'ac056'} />
        </div>
      )}
    </CadreApplication>
  );
}

export default App;
