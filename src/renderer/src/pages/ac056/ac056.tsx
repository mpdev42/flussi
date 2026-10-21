import { useEffect, useMemo, useRef } from 'react';
import { compterAnomalies, provenanceDepuisNom } from '@shared/domain/ac056';

import { useVerrouNavigation } from '@/components/verrou-navigation';
import { useFichierAc056 } from '@/hooks/use-fichier-ac056';

import { AlertesFichier } from './alertes-fichier';
import { BarreFichier } from './barre-fichier';
import { BarriereFichier } from './barriere-fichier';
import { BoutonChangerFichier } from './bouton-changer-fichier';
import { ChoixFichier } from './choix-fichier';
import { FichierOuvert } from './fichier-ouvert';
import { anomalieFichierVide } from './format-ac056';

export interface EcranAc056Props {
  /** `false` quand un autre écran est affiché (celui-ci reste monté, masqué, pour garder le fichier). */
  actif: boolean;
}

/**
 * Écran « Fichier AC056 » : choix du fichier dans `IN` ou `OUT` tant qu'aucun fichier n'est ouvert,
 * puis barre du fichier, alertes de chargement et de contrôle et, pour un fichier VEOS lisible, la
 * navigation (évènements, onglets, fiches). Le fichier ouvert reste en mémoire (hook
 * `useFichierAc056`) tant que l'écran est monté. Pendant un enregistrement, la navigation principale
 * est verrouillée et le contenu du fichier est inerte.
 */
export function EcranAc056({ actif }: EcranAc056Props) {
  const {
    fichier,
    ouvrir,
    fermer,
    reessayer,
    saisir,
    enregistrer,
    enregistrement,
    retour,
    champsModifies,
  } = useFichierAc056();
  // L'enregistrement ne doit pas être quitté : la navigation principale reste inactive.
  useVerrouNavigation(enregistrement);
  const racine = useRef<HTMLDivElement>(null);
  const boutonEnregistrer = useRef<HTMLButtonElement>(null);
  const aucun = fichier.etat === 'aucun';
  const etaitAucun = useRef(aucun);

  // Compteurs d'erreurs à chaque niveau : calculés une fois par analyse, jamais à chaque rendu.
  // Fichier de rejet : pas de navigation à cet item (item 4), donc pas de compteurs.
  const ouvert = fichier.etat === 'ouvert' ? fichier : null;
  const index = ouvert?.index;
  const analyseOuverte = ouvert?.analyse;
  const navigable =
    ouvert !== null && ouvert.provenance === 'veos' && !anomalieFichierVide(ouvert.analyse);
  const compteurs = useMemo(
    () =>
      navigable && index && analyseOuverte
        ? compterAnomalies(index, analyseOuverte.anomalies)
        : null,
    [navigable, index, analyseOuverte],
  );

  // Le bouton cliqué disparaît quand l'écran change de vue : le focus passe au nouveau h1
  useEffect(() => {
    if (etaitAucun.current === aucun) return;
    etaitAucun.current = aucun;
    if (!actif) return;
    const titre = racine.current?.querySelector('h1');
    if (!titre) return;
    if (!titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1');
    titre.focus({ preventScroll: true });
  }, [aucun, actif]);

  if (fichier.etat === 'aucun') {
    return (
      <div ref={racine}>
        <ChoixFichier actif={actif} onOuvrir={ouvrir} />
      </div>
    );
  }

  const { nom, emplacement } = fichier.etat === 'ouvert' ? fichier : fichier.cible;
  const provenance = fichier.etat === 'ouvert' ? fichier.provenance : provenanceDepuisNom(nom);
  const analyse = fichier.etat === 'ouvert' ? fichier.analyse : null;
  const modifie = fichier.etat === 'ouvert' && fichier.modifie;

  return (
    <div ref={racine} className="flex h-full min-h-0 flex-col">
      <BarreFichier
        nom={nom}
        emplacement={emplacement}
        provenance={provenance}
        analyse={analyse}
        chargement={fichier.etat === 'chargement'}
        modifie={modifie}
        champsModifies={champsModifies}
        enregistrement={enregistrement}
        boutonEnregistrer={boutonEnregistrer}
        onChanger={fermer}
        onEnregistrer={() => void enregistrer()}
      />
      <div className="mx-auto flex w-full max-w-content shrink-0 flex-col gap-3 py-4 pl-10 pr-0 empty:hidden">
        <AlertesFichier
          fichier={fichier}
          horsEvenement={compteurs?.horsEvenement ?? 0}
          retour={retour}
          onReessayer={reessayer}
          onReessayerEnregistrement={() => {
            // « Réessayer » disparaît dès que l'enregistrement part : le focus passe à « Enregistrer »
            boutonEnregistrer.current?.focus();
            void enregistrer();
          }}
        />
      </div>
      {ouvert && compteurs && (
        <BarriereFichier
          key={`${emplacement}/${nom}`}
          action={
            <BoutonChangerFichier
              nom={nom}
              modifie={modifie}
              champsModifies={champsModifies}
              disabled={enregistrement}
              onChanger={fermer}
            />
          }
        >
          <FichierOuvert
            analyse={ouvert.analyse}
            index={ouvert.index}
            compteurs={compteurs}
            onSaisir={saisir}
            inactif={enregistrement}
          />
        </BarriereFichier>
      )}
    </div>
  );
}
