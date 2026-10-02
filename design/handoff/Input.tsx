import * as React from 'react';
import { CircleAlert } from 'lucide-react';
import { cx, ICON, ICON_STROKE, useFieldId } from './utils';
import { FieldShell, FieldProps, describedBy } from './Field';

export interface InputProps extends FieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Monospaced, tabular variant for raw fixed-width values, codes and identifiers. */
  mono?: boolean;
  /** For `mono`: width of the field in characters (the record field length). Also sets maxLength. */
  chars?: number;
  size?: 'sm' | 'md';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { id: givenId, label, hint, error, required, disabled, monoHint, className, mono, chars, size = 'md', style, ...rest },
  ref,
) {
  const id = useFieldId(givenId);
  const width = mono && chars ? { width: `calc(${chars}ch + var(--space-3) * 2 + var(--border-width) * 2${error ? ' + var(--icon-md) + var(--space-2)' : ''})`, maxWidth: '100%' } : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} disabled={disabled} monoHint={monoHint ?? mono} className={className}>
      <div className="fl-control-wrap" style={width}>
        <input
          ref={ref}
          id={id}
          className={cx('fl-input', mono && 'fl-input-mono', size === 'sm' && 'fl-input-sm', !!error && 'fl-input-has-icon')}
          disabled={disabled}
          required={required}
          maxLength={mono && chars ? chars : undefined}
          spellCheck={mono ? false : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          style={style}
          {...rest}
        />
        {error && <CircleAlert className="fl-icon fl-input-status-icon" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />}
      </div>
    </FieldShell>
  );
});
