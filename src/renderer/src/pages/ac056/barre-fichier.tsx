import { useState } from 'react';
import { CircleAlert, CircleCheck, FolderOpen } from 'lucide-react';
import type { AnalyseAc056, Provenance } from '@shared/domain/ac056';
import type { EmplacementAc056 } from '@shared/types';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ToneBadge } from '@/components/ui/status-badge';
import { pluralize } from '@/lib/pluralize';

import { BadgeType } from './badge-type';
import { anomalieFichierVide } from './format-ac056';
import { LIBELLE_ABANDON, MESSAGE_ABANDON, TITRE_ABANDON } from './textes-ac056';

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
  /** Des corrections non enregistrées sont en mémoire : « Changer de fichier » demande confirmation. */
  modifie?: boolean;
  onChanger: () => void;
}

/**
 * Barre du fichier ouvert, pleine largeur : nom (h1), dossier, type, compteur et « Changer de
 * fichier ». Pas de compteur pour un fichier illisible (aucune ligne AC056). Si le fichier a été
 * corrigé en mémoire, « Changer de fichier » passe par la confirmation « Abandonner les
 * modifications ? » (focus initial sur « Annuler »).
 */
export function BarreFichier({
  nom,
  emplacement,
  provenance,
  analyse,
  chargement,
  modifie = false,
  onChanger,
}: BarreFichierProps) {
  const [confirmation, setConfirmation] = useState(false);
  const analyseComptee =
    analyse !== null && anomalieFichierVide(analyse) === undefined ? analyse : null;
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
          {analyseComptee && <Compteur analyse={analyseComptee} provenance={provenance} />}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={chargement}
          onClick={() => (modifie ? setConfirmation(true) : onChanger())}
        >
          <FolderOpen aria-hidden="true" />
          Changer de fichier
        </Button>
      </div>
      <ConfirmDialog
        open={confirmation}
        onClose={() => setConfirmation(false)}
        title={TITRE_ABANDON}
        description={MESSAGE_ABANDON}
        confirmLabel={LIBELLE_ABANDON}
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmation(false);
          onChanger();
        }}
      />
    </div>
  );
}
