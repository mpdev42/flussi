import { memo, useCallback, useMemo } from 'react';
import { CircleAlert, List } from 'lucide-react';
import { ENTITES, type FichierAc056 } from '@shared/domain/ac056';

import { CountBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

import type { CleListe, DefListe } from './organisation-ecran';
import { texteChampAffiche } from './presentation-champ';
import { LIGNE_SELECTIONNABLE, etatLigne } from './styles-navigation';

/** Icône, une colonne par champ (2 ou 3, passent à la ligne), compteur. Classes écrites en entier : Tailwind ne lit pas les classes composées. */
const GRILLES: Readonly<Record<number, string>> = {
  2: 'grid grid-cols-[1rem_repeat(2,minmax(0,1fr))_1.5rem] items-center gap-2',
  3: 'grid grid-cols-[1rem_repeat(3,minmax(0,1fr))_1.5rem] items-center gap-2',
};

interface ElementListeProps {
  rang: number;
  /** Texte de chaque colonne (valeurs affichées). */
  valeurs: readonly string[];
  /** Pour chaque colonne : vrai si la valeur est modifiable (affichée sur une seule ligne tronquée). */
  tronquees: readonly boolean[];
  grille: string;
  compteur: number;
  selectionne: boolean;
  onChoisir: (rang: number) => void;
}

const ElementListe = memo(function ElementListe({
  rang,
  valeurs,
  tronquees,
  grille,
  compteur,
  selectionne,
  onChoisir,
}: ElementListeProps) {
  const enErreur = compteur > 0;
  const Icone = enErreur ? CircleAlert : List;
  return (
    <button
      type="button"
      aria-current={selectionne || undefined}
      onClick={() => onChoisir(rang)}
      className={cn(
        LIGNE_SELECTIONNABLE,
        etatLigne(selectionne, enErreur),
        grille,
        'min-h-8 px-2 py-1 text-sm',
      )}
    >
      <Icone
        className="pointer-events-none shrink-0"
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {valeurs.map((valeur, colonne) =>
        tronquees[colonne] ? (
          // Colonne modifiable : une seule ligne, sinon la saisie changerait la hauteur de la liste
          <span key={colonne} className="min-w-0 truncate" title={valeur}>
            {valeur}
          </span>
        ) : (
          <span key={colonne} className="break-words">
            {valeur}
          </span>
        ),
      )}
      <span className="pointer-events-none justify-self-end">
        <CountBadge count={compteur} />
      </span>
    </button>
  );
});

export interface ListeElementsProps {
  definition: DefListe;
  fichier: FichierAc056;
  /** Indices dans `fichier.lignes` des éléments de la liste, dans l'ordre. */
  indices: readonly number[];
  /** Erreurs bloquantes de chaque élément (`CompteursAc056.parElement`). */
  compteurs: readonly number[];
  selection: number;
  /** Stable d'un rendu à l'autre (`ActionsNavigationAc056.choisirElement`) : les lignes sont mémorisées. */
  onChoisir: (liste: CleListe, rang: number) => void;
}

/**
 * Liste compacte des éléments d'un onglet à liste (Coordonnées, Garanties, Critères, Variables) :
 * les colonnes de Lazarus, un compteur d'erreurs par élément, sélection par clic. Hauteur bornée, la
 * liste défile seule pour ne pas repousser la fiche.
 */
export function ListeElements({
  definition,
  fichier,
  indices,
  compteurs,
  selection,
  onChoisir,
}: ListeElementsProps) {
  const colonnes = useMemo(() => {
    const champs = ENTITES[definition.code].champs;
    return definition.colonnes.map((colonne) => ({
      ...colonne,
      description: champs.find((champ) => champ.nom === colonne.champ)!,
    }));
  }, [definition]);
  const tronquees = useMemo(
    () => colonnes.map(({ description }) => description.modifiable),
    [colonnes],
  );
  const grille = GRILLES[colonnes.length]!;
  const { cle } = definition;
  const choisir = useCallback((rang: number) => onChoisir(cle, rang), [onChoisir, cle]);
  // Textes affichés recalculés seulement quand le fichier ou la liste change, pas à chaque sélection
  const valeurs = useMemo(
    () =>
      indices.map((indice) => {
        const ligne = fichier.lignes[indice];
        return colonnes.map(({ champ, description }) => {
          if (ligne?.nature !== 'decrite') return '';
          const valeur = ligne.valeurs[champ];
          return valeur === undefined ? '' : texteChampAffiche(description, valeur);
        });
      }),
    [fichier, indices, colonnes],
  );

  return (
    <div className="mb-5 overflow-hidden rounded-md border border-border">
      <div
        aria-hidden="true"
        className={cn(
          grille,
          'border-b border-border bg-muted py-1.5 pl-3.5 pr-3 text-xs font-medium text-neutral-600',
        )}
      >
        <span />
        {colonnes.map((colonne) => (
          <span key={colonne.champ}>{colonne.libelle}</span>
        ))}
        <span />
      </div>
      <ul
        aria-label={definition.nom}
        className="m-0 max-h-48 list-none overflow-y-auto p-1 scrollbar-fin"
      >
        {indices.map((indice, rang) => (
          <li key={indice}>
            <ElementListe
              rang={rang}
              valeurs={valeurs[rang]!}
              tronquees={tronquees}
              grille={grille}
              compteur={compteurs[rang] ?? 0}
              selectionne={rang === selection}
              onChoisir={choisir}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
