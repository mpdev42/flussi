import { useId, useMemo } from 'react';
import { CircleAlert } from 'lucide-react';
import type {
  AnalyseAc056,
  AnomalieAc056,
  BeneficiaireAc056,
  CibleChamp,
  CompteursAc056,
  EvenementAc056,
  IndexLignesAc056,
} from '@shared/domain/ac056';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { idOngletTabBar } from '@/components/ui/tab-bar-ids';
import { TabBar } from '@/components/ui/tab-bar';
import type { ErreurSaisie } from '@/hooks/use-fichier-ac056';
import type { ActionsNavigationAc056 } from '@/hooks/use-navigation-ac056';
import { pluralize } from '@/lib/pluralize';

import { FicheEntite } from './fiche-entite';
import { ListeElements } from './liste-elements';
import { ficheCourante, type SelectionAc056 } from './navigation-ac056';
import {
  ONGLETS_BENEFICIAIRE,
  ONGLETS_EVENEMENT,
  compteurOngletBeneficiaire,
  compteurOngletEvenement,
  definitionOngletBeneficiaire,
  definitionOngletEvenement,
  ongletBeneficiairePresent,
  ongletEvenementPresent,
  type CleListe,
  type DefListe,
} from './organisation-ecran';
import { texteAnomalie } from './presentation-champ';
import { nomComplet, resumeBeneficiaire, resumeEvenement } from './resumes-ac056';

const AUCUNE_ANOMALIE: readonly AnomalieAc056[] = [];

function indicesListe(
  noeud: EvenementAc056,
  beneficiaire: BeneficiaireAc056 | undefined,
  cle: CleListe,
): readonly number[] {
  return cle === 'e125' ? noeud.e125 : (beneficiaire?.[cle] ?? []);
}

function compteursListe(
  compteurs: CompteursAc056,
  evenement: number,
  beneficiaire: number,
  cle: CleListe,
): readonly number[] {
  const listes = compteurs.parElement[evenement];
  return cle === 'e125' ? (listes?.e125 ?? []) : (listes?.beneficiaires[beneficiaire]?.[cle] ?? []);
}

export interface ColonneDetailProps {
  analyse: AnalyseAc056;
  index: IndexLignesAc056;
  compteurs: CompteursAc056;
  selection: SelectionAc056;
  /** Anomalies bloquantes par numéro de ligne d'origine. */
  anomaliesParLigne: ReadonlyMap<number, readonly AnomalieAc056[]>;
  actions: ActionsNavigationAc056;
  onSaisir: (cible: CibleChamp, texte: string) => ErreurSaisie | null;
}

/**
 * Colonne centrale : fil d'Ariane, erreurs de la 990, onglets de l'évènement puis du bénéficiaire
 * (compteurs d'erreurs), et dans le panneau la liste des éléments (onglets à liste) et la fiche de
 * l'entité (champs en erreur modifiables, sauf anomalie de structure du fichier).
 */
