import * as React from 'react';
import { CircleAlert } from 'lucide-react';
import { cx, ICON, ICON_STROKE } from './utils';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, disabled, className, ...rest },
  ref,
) {
  const force = (rest as Record<string, unknown>)['data-force'] as string | undefined;
  const inputProps = { ...rest } as Record<string, unknown>;
  delete inputProps['data-force'];
  return (
    <label className={cx('fl-check', 'fl-radio', disabled && 'fl-check-disabled', className)} data-force={force}>
      <span className="fl-check-box">
        <input ref={ref} type="radio" className="fl-check-input" disabled={disabled} {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)} />
      </span>
      <span className="fl-check-text">
        <span>{label}</span>
        {description && <span className="fl-check-desc">{description}</span>}
      </span>
    </label>
  );
});

export interface RadioGroupProps {
  /** Group label, rendered as the fieldset legend. */
  legend: React.ReactNode;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }>;
  /** Lay the options out on one line (2–3 short options). */
  inline?: boolean;
  disabled?: boolean;
  error?: React.ReactNode;
}

export function RadioGroup({ legend, name, value, onChange, options, inline, disabled, error }: RadioGroupProps) {
  return (
    <fieldset className={cx('fl-fieldset')} disabled={disabled} aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      <div className={cx('fl-fieldset', inline && 'fl-fieldset-row')}>
        {options.map((o) => (
          <Radio key={o.value} name={name} value={o.value} label={o.label} description={o.description}
            disabled={disabled || o.disabled} checked={value === undefined ? undefined : value === o.value}
            onChange={() => onChange?.(o.value)} />
        ))}
      </div>
      {error && (<p className="fl-error-msg"><CircleAlert className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" /><span>{error}</span></p>)}
    </fieldset>
  );
}
