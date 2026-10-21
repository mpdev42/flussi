import { useState } from 'react';
import { FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import {
  LIBELLE_ABANDON,
  LIBELLE_CHANGER_FICHIER,
  TITRE_ABANDON,
  messageAbandon,
} from './textes-ac056';

export interface BoutonChangerFichierProps {
  /** Nom du fichier ouvert, cité par la confirmation. */
  nom: string;
  /** Des corrections non enregistrées sont en mémoire : le changement passe par la confirmation. */
  modifie: boolean;
  /** Nombre de champs modifiés non enregistrés, cité par la confirmation. */
  champsModifies: number;
  disabled?: boolean;
  onChanger: () => void;
}

/**
 * « Changer de fichier » : revient au choix du fichier. Si le fichier a été corrigé en mémoire, la
 * confirmation « Abandonner les modifications ? » passe d'abord (focus initial sur « Annuler »).
 */
export function BoutonChangerFichier({
  nom,
  modifie,
  champsModifies,
  disabled = false,
  onChanger,
}: BoutonChangerFichierProps) {
  const [confirmation, setConfirmation] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => (modifie ? setConfirmation(true) : onChanger())}
      >
        <FolderOpen aria-hidden="true" />
        {LIBELLE_CHANGER_FICHIER}
      </Button>
      <ConfirmDialog
        open={confirmation}
        onClose={() => setConfirmation(false)}
        title={TITRE_ABANDON}
        description={messageAbandon(champsModifies, nom)}
        confirmLabel={LIBELLE_ABANDON}
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmation(false);
          onChanger();
        }}
      />
    </>
  );
}
