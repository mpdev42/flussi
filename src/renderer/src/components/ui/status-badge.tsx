import { cva } from 'class-variance-authority';
import {
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  Clock,
  FlaskConical,
  Hourglass,
  Send,
  type LucideIcon,
} from 'lucide-react';

/** Tons des badges de statut (DESIGN.md §2.4, §2.5, §9.4). Autonome : ne dépend pas de ./badge. */
const statusBadge = cva(
  'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 align-middle font-sans text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-muted text-neutral-700',
        info: 'border-info-border bg-info-bg text-info-text',
        success: 'border-success-border bg-success-bg text-success-text',
        warning: 'border-warning-border bg-warning-bg text-warning-text',
        error: 'border-error-border bg-error-bg text-error-text',
        testenv:
          'border-testenv-border bg-testenv-bg font-semibold uppercase tracking-[0.04em] text-testenv-text',
      },
      solid: { true: '', false: '' },
    },
    compoundVariants: [
      {
        tone: 'success',
        solid: true,
        className: 'border-success-solid bg-success-solid text-success-on-solid',
      },
      {
        tone: 'warning',
        solid: true,
        className: 'border-warning-solid bg-warning-solid text-warning-on-solid',
      },
      {
        tone: 'error',
        solid: true,
        className: 'border-error-solid bg-error-solid text-error-on-solid',
      },
      {
        tone: 'info',
        solid: true,
        className: 'border-info-solid bg-info-solid text-info-on-solid',
      },
    ],
    defaultVariants: { tone: 'neutral', solid: false },
  },
);

export type FileStatus = 'du-jour' | 'ancien' | 'en-erreur' | 'depose' | 'valide' | 'en-attente';

const STATUS: Record<
  FileStatus,
  { tone: 'neutral' | 'info' | 'success' | 'warning' | 'error'; label: string; Icon: LucideIcon }
> = {
  'du-jour': { tone: 'success', label: 'Du jour', Icon: CalendarCheck },
  ancien: { tone: 'warning', label: 'Ancien', Icon: Clock },
  'en-erreur': { tone: 'error', label: 'En erreur', Icon: CircleAlert },
  depose: { tone: 'info', label: 'Déposé', Icon: Send },
  valide: { tone: 'success', label: 'Valide', Icon: CircleCheck },
  'en-attente': { tone: 'neutral', label: 'En attente', Icon: Hourglass },
};

export interface StatusBadgeProps {
  status: FileStatus;
  /** Remplace le libellé par défaut du statut. */
  label?: string;
  /** Remplissage plein : uniquement pour faire ressortir un statut dans un long tableau. */
  solid?: boolean;
}

/** Statut d'un fichier ou d'un traitement. Icône + mot : le statut ne dépend jamais de la couleur. */
export function StatusBadge({ status, label, solid }: StatusBadgeProps) {
  const { tone, label: defaultLabel, Icon } = STATUS[status];
  return (
    <span className={statusBadge({ tone, solid })}>
      <Icon className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />
      {label ?? defaultLabel}
    </span>
  );
}

/** Repère « Recette » de l'en-tête et des Paramètres. Le bandeau, lui, est EnvironmentBanner. */
export function EnvironmentBadge() {
  return (
    <span className={statusBadge({ tone: 'testenv' })}>
      <FlaskConical className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />
      Recette
    </span>
  );
}

const countBadge = cva(
  'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums',
  {
    variants: {
      tone: {
        error: 'bg-error-solid text-error-on-solid',
        warning: 'bg-warning-solid text-warning-on-solid',
        neutral: 'bg-neutral-200 text-foreground',
      },
    },
    defaultVariants: { tone: 'error' },
  },
);

export interface CountBadgeProps {
  count: number;
  /** Nom accessible, singulier puis pluriel. */
  noun?: [string, string];
  tone?: 'error' | 'warning' | 'neutral';
  /** Au-delà, affiche « 99+ » (le nombre exact reste lu par les lecteurs d'écran). */
  max?: number;
}

/** Nombre d'erreurs des onglets et nœuds d'arbre. Rien n'est rendu quand le nombre vaut 0. */
export function CountBadge({
  count,
  noun = ['erreur', 'erreurs'],
  tone = 'error',
  max = 99,
}: CountBadgeProps) {
  if (count <= 0) return null;
  const text = count > max ? `${max}+` : String(count);
  return (
    <span className={countBadge({ tone })}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{`${count} ${count > 1 ? noun[1] : noun[0]}`}</span>
    </span>
  );
}
