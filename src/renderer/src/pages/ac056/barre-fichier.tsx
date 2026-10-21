import type { Ref } from 'react';
import { CircleAlert, CircleCheck, PencilLine, Save } from 'lucide-react';
import type { AnalyseAc056, Provenance } from '@shared/domain/ac056';
import type { EmplacementAc056 } from '@shared/types';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ToneBadge } from '@/components/ui/status-badge';
import { pluralize } from '@/lib/pluralize';

import { BadgeType } from './badge-type';
import { anomalieFichierVide } from './format-ac056';
import { BoutonChangerFichier } from './bouton-changer-fichier';
import {
  LIBELLE_ENREGISTREMENT,
  LIBELLE_ENREGISTRER,
  LIBELLE_MODIFIE,
  RAISON_MAL_FORME,
} from './textes-ac056';

/** Compteur de la barre : erreurs d'un fichier VEOS, lignes rejetées d'un rejet. */
function Compteur({ analyse, provenance }: { analyse: AnalyseAc056; provenance: Provenance }) {
  if (provenance === 'rejet') {
    const n = analyse.lignesRejetees;
    return n > 0 ? (
      <ToneBadge tone="error" icon={CircleAlert}>
        {n} {pluralize(n, 'ligne rejetée', 'lignes rejetées')}
      </ToneBadge>
    ) : (
      <ToneBadge tone="neutral" icon={CircleCheck}>
        Aucune ligne rejetée
      </ToneBadge>
    );
  }
  const n = analyse.erreurs;
  return n > 0 ? (
    <ToneBadge tone="error" icon={CircleAlert}>
      {n} {pluralize(n, 'erreur', 'erreurs')}
    </ToneBadge>
  ) : (
    <ToneBadge tone="success" icon={CircleCheck}>
      Aucune erreur
    </ToneBadge>
  );
}

export interface BarreFichierProps {
  nom: string;
  emplacement: EmplacementAc056;
  provenance: Provenance;
  /** `null` tant que le fichier n'est pas chargé, ou s'il n'a pas pu l'être : pas de compteur. */
  analyse: AnalyseAc056 | null;
  /** Chargement en cours : « Changer de fichier » est désactivé. */
  chargement: boolean;
  /** Des corrections non enregistrées sont en mémoire : badge « Modifié » et confirmation. */
  modifie?: boolean;
  /** Nombre de champs modifiés non enregistrés, cité par la confirmation. */
  champsModifies?: number;
  /** Enregistrement en cours : « Enregistrer » occupé, « Changer de fichier » inactif. */
  enregistrement?: boolean;
  /** Référence du bouton « Enregistrer » : l'écran y remet le focus après « Réessayer ». */
  boutonEnregistrer?: Ref<HTMLButtonElement>;
  onChanger: () => void;
  onEnregistrer: () => void;
}

/**
 * Barre du fichier ouvert, pleine largeur : nom (h1), dossier, type, état « Modifié », compteur, puis
 * « Changer de fichier » et, pour un fichier VEOS lisible, « Enregistrer ». Pas de compteur ni de
 * bouton pour un fichier illisible (aucune ligne AC056) ; pas d'« Enregistrer » pour un rejet.
 *
 * « Enregistrer » n'est désactivé (`disabled`) que pour un fichier mal formé, qui ne le redevient
 * jamais. Pendant l'enregistrement il reste actif au sens du DOM (`aria-disabled`, `aria-busy`, clic
 * ignoré) : un bouton qui change d'état sous le pointeur perd le clic, et `disabled` ferait perdre le
 * focus. Si le fichier a été corrigé en mémoire, « Changer de fichier » passe par la confirmation
 * « Abandonner les modifications ? » (focus initial sur « Annuler »).
 */
export function BarreFichier({
  nom,
  emplacement,
  provenance,
  analyse,
  chargement,
  modifie = false,
  champsModifies = 0,
  enregistrement = false,
  boutonEnregistrer,
  onChanger,
  onEnregistrer,
}: BarreFichierProps) {
  const analyseComptee =
    analyse !== null && anomalieFichierVide(analyse) === undefined ? analyse : null;
  const enregistrable = provenance === 'veos' && analyseComptee !== null;
  const malForme = enregistrable && analyseComptee.structure > 0;
  return (
    <div className="shrink-0 border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 pl-10 pr-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="m-0 min-w-0 break-all font-mono text-data font-semibold text-navy-700">
            {nom}
          </h1>
          <span className="text-xs tracking-caption text-neutral-600">
            {emplacement.toUpperCase()}
          </span>
          <BadgeType provenance={provenance} />
          {modifie && (
            <ToneBadge tone="neutral" icon={PencilLine}>
              {LIBELLE_MODIFIE}
            </ToneBadge>
          )}
          {analyseComptee && <Compteur analyse={analyseComptee} provenance={provenance} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BoutonChangerFichier
            nom={nom}
            modifie={modifie}
            champsModifies={champsModifies}
            disabled={chargement || enregistrement}
            onChanger={onChanger}
          />
          {malForme && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error-text">
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {RAISON_MAL_FORME}
            </span>
          )}
          {enregistrable && (
            <Button
              ref={boutonEnregistrer}
              type="button"
              disabled={malForme}
              aria-busy={enregistrement || undefined}
              aria-disabled={enregistrement || undefined}
              className="aria-disabled:opacity-70"
              onClick={() => {
                if (!enregistrement) onEnregistrer();
              }}
            >
              {enregistrement ? <Spinner size={16} label={null} /> : <Save aria-hidden="true" />}
              {enregistrement ? LIBELLE_ENREGISTREMENT : LIBELLE_ENREGISTRER}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
