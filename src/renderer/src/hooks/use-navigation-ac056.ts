import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompteursAc056, IndexLignesAc056 } from '@shared/domain/ac056';

import {
  choisirBeneficiaire,
  choisirElement,
  choisirEvenement,
  choisirOnglet,
  choisirOngletBeneficiaire,
  selectionInitiale,
  type ContexteNavigation,
  type SelectionAc056,
} from '@/pages/ac056/navigation-ac056';
import type {
  CleListe,
  IdOngletBeneficiaire,
  IdOngletEvenement,
} from '@/pages/ac056/organisation-ecran';

/** Actions de sélection, stables d'un rendu à l'autre (les lignes mémorisées ne se re-rendent pas). */
export interface ActionsNavigationAc056 {
  /** Position de l'évènement dans `IndexLignesAc056.evenements`. */
  choisirEvenement: (evenement: number) => void;
  choisirOnglet: (onglet: IdOngletEvenement) => void;
  /** Position du bénéficiaire dans `noeud.beneficiaires`. */
  choisirBeneficiaire: (beneficiaire: number) => void;
  choisirOngletBeneficiaire: (onglet: IdOngletBeneficiaire) => void;
  /** Position de l'élément dans sa liste (125, 485, 490 ou 700). */
  choisirElement: (liste: CleListe, rang: number) => void;
}

export interface NavigationAc056 {
  selection: SelectionAc056;
  actions: ActionsNavigationAc056;
}

/**
 * Sélection courante dans le fichier ouvert (évènement, onglets, bénéficiaire, éléments de liste) et
 * actions qui la changent selon les règles de `navigation-ac056.ts`. L'index et les compteurs sont
 * lus au moment de l'action : les compteurs changeront à la saisie sans changer les actions.
 * Le hook est monté avec le fichier : un autre fichier repart de la sélection initiale.
 */
export function useNavigationAc056(
  index: IndexLignesAc056,
  compteurs: CompteursAc056,
): NavigationAc056 {
  const contexte = useRef<ContexteNavigation>({ index, compteurs });
  const [selection, setSelection] = useState(() => selectionInitiale({ index, compteurs }));

  useEffect(() => {
    contexte.current = { index, compteurs };
  });

  const actions = useMemo<ActionsNavigationAc056>(
    () => ({
      choisirEvenement: (evenement) =>
        setSelection((s) => choisirEvenement(contexte.current, s, evenement)),
      choisirOnglet: (onglet) => setSelection((s) => choisirOnglet(s, onglet)),
      choisirBeneficiaire: (beneficiaire) =>
        setSelection((s) => choisirBeneficiaire(contexte.current, s, beneficiaire)),
      choisirOngletBeneficiaire: (onglet) =>
        setSelection((s) => choisirOngletBeneficiaire(s, onglet)),
      choisirElement: (liste, rang) => setSelection((s) => choisirElement(s, liste, rang)),
    }),
    [],
  );

  return { selection, actions };
}
