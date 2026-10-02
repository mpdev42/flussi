import * as React from 'react';

import { cn } from '@/lib/utils';

export interface DataListItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Valeur brute (code, identifiant, empreinte) : police à chasse fixe, sans reformatage. */
  mono?: boolean;
}

export interface DataListProps {
  items: DataListItem[];
}

/** Grille libellé / valeur pour des données en lecture seule. */
export function DataList({ items }: DataListProps) {
  return (
    <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <dt className="text-body-sm leading-5 text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'm-0 min-w-0 text-sm tabular-nums text-foreground [overflow-wrap:anywhere]',
              item.mono && 'font-mono text-data',
            )}
          >
            {item.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
