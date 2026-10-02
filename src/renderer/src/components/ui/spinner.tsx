import { cn } from '@/lib/utils';

export interface SpinnerProps {
  /** Taille en px : 14, 16 (défaut) ou 20. */
  size?: number;
  /** Libellé accessible. `null` quand le parent annonce déjà l'état (bouton occupé). */
  label?: string | null;
  /** Bleu de marque au lieu de la couleur courante. */
  brand?: boolean;
}

/** Indicateur d'attente : un tour en 800 ms, statique si l'utilisateur réduit les animations. */
export function Spinner({ size = 16, label = 'Chargement…', brand }: SpinnerProps) {
  const stroke = size >= 20 ? 2.5 : 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <svg
      className={cn(
        'inline-block shrink-0 animate-spin [animation-duration:800ms] motion-reduce:animate-none',
        brand && 'text-blue-500',
      )}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      <circle
        className="opacity-25"
        cx={center}
        cy={center}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.28} ${circumference}`}
      />
    </svg>
  );
}
