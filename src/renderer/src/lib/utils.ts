import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge ignore les tokens ajoutés à tailwind.config.js : sans déclaration, `text-body-sm`
 * est pris pour une couleur (et supprimé face à `text-neutral-700`), `shadow-focus` pour une
 * couleur d'ombre, et `z-dialog` ne remplace pas `z-50`. Tout nouveau token de taille de police,
 * d'ombre, de hauteur, de largeur, de largeur max, d'interlettrage, de z-index ou de mouvement doit
 * être déclaré ici. Les couleurs (`bg-header`, `text-on-brand`) sont reconnues sans déclaration.
 * `grid-cols-*` accepte toute valeur, déclaré quand même pour la lisibilité. Les utilitaires maison
 * de `index.css` (`scrollbar-fin`) n'appartiennent à aucun groupe : toujours conservés.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['body-sm', 'data'] }],
      tracking: [{ tracking: ['heading', 'caption'] }],
      shadow: [{ shadow: ['focus', 'focus-error', 'focus-dark'] }],
      h: [{ h: ['control-sm', 'control-md', 'control-lg'] }],
      w: [{ w: ['panel-log', 'panel-nav'] }],
      'grid-cols': [{ 'grid-cols': ['ac056'] }],
      'max-w': [{ 'max-w': ['content', 'dialog-sm', 'dialog-md', 'tooltip'] }],
      z: [{ z: ['sticky', 'header', 'banner', 'overlay', 'dialog', 'tooltip'] }],
      duration: [{ duration: ['fast', 'base', 'slow'] }],
      ease: [{ ease: ['standard', 'enter', 'exit'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
