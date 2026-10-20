import * as React from 'react';
import { CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface TextInputProps extends React.ComponentPropsWithoutRef<'input'> {
  /** Valeur en IBM Plex Mono, chiffres tabulaires (codes, numéros, montants). */
  mono?: boolean;
  /**
   * Largeur du champ ajustée à ce nombre de caractères (marges, bordures et icône d'erreur
   * comprises), plafonnée à la largeur disponible. Prévu pour les codes courts en `mono` ; sans,
   * le champ prend toute la largeur.
   */
  largeurCaracteres?: number;
}

/**
 * Largeur ajoutée au texte : bordures (2 × 1px) et marges intérieures, 2 × 0,75rem (`px-3`), ou
 * 0,75rem + 2,25rem avec l'icône d'erreur (`pl-3 pr-9` : 16px d'icône et 0,5rem d'écart).
 */
const BORDURES = '2px';
const MARGES = '1.5rem';
const MARGES_AVEC_ICONE = '3rem';

/**
 * <input> natif aux couleurs de la charte (le composant shadcn `Input` garde ses valeurs par
 * défaut). L'état d'erreur est piloté par `aria-invalid` (posé par Field) : bordure `error-solid`,
 * fond blanc, icône à droite dans le champ, anneau de focus rouge (DESIGN.md §9.2). L'anneau de
 * focus suit `:focus-visible` (DESIGN.md §9.6) ; la bordure bleue du champ modifiable reste sur
 * `:focus`, repère de la saisie en cours quel que soit le moyen d'y arriver. En lecture
 * seule (`readOnly`), fond de page et bordure discrète, sans affordance de saisie au survol.
 * `className` s'applique au conteneur, pour que l'icône reste alignée sur le bord droit.
 * Correcteur orthographique désactivé par défaut (`spellCheck`) : son soulignement rouge se
 * confondrait avec le marquage des erreurs.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { mono, largeurCaracteres, className, type = 'text', spellCheck = false, ...props },
  ref,
) {
  const invalide = props['aria-invalid'] === true || props['aria-invalid'] === 'true';
  const lectureSeule = props.readOnly === true && !props.disabled;
  // Police posée aussi sur le conteneur : l'unité ch de la largeur y est mesurée
  const typographie = mono ? 'font-mono text-data tabular-nums' : 'font-sans text-sm';

  return (
    <div
      className={cn(
        'relative flex items-center',
        largeurCaracteres === undefined ? 'w-full' : 'max-w-full',
        typographie,
        className,
      )}
      style={
        largeurCaracteres === undefined
          ? undefined
          : {
              width: `calc(${largeurCaracteres}ch + ${BORDURES} + ${invalide ? MARGES_AVEC_ICONE : MARGES})`,
            }
      }
    >
      <input
        {...props}
        ref={ref}
        type={type}
        spellCheck={spellCheck}
        className={cn(
          'h-control-md w-full min-w-0 rounded-md border border-input bg-white pl-3 text-foreground placeholder:text-neutral-500',
          typographie,
          'transition-[border-color,box-shadow] duration-fast ease-standard motion-reduce:transition-none',
          'focus-visible:shadow-focus focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-neutral-400',
          invalide
            ? 'border-error-solid bg-white pr-9 focus-visible:shadow-focus-error'
            : lectureSeule
              ? 'border-border bg-neutral-50 pr-3'
              : 'pr-3 hover:border-neutral-500 focus:border-blue-500',
        )}
      />
      {invalide && (
        <CircleAlert
          className="pointer-events-none absolute right-3 text-error-text"
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
    </div>
  );
});
