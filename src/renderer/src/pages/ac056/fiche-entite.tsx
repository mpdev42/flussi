import { CircleAlert } from 'lucide-react';
import {
  FICHES,
  champsAffiches,
  octetsDepuisTexte,
  type AnomalieAc056,
  type CibleChamp,
  type CodeFiche,
  type LigneAc056,
  type Provenance,
} from '@shared/domain/ac056';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ErreurSaisie } from '@/hooks/use-fichier-ac056';

import { ChampAc056 } from './champ-ac056';
import { EncadreRejet } from './encadre-rejet';
import { texteAnomalie } from './presentation-champ';
import { titreErreursLigne } from './textes-ac056';

const VALEUR_VIDE = octetsDepuisTexte('');

/** Deux colonnes quand la place le permet (288 px au moins par champ), sinon une. */
const GRILLE_CHAMPS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-x-6 gap-y-4';

function ErreursLigne({
  titre,
  anomalies,
}: {
  titre: string;
  anomalies: readonly AnomalieAc056[];
}) {
  return (
    <Alert variant="error" role="note" className="mb-4">
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertTitle as="h3">{titre}</AlertTitle>
      <AlertDescription>
        <ul className="m-0 list-disc pl-4">
          {anomalies.map((anomalie, rang) => (
            <li key={rang}>{texteAnomalie(anomalie)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export interface FicheEntiteProps {
  code: CodeFiche;
  ligne: LigneAc056;
  /**
   * Indice de la ligne dans `FichierAc056.lignes` : il ne change pas à l'enregistrement, alors que
   * le numéro de ligne change quand des lignes vides sont supprimées. Il fixe la clé des champs.
   */
  indice: number;
  /** Provenance du fichier : fixe le décodage des valeurs (UTF-8 ou Windows-1252). */
  provenance: Provenance;
  /** Anomalies bloquantes de la ligne (toujours vides pour un rejet : ses anomalies sont masquées). */
  anomalies: readonly AnomalieAc056[];
  /** Faux si le fichier a une anomalie de structure ou s'il est un rejet : champs en lecture seule. */
  fichierModifiable: boolean;
  onSaisir: (cible: CibleChamp, texte: string) => ErreurSaisie | null;
}

/**
 * Fiche d'une entité : titre (code en mono) et numéro de la ligne, erreurs de la ligne qui ne
 * tiennent à aucun champ affiché (fichier VEOS) ou encadré du message de MSP (ligne rejetée d'un
 * rejet, titre h3 sous le h2 de la fiche), puis les champs dans l'ordre de l'écran Lazarus. Seuls
 * les champs modifiables en erreur (ou déjà corrigés) se saisissent, voir `ChampAc056`.
 */
export function FicheEntite({
  code,
  ligne,
  indice,
  provenance,
  anomalies,
  fichierModifiable,
  onSaisir,
}: FicheEntiteProps) {
  const champs = champsAffiches(code);
  const decrite = ligne.nature === 'decrite';
  const autres = anomalies.filter(
    (anomalie) =>
      !decrite || anomalie.champ === undefined || !champs.some((c) => c.nom === anomalie.champ),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="m-0 text-lg font-semibold text-navy-700">
          <span className="font-mono text-base font-medium">{code}</span> · {FICHES[code].titre}
        </h2>
        <span className="font-mono text-xs text-neutral-600">Ligne {ligne.numero}</span>
      </div>
      {autres.length > 0 && (
        <ErreursLigne
          titre={titreErreursLigne(ligne.numero, autres.length, autres.length < anomalies.length)}
          anomalies={autres}
        />
      )}
      {ligne.rejet && <EncadreRejet rejet={ligne.rejet} niveau="h3" />}
      {ligne.nature !== 'decrite' ? (
        <p className="m-0 text-body-sm text-neutral-600">
          Les champs de cette ligne ne sont pas affichés : elle est mal formée.
        </p>
      ) : champs.length === 0 ? (
        <p className="m-0 text-body-sm text-neutral-600">Aucun champ affiché pour cette entité.</p>
      ) : (
        <div className={GRILLE_CHAMPS}>
          {champs.map((champ) => (
            <ChampAc056
              key={`${indice}:${champ.nom}`}
              champ={champ}
              ligne={ligne.numero}
              valeur={ligne.valeurs[champ.nom] ?? VALEUR_VIDE}
              provenance={provenance}
              anomalies={anomalies.filter((anomalie) => anomalie.champ === champ.nom)}
              corrige={ligne.champsModifies?.includes(champ.nom) ?? false}
              fichierModifiable={fichierModifiable}
              onSaisir={onSaisir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
