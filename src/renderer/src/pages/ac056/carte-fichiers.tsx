import { useId, useState } from 'react';
import { Folder, Inbox, RefreshCw } from 'lucide-react';
import type { FichierListeAc056 } from '@shared/types';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { BadgeType } from './badge-type';
import {
  TAILLE_TRANCHE,
  descriptionCarte,
  formaterDateHeure,
  formaterTaille,
} from './format-ac056';

/** Colonnes Nom / Date / Taille / Type, communes à l'en-tête et aux lignes. */
const GRILLE = 'grid grid-cols-[minmax(0,1fr)_8.5rem_4rem_5rem] items-center gap-3 px-4';

export type NomDossier = 'IN' | 'OUT';

function EnTeteCarte({
  id,
  dossier,
  description,
}: {
  id: string;
  dossier: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <h2 id={id} className="m-0 flex items-center gap-2 text-base font-semibold text-navy-700">
        <Folder className="shrink-0" size={16} strokeWidth={1.75} aria-hidden="true" />
        {dossier}
      </h2>
      <p className="m-0 text-xs text-neutral-600">{description}</p>
    </div>
  );
}

export interface CarteFichiersProps {
  dossier: NomDossier;
  /** Du plus récent au plus ancien (ordre du main). */
  fichiers: readonly FichierListeAc056[];
  onOuvrir: (fichier: FichierListeAc056) => void;
  onActualiser: () => void;
}

/**
 * Carte d'un dossier de travail : une ligne (un vrai bouton) par fichier, affichée par tranches de
 * `TAILLE_TRANCHE` pour rester fluide. Aucun chemin n'est affiché, seulement le nom.
 */
export function CarteFichiers({ dossier, fichiers, onOuvrir, onActualiser }: CarteFichiersProps) {
  const titreId = useId();
  const [affiches, setAffiches] = useState(TAILLE_TRANCHE);
  const visibles = fichiers.slice(0, affiches);

  return (
    <Card
      role="group"
      aria-labelledby={titreId}
      className="flex min-w-0 flex-col overflow-hidden shadow-xs"
    >
      <EnTeteCarte id={titreId} dossier={dossier} description={descriptionCarte(fichiers.length)} />
      {fichiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <Inbox className="size-5 text-neutral-600" aria-hidden="true" />
          <p className="m-0 text-body-sm text-neutral-600">Aucun fichier dans {dossier}</p>
          <Button type="button" variant="outline" size="sm" onClick={onActualiser}>
            <RefreshCw aria-hidden="true" />
            Actualiser
          </Button>
        </div>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={cn(
              GRILLE,
              'border-b border-border bg-muted py-2 text-body-sm font-medium text-neutral-600',
            )}
          >
            <span>Nom</span>
            <span>Date</span>
            <span className="text-right">Taille</span>
            <span>Type</span>
          </div>
          <ul className="m-0 list-none divide-y divide-neutral-200 p-0">
            {visibles.map((fichier) => (
              <li key={fichier.nom}>
                <button
                  type="button"
                  onClick={() => onOuvrir(fichier)}
                  className={cn(
                    GRILLE,
                    'w-full cursor-pointer py-2 text-left text-data transition-colors duration-fast hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  )}
                >
                  <span className="truncate font-mono" title={fichier.nom}>
                    {fichier.nom}
                  </span>
                  <span className="tabular-nums text-neutral-700">
                    {formaterDateHeure(fichier.modification)}
                  </span>
                  <span className="text-right tabular-nums text-neutral-700">
                    {formaterTaille(fichier.taille)}
                  </span>
                  <span>
                    <BadgeType provenance={fichier.provenance} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {fichiers.length > visibles.length && (
            <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
              <span className="text-xs tabular-nums text-neutral-600">
                {visibles.length} sur {fichiers.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAffiches((n) => n + TAILLE_TRANCHE)}
              >
                Afficher les fichiers suivants
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Carte en attente de la liste : en-tête réel, lignes squelettes. */
export function CarteChargement({ dossier }: { dossier: NomDossier }) {
  const titreId = useId();
  return (
    <Card
      role="group"
      aria-labelledby={titreId}
      aria-busy="true"
      className="flex min-w-0 flex-col overflow-hidden shadow-xs"
    >
      <EnTeteCarte id={titreId} dossier={dossier} description="Chargement des fichiers…" />
      <div className="flex flex-col gap-3 px-4 py-4">
        {[0, 1, 2, 3].map((ligne) => (
          <Skeleton key={ligne} className="h-4 w-full rounded-sm bg-neutral-200" />
        ))}
      </div>
    </Card>
  );
}
