import type { ReactNode } from 'react';

export interface MiseEnPageJournalProps {
  titre: string;
  legende: ReactNode;
  /** Lien de retour, au-dessus du titre. */
  retour?: ReactNode;
  children: ReactNode;
}

/** Structure commune aux écrans du journal : (retour) + h1 + légende, puis le contenu. */
export function MiseEnPageJournal({ titre, legende, retour, children }: MiseEnPageJournalProps) {
  return (
    <div className="flex w-full flex-col gap-8 px-10 py-8">
      <div className="flex flex-col gap-2">
        {retour}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-navy-700">{titre}</h1>
          <p className="text-xs text-neutral-600">{legende}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
