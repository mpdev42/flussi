import * as React from 'react';
import { X, TriangleAlert, CircleAlert, Info } from 'lucide-react';
import { cx, ICON, ICON_STROKE, useFieldId } from './utils';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  /** Called on Escape, on the close button and on "Annuler". Not called on backdrop click (no accidental dismissal). */
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md';
  /** alertdialog: asks for a decision (confirmation). */
  role?: 'dialog' | 'alertdialog';
  icon?: 'warning' | 'error' | 'info';
  /** Hide the × button (confirmation dialogs keep it). */
  hideClose?: boolean;
  /** Ref of the element focused on open. Default: the dialog itself. */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Documentation only: render in the flow instead of fixed over the window. */
  inline?: boolean;
}

const ICONS = { warning: TriangleAlert, error: CircleAlert, info: Info };

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', role = 'dialog', icon, hideClose, initialFocusRef, inline }: DialogProps) {
  const id = useFieldId();
  const panel = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const target = initialFocusRef?.current ?? panel.current;
    if (!inline) target?.focus();
    return () => { if (!inline) previous?.focus?.(); };
  }, [open, inline, initialFocusRef]);
  if (!open) return null;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const Icon = icon ? ICONS[icon] : null;
  return (
    <div className={cx('fl-overlay', inline && 'fl-overlay-inline')}>
      <div ref={panel} className={cx('fl-dialog', size === 'sm' && 'fl-dialog-sm')} role={role} aria-modal="true"
        aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-desc` : undefined} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="fl-dialog-header">
          {Icon && <Icon className={cx('fl-icon', 'fl-dialog-header-icon', `fl-dialog-header-icon-${icon}`)} size={ICON.lg} strokeWidth={ICON_STROKE} aria-hidden="true" />}
          <h2 className="fl-dialog-title" id={`${id}-title`}>{title}</h2>
          {!hideClose && (
            <Button variant="ghost" size="sm" iconOnly aria-label="Fermer" className="fl-dialog-close" onClick={onClose}
              icon={<X className="fl-icon" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />} />
          )}
        </div>
        <div className="fl-dialog-body">
          {description && <p className="fl-dialog-desc" id={`${id}-desc`}>{description}</p>}
          {children}
        </div>
        {footer && <div className="fl-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps extends Omit<DialogProps, 'footer' | 'role' | 'initialFocusRef'> {
  /** Verb + object: "Déposer le fichier". Never "OK" / "Oui". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Use `destructive` when the action deletes or overwrites; `primary` for irreversible sends. */
  confirmVariant?: 'primary' | 'destructive';
  loading?: boolean;
  loadingLabel?: string;
}

/** Confirmation of an irreversible action. Focus starts on "Annuler" so Enter never confirms by accident. */
export function ConfirmDialog({ confirmLabel, cancelLabel = 'Annuler', onConfirm, confirmVariant = 'primary', loading, loadingLabel, onClose, icon = 'warning', size = 'sm', ...rest }: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  return (
    <Dialog {...rest} size={size} icon={icon} role="alertdialog" onClose={loading ? () => {} : onClose} initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
      footer={(
        <>
          <Button ref={cancelRef} variant="outline" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{loading ? (loadingLabel ?? confirmLabel) : confirmLabel}</Button>
        </>
      )} />
  );
}
