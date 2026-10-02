import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx, ICON, ICON_STROKE, useFieldId } from './utils';
import { FieldShell, FieldProps, describedBy } from './Field';

export interface SelectOption { value: string; label: string; disabled?: boolean }

export interface SelectProps extends FieldProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  /** First, empty option ("Choisir…"). Shown when value is "". */
  placeholder?: string;
}

/** Native <select> (keyboard, screen readers and Windows behaviour for free), restyled. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id: givenId, label, hint, error, required, disabled, monoHint, className, options, placeholder, ...rest },
  ref,
) {
  const id = useFieldId(givenId);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} disabled={disabled} monoHint={monoHint} className={className}>
      <div className="fl-control-wrap">
        <select
          ref={ref}
          id={id}
          className={cx('fl-select')}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (<option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>))}
        </select>
        <ChevronDown className="fl-icon fl-select-chevron" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </div>
    </FieldShell>
  );
});
