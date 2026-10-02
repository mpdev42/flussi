import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cx, ICON } from './utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  /** Second line under the label. */
  description?: React.ReactNode;
  /** Mixed state ("some lines selected"). */
  indeterminate?: boolean;
  invalid?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, indeterminate = false, invalid, disabled, className, ...rest },
  ref,
) {
  const inner = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => { if (inner.current) inner.current.indeterminate = indeterminate; }, [indeterminate]);
  const setRef = (el: HTMLInputElement | null) => {
    inner.current = el;
    if (typeof ref === 'function') ref(el); else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  const force = (rest as Record<string, unknown>)['data-force'] as string | undefined;
  const inputProps = { ...rest } as Record<string, unknown>;
  delete inputProps['data-force'];
  return (
    <label className={cx('fl-check', disabled && 'fl-check-disabled', className)} data-force={force}>
      <span className="fl-check-box">
        <input ref={setRef} type="checkbox" className="fl-check-input" disabled={disabled} aria-invalid={invalid || undefined} aria-checked={indeterminate ? 'mixed' : undefined} {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)} />
        {indeterminate
          ? <Minus className="fl-check-mark" size={ICON.sm - 2} strokeWidth={3} aria-hidden="true" />
          : <Check className="fl-check-mark" size={ICON.sm - 2} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className="fl-check-text">
        <span>{label}</span>
        {description && <span className="fl-check-desc">{description}</span>}
      </span>
    </label>
  );
});
