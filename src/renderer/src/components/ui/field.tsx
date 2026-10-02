import * as React from 'react';
import { CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Attributs à poser sur le contrôle enfant (Input, Textarea, Select) pour le relier au libellé,
 * à l'aide et au message d'erreur du champ.
 */
export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
  disabled: boolean | undefined;
  required: boolean | undefined;
}

export interface FieldProps {
  /** Libellé visible. Ne jamais le remplacer par un placeholder. */
  label?: React.ReactNode;
  /** Aide sous le contrôle (format, position dans l'enregistrement…). Masquée tant qu'une erreur est affichée. */
  hint?: React.ReactNode;
  /** Message d'erreur : dire ce qui ne va pas ET ce qui est attendu. Active aria-invalid sur le contrôle. */
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Aide en police à chasse fixe (positions, longueurs). */
  monoHint?: boolean;
  /** Identifiant du contrôle ; généré par React.useId si absent. */
  id?: string;
  className?: string;
  /**
   * Render prop : reçoit les attributs de câblage (id, aria-invalid, aria-describedby, disabled,
   * required) à étaler sur le contrôle. Choix plus simple qu'un contexte : le lien est explicite
   * à l'appel et fonctionne avec n'importe quel contrôle natif ou shadcn.
   *
   * @example
   * <Field label="Code" hint="Positions 12 à 15" error={erreur}>
   *   {(control) => <Input {...control} value={code} onChange={…} />}
   * </Field>
   */
  children: (control: FieldControlProps) => React.ReactNode;
}

/** Cadre commun libellé / aide / erreur d'un champ de formulaire. */
export function Field({
  label,
  hint,
  error,
  required,
  disabled,
  monoHint,
  id: givenId,
  className,
  children,
}: FieldProps) {
  const generatedId = React.useId();
  const id = givenId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const control: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : hint ? hintId : undefined,
    disabled,
    required,
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-body-sm font-medium',
            disabled ? 'text-neutral-400' : 'text-neutral-700',
          )}
        >
          {label}
          {required && (
            <>
              <span className="ml-0.5 text-error-text" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (obligatoire)</span>
            </>
          )}
        </label>
      )}
      {children(control)}
      {error ? (
        <p
          id={errorId}
          className="m-0 flex items-start gap-1 text-body-sm font-medium text-error-text"
        >
          <CircleAlert
            className="mt-0.5 shrink-0"
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className={cn(
            'm-0 text-xs tracking-[0.01em] text-muted-foreground',
            monoHint && 'font-mono tabular-nums',
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
