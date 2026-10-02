import * as React from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  options: SelectOption[];
  /** Première option vide (« Choisir… »), affichée quand la valeur vaut "". */
  placeholder?: string;
}

/**
 * <select> natif restylé : clavier, lecteurs d'écran et comportement Windows sans effort.
 * L'état d'erreur est piloté par `aria-invalid` (posé automatiquement par Field).
 * `className` s'applique au conteneur, pour que l'icône reste alignée sur le bord droit.
 */
export function Select({ options, placeholder, className, ...props }: SelectProps) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div className={cn('relative flex w-full items-center', className)}>
      <select
        {...props}
        className={cn(
          'h-control-md w-full cursor-pointer appearance-none rounded-md border border-input bg-white pl-3 pr-9 font-sans text-sm text-foreground',
          'transition-[border-color,box-shadow] duration-fast ease-standard motion-reduce:transition-none',
          'hover:border-neutral-500 focus:border-blue-500 focus:shadow-focus focus:outline-none',
          'disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-neutral-400',
          'aria-[invalid=true]:border-error-solid aria-[invalid=true]:focus:shadow-focus-error',
        )}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {invalid ? (
        <CircleAlert
          className="pointer-events-none absolute right-3 text-error-text"
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ) : (
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3',
            props.disabled ? 'text-neutral-400' : 'text-muted-foreground',
          )}
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
