import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        // Tons de la charte (DESIGN.md §2.4) : jamais la couleur seule, toujours icône + mots.
        info: 'border-info-border bg-info-bg text-info-text [&>svg]:text-info-text',
        success: 'border-success-border bg-success-bg text-success-text [&>svg]:text-success-text',
        warning: 'border-warning-border bg-warning-bg text-warning-text [&>svg]:text-warning-text',
        error: 'border-error-border bg-error-bg text-error-text [&>svg]:text-error-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

/** Balise du titre d'alerte : un niveau de titre, ou `p` hors de la hiérarchie des titres. */
export type BaliseTitreAlerte = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Balise rendue, à choisir d'après la hiérarchie des titres de l'écran (pas de saut de niveau) ;
   * `p` pour une alerte hors de la zone principale (bandeau global). `h5` par défaut.
   */
  as?: BaliseTitreAlerte;
}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ as: Balise = 'h5', className, ...props }, ref) => (
    <Balise
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
