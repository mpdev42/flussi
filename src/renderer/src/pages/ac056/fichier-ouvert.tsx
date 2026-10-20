import { useCallback, useMemo, useState } from 'react';
import type {
  AnalyseAc056,
  CibleChamp,
  CompteursAc056,
  IndexLignesAc056,
} from '@shared/domain/ac056';

import type { ErreurSaisie } from '@/hooks/use-fichier-ac056';
import { useNavigationAc056 } from '@/hooks/use-navigation-ac056';

import { ColonneDetail } from './colonne-detail';
import { ColonneEvenements } from './colonne-evenements';
import { anomaliesBloquantesParLigne } from './presentation-champ';
import { resumeBeneficiaire, resumeEvenement } from './resumes-ac056';

export interface FichierOuvertProps {
  analyse: AnalyseAc056;
  index: IndexLignesAc056;
  /** Compteurs d'erreurs de l'analyse, calculés une fois par l'écran. */
  compteurs: CompteursAc056;
  /** Applique la saisie d'un champ à la sortie du champ (voir `useFichierAc056`). */
  onSaisir: (cible: CibleChamp, texte: string, index?: IndexLignesAc056) => ErreurSaisie | null;
}

/**
 * Contenu d'un fichier VEOS ouvert : colonne des évènements à gauche, détail de l'évènement à
 * droite (onglets, liste, fiche dont les champs en erreur se corrigent). Chaque colonne défile seule ; la barre du fichier
 * et les alertes, au-dessus, restent en place. Monté avec le fichier : la sélection repart du
 * premier évènement pour chaque fichier ouvert.
 */
export function FichierOuvert({ analyse, index, compteurs, onSaisir }: FichierOuvertProps) {
  const { fichier } = analyse;
  const { selection, actions } = useNavigationAc056(index, compteurs);
  const anomaliesParLigne = useMemo(
    () => anomaliesBloquantesParLigne(analyse.anomalies),
    [analyse.anomalies],
  );
  // Les résumés des évènements ne lisent que des champs non modifiables de la 100 : calculés sur le
  // fichier tel qu'ouvert, une fois, pour que les lignes ne se re-rendent pas à chaque saisie.
  // (Ceux des bénéficiaires lisent le nom de la 115 ou de la 405, modifiable : ils suivent `fichier`.)
  const [fichierOuvert] = useState(fichier);
  const resumes = useMemo(
    () => index.evenements.map(({ noeud }) => resumeEvenement(fichierOuvert, noeud)),
    [fichierOuvert, index],
  );
  const noeud = index.evenements[selection.evenement]?.noeud;
  const resumesBeneficiaires = useMemo(
    () => (noeud ? noeud.beneficiaires.map((b) => resumeBeneficiaire(fichier, noeud, b)) : []),
    [fichier, noeud],
  );

  // Une saisie différée au relâchement de la souris reste liée à ce fichier : si un autre fichier est
  // ouvert entre-temps, le hook l'ignore.
  const saisirDansCeFichier = useCallback(
    (cible: CibleChamp, texte: string) => onSaisir(cible, texte, index),
    [onSaisir, index],
  );

  if (index.evenements.length === 0) {
    return (
      <div className="mx-auto w-full max-w-content py-4 pl-10 pr-0">
        <p className="m-0 text-body-sm text-neutral-600">
          Ce fichier ne contient aucun évènement à afficher.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-content flex-1 grid-cols-ac056 grid-rows-1 gap-4 py-4 pl-10 pr-0">
      <ColonneEvenements
        evenements={resumes}
        compteurs={compteurs.parEvenement}
        selection={selection.evenement}
        onChoisir={actions.choisirEvenement}
        beneficiaires={
          selection.onglet === 'beneficiaires' && resumesBeneficiaires.length > 0
            ? {
                resumes: resumesBeneficiaires,
                compteurs: compteurs.parBeneficiaire[selection.evenement] ?? [],
                selection: selection.beneficiaire,
                onChoisir: actions.choisirBeneficiaire,
              }
            : null
        }
      />
      <ColonneDetail
        analyse={analyse}
        index={index}
        compteurs={compteurs}
        selection={selection}
        anomaliesParLigne={anomaliesParLigne}
        actions={actions}
        onSaisir={saisirDansCeFichier}
      />
    </div>
  );
}
