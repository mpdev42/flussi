import { useEffect, useRef } from 'react';
import { provenanceDepuisNom } from '@shared/domain/ac056';

import { useFichierAc056 } from '@/hooks/use-fichier-ac056';

import { AlertesFichier } from './alertes-fichier';
import { BarreFichier } from './barre-fichier';
import { ChoixFichier } from './choix-fichier';

export interface EcranAc056Props {
  /** `false` quand un autre écran est affiché (celui-ci reste monté, masqué, pour garder le fichier). */
  actif: boolean;
}

/**
 * Écran « Fichier AC056 » : choix du fichier dans `IN` ou `OUT` tant qu'aucun fichier n'est ouvert,
 * puis barre du fichier et alertes de chargement et de contrôle. Le fichier ouvert reste en
 * mémoire (hook `useFichierAc056`) tant que l'écran est monté.
 */
export function EcranAc056({ actif }: EcranAc056Props) {
  const { fichier, ouvrir, fermer, reessayer } = useFichierAc056();
  const racine = useRef<HTMLDivElement>(null);
  const aucun = fichier.etat === 'aucun';
  const etaitAucun = useRef(aucun);

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

  return (
    <div ref={racine}>
      <BarreFichier
        nom={nom}
        emplacement={emplacement}
        provenance={provenance}
        analyse={analyse}
        chargement={fichier.etat === 'chargement'}
        onChanger={fermer}
      />
      <div className="mx-auto w-full max-w-content py-4 pl-10 pr-0 empty:hidden">
        <AlertesFichier fichier={fichier} onReessayer={reessayer} />
      </div>
    </div>
  );
}
