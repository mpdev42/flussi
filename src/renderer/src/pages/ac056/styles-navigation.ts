// Classes communes aux lignes sélectionnables de l'écran AC056 (évènements, bénéficiaires, éléments
// de liste), d'après DESIGN.md §9.1 (ligne sélectionnée : `selection-bg` + barre de 2 px) et §9.2
// (nœud en erreur : libellé `error-text` en medium). `selection-bg` = blue-100, `selection-border`
// = blue-500. La barre est une bordure gauche transparente quand la ligne n'est pas sélectionnée,
// pour que le texte ne bouge pas.

export const LIGNE_SELECTIONNABLE =
  'w-full cursor-pointer rounded-md border-l-2 border-transparent text-left transition-colors duration-fast motion-reduce:transition-none focus-visible:shadow-focus focus-visible:outline-none';

export function etatLigne(selectionnee: boolean, enErreur: boolean): string {
  return [
    selectionnee ? 'border-blue-500 bg-blue-100' : 'hover:bg-blue-50',
    enErreur ? 'font-medium text-error-text' : 'text-foreground',
  ].join(' ');
}
