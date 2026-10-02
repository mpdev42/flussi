import * as React from 'react';
import { cx } from './utils';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: React.ReactNode;
  /** Words shown next to the track so the state never relies on colour. */
  onText?: string;
  offText?: string;
}

/** An immediate on/off setting (takes effect without "Enregistrer"). For a choice inside a form, use Checkbox. */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, label, onText = 'Activé', offText = 'Désactivé', className, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" role="switch" aria-checked={checked} disabled={disabled}
      className={cx('fl-switch', className)} onClick={() => onCheckedChange?.(!checked)} {...rest}>
      <span className="fl-switch-track" aria-hidden="true"><span className="fl-switch-thumb" /></span>
      <span>{label}</span>
      <span className="fl-switch-state" aria-hidden="true">{checked ? onText : offText}</span>
    </button>
  );
});
