/** Shared helpers for the Flussi components. */
import * as React from 'react';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Icon sizes in px — mirror the `icon-sm`, `icon-md`, `icon-lg` tokens. */
export const ICON = { sm: 14, md: 16, lg: 20 } as const;
/** Lucide stroke width used everywhere in Flussi. */
export const ICON_STROKE = 1.75;

let idCounter = 0;
/** Stable id for label/description wiring (React 18 has useId; this keeps the bundle tiny and SSR-agnostic). */
export function useFieldId(given?: string): string {
  const ref = React.useRef<string>();
  if (!ref.current) ref.current = given ?? `fl-${++idCounter}`;
  return given ?? ref.current;
}
