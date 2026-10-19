import { RefreshCw } from 'lucide-react';
import type { CibleFichierAc056 } from '@shared/schemas/ac056';

import { Button } from '@/components/ui/button';
import { useFichiersAc056, type FichiersAc056 } from '@/hooks/use-fichiers-ac056';

import { AlerteReessayer } from './alerte-reessayer';
import { CarteChargement, CarteFichiers } from './carte-fichiers';
import { TITRE_LISTE_INACCESSIBLE } from './textes-ac056';

/** Deux cartes côte à côte quand la place le permet (576 px au moins chacune), sinon une colonne. */
const GRILLE_CARTES =
  'grid grid-cols-[repeat(auto-fit,minmax(min(36rem,100%),1fr))] items-start gap-6';

export interface ChoixFichierVueProps {
  chargement: boolean;
  /** Cause lisible de l'échec de lecture des dossiers. */
  erreur: string | null;
  fichiers: FichiersAc056 | null;
  onOuvrir: (cible: CibleFichierAc056) => void;
  onActualiser: () => void;
}

/** Choix du fichier : h1, légende et une carte par dossier de travail (`IN`, `OUT`). */
export function ChoixFichierVue({
  chargement,
  erreur,
  fichiers,
  onOuvrir,
  onActualiser,
}: ChoixFichierVueProps) {
  const ouvrir = (fichier: CibleFichierAc056) =>
    onOuvrir({ emplacement: fichier.emplacement, nom: fichier.nom });

  let corps;
  if (erreur !== null) {
    corps = (
      <AlerteReessayer titre={TITRE_LISTE_INACCESSIBLE} cause={erreur} onReessayer={onActualiser} />
    );
  } else if (chargement || fichiers === null) {
    corps = (
      <div className={GRILLE_CARTES}>
        <CarteChargement dossier="IN" />
        <CarteChargement dossier="OUT" />
      </div>
    );
  } else {
    corps = (
      <div className={GRILLE_CARTES}>
        <CarteFichiers
          dossier="IN"
          fichiers={fichiers.in}
          onOuvrir={ouvrir}
          onActualiser={onActualiser}
        />
        <CarteFichiers
          dossier="OUT"
          fichiers={fichiers.out}
          onOuvrir={ouvrir}
          onActualiser={onActualiser}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 py-8 pl-10 pr-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-heading text-navy-700">Fichier AC056</h1>
          <p className="text-xs text-neutral-600">Cliquez sur un fichier pour l&apos;ouvrir.</p>
        </div>
        {erreur === null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Actualiser la liste des fichiers"
            disabled={chargement}
            onClick={onActualiser}
          >
            <RefreshCw aria-hidden="true" />
            Actualiser
          </Button>
        )}
      </div>
      {corps}
    </div>
  );
}

export interface ChoixFichierProps {
  /** `false` tant que l'écran est masqué : la liste est relue au retour. */
  actif: boolean;
  onOuvrir: (cible: CibleFichierAc056) => void;
}

/** Choix du fichier relié à la liste des dossiers (relue à chaque montage et à chaque retour). */
export function ChoixFichier({ actif, onOuvrir }: ChoixFichierProps) {
  const liste = useFichiersAc056(actif);
  return (
    <ChoixFichierVue
      chargement={liste.chargement}
      erreur={liste.erreur}
      fichiers={liste.valeur}
      onOuvrir={onOuvrir}
      onActualiser={liste.recharger}
    />
  );
}
