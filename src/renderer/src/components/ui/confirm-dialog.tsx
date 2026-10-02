import * as React from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const ICONS = {
  warning: { Icon: TriangleAlert, className: 'text-warning-text' },
  error: { Icon: CircleAlert, className: 'text-error-text' },
  info: { Icon: Info, className: 'text-info-text' },
} as const;

export interface ConfirmDialogProps {
  open: boolean;
  /** Appelé par Échap et « Annuler ». Jamais par un clic sur le fond, ni pendant `loading`. */
  onClose: () => void;
  /** Une question : « Déposer le fichier chez le partenaire ? » */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Récapitulatif (environnement, fichier, résultat du contrôle, empreinte…). */
  children?: React.ReactNode;
  icon?: keyof typeof ICONS;
  /** Verbe + objet : « Déposer le fichier ». Jamais « OK » ni « Oui ». */
  confirmLabel: string;
  cancelLabel?: string;
  /** Ne ferme pas la boîte : le parent repasse `open` à false une fois l'action terminée. */
  onConfirm: () => void;
  /** `destructive` quand l'action supprime ou écrase ; `primary` pour les envois irréversibles. */
  confirmVariant?: 'primary' | 'destructive';
  /** Action en cours : bouton occupé, boîte non fermable. */
  loading?: boolean;
  /** Libellé pendant l'action : « Dépôt en cours… ». Par défaut, confirmLabel. */
  loadingLabel?: string;
}

/**
 * Confirmation d'une action irréversible. Le focus initial va sur « Annuler » (comportement par
 * défaut de l'AlertDialog Radix) : Entrée ne confirme jamais par accident.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
  icon = 'warning',
  confirmLabel,
  cancelLabel = 'Annuler',
  onConfirm,
  confirmVariant = 'primary',
  loading = false,
  loadingLabel,
}: ConfirmDialogProps) {
  const { Icon, className: iconClassName } = ICONS[icon];
  // Sans description, on le signale à Radix pour éviter son avertissement d'accessibilité.
  const describedBy = description ? {} : { 'aria-describedby': undefined };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <AlertDialogContent
        className="z-dialog max-w-dialog-sm gap-0 overflow-hidden rounded-lg border-border bg-white p-0 shadow-lg"
        {...describedBy}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <AlertDialogHeader className="flex-row items-start gap-3 space-y-0 px-6 pb-3 pt-5 text-left sm:text-left">
          <Icon
            className={cn('mt-0.5 shrink-0', iconClassName)}
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <AlertDialogTitle className="m-0 flex-1 text-lg font-semibold leading-6 text-navy-700">
            {title}
          </AlertDialogTitle>
        </AlertDialogHeader>
        {(description || children) && (
          <div className="flex flex-col gap-4 overflow-auto px-6 pb-5">
            {description && (
              <AlertDialogDescription className="m-0 text-sm text-foreground">
                {description}
              </AlertDialogDescription>
            )}
            {children}
          </div>
        )}
        <AlertDialogFooter className="flex-row justify-end gap-2 border-t border-neutral-200 bg-background px-6 py-4 sm:space-x-0">
          <AlertDialogCancel className="mt-0" disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({
              variant: confirmVariant === 'destructive' ? 'destructive' : 'default',
            })}
            aria-busy={loading || undefined}
            aria-disabled={loading || undefined}
            onClick={(event) => {
              // Empêche la fermeture automatique de Radix : c'est le parent qui ferme.
              event.preventDefault();
              if (!loading) onConfirm();
            }}
          >
            {loading && <Spinner label={null} />}
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
