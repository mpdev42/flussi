import * as React from 'react';
import { CircleAlert } from 'lucide-react';
import { cx, ICON, ICON_STROKE } from './utils';

export interface FieldProps {
  /** Visible label. Never replace it with a placeholder. */
  label?: React.ReactNode;
  /** Help text under the control (format, position in the record…). Hidden while an error is shown. */
  hint?: React.ReactNode;
  /** Error message: turns the control red, adds the icon, sets aria-invalid. Say what is wrong AND what is expected. */
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Render the hint in the monospaced face (positions, lengths). */
  monoHint?: boolean;
  className?: string;
}

interface FieldShellProps extends FieldProps {
  id: string;
  children: React.ReactNode;
  /** Tag used for the label (legend for groups). */
}

/** Shared label / hint / error frame used by Input, Textarea and Select. */
export function FieldShell({ id, label, hint, error, required, disabled, monoHint, className, children }: FieldShellProps) {
  return (
    <div className={cx('fl-field', disabled && 'fl-field-disabled', className)}>
      {label && (
        <label className="fl-label" htmlFor={id}>
          {label}
          {required && (<><span className="fl-label-required" aria-hidden="true">*</span><span className="fl-sr-only"> (obligatoire)</span></>)}
        </label>
      )}
      {children}
      {error ? (
        <p className="fl-error-msg" id={`${id}-error`}>
          <CircleAlert className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className={cx('fl-hint', monoHint && 'fl-hint-mono')} id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
