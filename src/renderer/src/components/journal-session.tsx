import * as React from 'react';
import type { NiveauJournal } from '@shared/schemas/journal';
import type { LigneJournalSession } from '@shared/types/journal';

import { useJournalSession } from '@/hooks/use-journal-session';
import { LIBELLES_NIVEAU, PRESENTATION_NIVEAU } from '@/lib/niveaux-journal';
import { pluralize } from '@/lib/pluralize';
import { cn } from '@/lib/utils';

export interface JournalSessionProps {
  /** Lignes de la session en cours, de la plus ancienne à la plus récente. */
  lignes: readonly LigneJournalSession[];
}

/** Couleurs du niveau et du message (maquette `ac056.tsx`, `.fl-ac056-level-*`, `.fl-ac056-msg-*`). */
const CLASSES_NIVEAU: Record<NiveauJournal, { niveau: string; message: string }> = {
  TITRE: { niveau: 'font-semibold text-navy-700', message: 'font-semibold text-navy-700' },
  INFO: { niveau: 'text-neutral-600', message: 'text-neutral-600' },
  SUCCES: { niveau: 'text-success-text', message: 'text-success-text' },
  ERREUR: { niveau: 'text-error-text', message: 'font-medium text-error-text' },
};

/**
 * Distance au bas de la liste, en pixels, sous laquelle l'utilisateur est considéré en bas : le
 * défilement automatique reprend.
 */
const TOLERANCE_BAS = 8;

/** Une ligne : heure et niveau sur une ligne, message dessous (colonne étroite). */
const EntreeJournal = React.memo(function EntreeJournal({ ligne }: { ligne: LigneJournalSession }) {
  const { Icone } = PRESENTATION_NIVEAU[ligne.niveau];
  const classes = CLASSES_NIVEAU[ligne.niveau];
  return (
    <li className="px-4 py-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs tabular-nums text-neutral-600">{ligne.heure}</span>
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', classes.niveau)}>
          <Icone className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />
          {LIBELLES_NIVEAU[ligne.niveau]}
        </span>
      </div>
      <p
        className={cn(
          'm-0 whitespace-pre-wrap text-data [overflow-wrap:anywhere]',
          classes.message,
        )}
      >
        {ligne.message}
      </p>
    </li>
  );
});

/**
 * Panneau « Journal de la session » : lignes de la session en cours, la plus récente en bas. La
 * liste suit les nouvelles lignes, sauf si l'utilisateur est remonté (elle reprend quand il revient
 * en bas). Prévu pour la colonne du journal du cadre de l'application.
 */
export function JournalSession({ lignes }: JournalSessionProps) {
  const titreId = React.useId();
  const zone = React.useRef<HTMLDivElement>(null);
  const enBas = React.useRef(true);

  const surDefilement = React.useCallback(() => {
    const element = zone.current;
    if (!element) return;
    enBas.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <= TOLERANCE_BAS;
  }, []);

  React.useLayoutEffect(() => {
    const element = zone.current;
    if (element && enBas.current) element.scrollTop = element.scrollHeight;
  }, [lignes]);

  const nombre = lignes.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-neutral-200 px-4 py-3">
        <h2 id={titreId} className="m-0 text-base font-semibold text-navy-700">
          Journal de la session
        </h2>
        <span className="text-xs tracking-caption text-neutral-600">
          {nombre} {pluralize(nombre, 'ligne', 'lignes')}
        </span>
      </div>
      <div
        ref={zone}
        role="log"
        aria-live="polite"
        aria-labelledby={titreId}
        // Zone défilante atteignable au clavier, pour relire le journal sans souris
        tabIndex={0}
        onScroll={surDefilement}
        className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {nombre === 0 ? (
          <p className="m-0 px-4 py-3 text-body-sm text-neutral-600">
            Aucun évènement pour le moment.
          </p>
        ) : (
          <ol className="m-0 list-none py-2 pl-0">
            {lignes.map((ligne) => (
              <EntreeJournal key={ligne.rang} ligne={ligne} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/**
 * Panneau du journal abonné lui-même aux lignes de la session (`useJournalSession`) : une ligne
 * ajoutée ne re-rend que ce panneau, jamais l'application ni les écrans gardés montés. À monter une
 * seule fois, dans la colonne du journal du cadre.
 */
export function JournalSessionEnDirect() {
  const lignes = useJournalSession();
  return <JournalSession lignes={lignes} />;
}
