import * as React from 'react';
import { cx, useFieldId } from './utils';
import { FieldShell, FieldProps, describedBy } from './Field';

export interface TextareaProps extends FieldProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Monospaced variant (pasting raw lines of the file). */
  mono?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id: givenId, label, hint, error, required, disabled, monoHint, className, mono, ...rest },
  ref,
) {
  const id = useFieldId(givenId);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} disabled={disabled} monoHint={monoHint} className={className}>
      <textarea
        ref={ref}
        id={id}
        className={cx('fl-textarea', mono && 'fl-textarea-mono')}
        disabled={disabled}
        required={required}
        spellCheck={mono ? false : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
});
