/**
 * `id` du bouton d'un onglet de `TabBar` : `{idPanneau}-onglet-{id}`. Le `tabpanel` commandé par la
 * barre le reprend dans son `aria-labelledby`. Fichier sans composant, pour que l'écran l'importe
 * sans enfreindre la règle react-refresh (un fichier de composant n'exporte que des composants).
 */
export function idOngletTabBar(idPanneau: string, id: string): string {
  return `${idPanneau}-onglet-${id}`;
}