export function ColonneDetail({
  analyse,
  index,
  compteurs,
  selection,
  anomaliesParLigne,
  actions,
  onSaisir,
}: ColonneDetailProps) {
  const idPanneau = useId();
  const idPanneauBeneficiaire = useId();
  const { fichier } = analyse;
  const { evenement, onglet, beneficiaire: positionBeneficiaire, ongletBeneficiaire } = selection;
  const noeud = index.evenements[evenement]?.noeud;
  const beneficiaire = noeud?.beneficiaires[positionBeneficiaire];
  const surBeneficiaires = onglet === 'beneficiaires' && beneficiaire !== undefined;

  const onglets = useMemo(
    () =>
      noeud
        ? ONGLETS_EVENEMENT.map((def) => ({
            id: def.id,
            libelle: def.libelle,
            mono: def.mono,
            compteur: compteurOngletEvenement(compteurs, evenement, def),
            desactive: !ongletEvenementPresent(noeud, def.id),
          }))
        : [],
    [noeud, compteurs, evenement],
  );
  const ongletsBeneficiaire = useMemo(
    () =>
      beneficiaire
        ? ONGLETS_BENEFICIAIRE.map((def) => ({
            id: def.id,
            libelle: def.libelle,
            mono: def.mono,
            compteur: compteurOngletBeneficiaire(compteurs, evenement, positionBeneficiaire, def),
            desactive: !ongletBeneficiairePresent(beneficiaire, def.id),
          }))
        : [],
    [beneficiaire, compteurs, evenement, positionBeneficiaire],
  );

  if (!noeud) return null;

  const resume = resumeEvenement(fichier, noeud);
  const resumeDuBeneficiaire = surBeneficiaires
    ? resumeBeneficiaire(fichier, noeud, beneficiaire)
    : null;

  const ligne990 = noeud.e990 === null ? undefined : fichier.lignes[noeud.e990];
  const erreurs990 = ligne990 ? (anomaliesParLigne.get(ligne990.numero) ?? AUCUNE_ANOMALIE) : [];

  const defOnglet = surBeneficiaires
    ? definitionOngletBeneficiaire(ongletBeneficiaire)
    : definitionOngletEvenement(onglet);
  const liste: DefListe | undefined = defOnglet.liste;
  const fiche = ficheCourante(index, selection);
  const ligneFiche = fiche ? fichier.lignes[fiche.indice] : undefined;

  const fichePanneau = (
    <>
      {liste && (
        <ListeElements
          definition={liste}
          fichier={fichier}
          indices={indicesListe(noeud, beneficiaire, liste.cle)}
          compteurs={compteursListe(compteurs, evenement, positionBeneficiaire, liste.cle)}
          selection={selection.elements[liste.cle]}
          onChoisir={actions.choisirElement}
        />
      )}
      {fiche && ligneFiche && (
        <FicheEntite
          code={fiche.code}
          ligne={ligneFiche}
          anomalies={anomaliesParLigne.get(ligneFiche.numero) ?? AUCUNE_ANOMALIE}
          fichierModifiable={analyse.structure === 0}
          onSaisir={onSaisir}
        />
      )}
    </>
  );

  return (
    <section
      aria-label="Détail de l’évènement"
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card"
    >
      <div className="shrink-0 border-b border-border px-4 pt-3">
        {/* Une seule ligne : le nom du bénéficiaire est modifiable, il est tronqué (texte complet au
            survol) pour que sa longueur ne change jamais la hauteur de l'en-tête */}
        <p className="m-0 mb-2 flex items-center gap-x-3 whitespace-nowrap text-xs text-neutral-600">
          <span className="shrink-0">
            Dossier <Valeur>{resume.dossier}</Valeur>
          </span>
          <span className="shrink-0">
            Évènement <Valeur>{resume.numEvt}</Valeur>
          </span>
          <span className="shrink-0">
            Contrat <Valeur>{resume.contrat}</Valeur>
          </span>
          {resumeDuBeneficiaire && (
            <span
              className="min-w-0 truncate"
              title={`Bénéficiaire ${resumeDuBeneficiaire.lien} ${nomComplet(resumeDuBeneficiaire)}`}
            >
              Bénéficiaire <Valeur>{resumeDuBeneficiaire.lien}</Valeur>{' '}
              <Valeur>{nomComplet(resumeDuBeneficiaire)}</Valeur>
            </span>
          )}
        </p>
        {erreurs990.length > 0 && (
          <Alert variant="error" role="note" className="mb-3">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle as="h2">
              Ligne {ligne990?.numero} (990) de l’évènement : {erreurs990.length}{' '}
              {pluralize(erreurs990.length, 'erreur', 'erreurs')}
            </AlertTitle>
            <AlertDescription>
              <ul className="m-0 list-disc pl-4">
                {erreurs990.map((anomalie, rang) => (
                  <li key={rang}>{texteAnomalie(anomalie)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <TabBar
          ariaLabel="Entités de l’évènement"
          idPanneau={idPanneau}
          onglets={onglets}
          actif={onglet}
          onChange={(id) => actions.choisirOnglet(id as typeof onglet)}
          // Filet sous les onglets (ils le recouvrent de leur soulignement) : celui du conteneur
          // quand cette barre est la dernière, le sien quand la barre du bénéficiaire suit
          className={surBeneficiaires ? 'border-b border-border' : undefined}
        />
        {surBeneficiaires && (
          <TabBar
            ariaLabel="Entités du bénéficiaire"
            idPanneau={idPanneauBeneficiaire}
            onglets={ongletsBeneficiaire}
            actif={ongletBeneficiaire}
            onChange={(id) => actions.choisirOngletBeneficiaire(id as typeof ongletBeneficiaire)}
            titreDesactive="Entité absente de ce bénéficiaire"
            className="pt-1"
          />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 scrollbar-fin">
        <div role="tabpanel" id={idPanneau} aria-labelledby={idOngletTabBar(idPanneau, onglet)}>
          {surBeneficiaires ? (
            <div
              role="tabpanel"
              id={idPanneauBeneficiaire}
              aria-labelledby={idOngletTabBar(idPanneauBeneficiaire, ongletBeneficiaire)}
            >
              {fichePanneau}
            </div>
          ) : (
            fichePanneau
          )}
        </div>
      </div>
    </section>
  );
}

/** Valeur lue dans le fichier (numéro, code), en police à chasse fixe. */
function Valeur({ children }: { children: string }) {
  return <b className="font-mono text-data font-medium text-foreground">{children}</b>;
}
