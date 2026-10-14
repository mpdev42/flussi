import { Button } from '@/components/ui/button';

import { MOIS_JOURNAL, mettreMajuscule } from './format-journal';

export interface SelecteursPeriodeProps {
  /** Années proposées, de la plus ancienne à la plus récente. */
  annees: string[];
  annee: string;
  /** `01` à `12` */
  mois: string;
  onChoisirAnnee: (annee: string) => void;
  onChoisirMois: (mois: string) => void;
}

/** Une rangée de boutons d'années et une rangée des 12 mois, toujours affichés. */
export function SelecteursPeriode({
  annees,
  annee,
  mois,
  onChoisirAnnee,
  onChoisirMois,
}: SelecteursPeriodeProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-12 shrink-0 text-body-sm font-medium text-neutral-700"
        >
          Année
        </span>
        <div role="group" aria-label="Année" className="flex flex-wrap gap-1">
          {annees.map((valeur) => (
            <Button
              key={valeur}
              type="button"
              size="sm"
              variant={valeur === annee ? 'default' : 'outline'}
              aria-pressed={valeur === annee}
              onClick={() => onChoisirAnnee(valeur)}
            >
              {valeur}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-12 shrink-0 text-body-sm font-medium text-neutral-700"
        >
          Mois
        </span>
        <div role="group" aria-label="Mois" className="flex flex-wrap gap-1">
          {MOIS_JOURNAL.map((m) => (
            <Button
              key={m.valeur}
              type="button"
              size="sm"
              variant={m.valeur === mois ? 'default' : 'outline'}
              aria-pressed={m.valeur === mois}
              aria-label={mettreMajuscule(m.long)}
              onClick={() => onChoisirMois(m.valeur)}
            >
              {m.court}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
