import * as React from 'react';
import { cx, ICON } from './utils';
import { Spinner } from './Loading';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the one main action of a view · secondary: supporting actions · outline: neutral actions in toolbars · ghost: low-emphasis, inside tables and cards · destructive: deletes or discards data. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon element shown before the label (a Lucide icon). */
  icon?: React.ReactNode;
  /** Icon shown after the label (e.g. a chevron). */
  iconAfter?: React.ReactNode;
  /** Shows a spinner in place of the icon, keeps the width, blocks clicks and sets aria-busy. Pass the in-progress label: "Enregistrement…", "Dépôt en cours…". */
  loading?: boolean;
  /** Icon-only button: children are ignored visually; `aria-label` is REQUIRED. */
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, iconAfter, loading = false, iconOnly = false, disabled, className, children, type = 'button', onClick, ...rest },
  ref,
) {
  const spinnerSize = size === 'lg' ? ICON.lg : size === 'sm' ? ICON.sm : ICON.md;
  return (
    <button
      ref={ref}
      type={type}
      className={cx('fl-btn', `fl-btn-${variant}`, size !== 'md' && `fl-btn-${size}`, iconOnly && 'fl-btn-icon-only', className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...rest}
    >
      {loading ? <Spinner size={spinnerSize} label={null} /> : icon}
      {iconOnly ? null : children}
      {!loading && iconAfter}
    </button>
  );
});
