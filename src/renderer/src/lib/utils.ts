import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge ignore les tokens ajoutés à tailwind.config.js : sans déclaration, `text-body-sm`
 * est pris pour une couleur (et supprimé face à `text-neutral-700`), `shadow-focus` pour une
 * couleur d'ombre, et `z-dialog` ne remplace pas `z-50`. Tout nouveau token de taille de police,
 * d'ombre, de hauteur, de largeur, de largeur max, d'interlettrage, de z-index ou de mouvement doit
 * être déclaré ici. Les couleurs (`bg-header`, `text-on-brand`) sont reconnues sans déclaration.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['body-sm', 'data'] }],
      tracking: [{ tracking: ['heading', 'caption'] }],
      shadow: [{ shadow: ['focus', 'focus-error', 'focus-dark'] }],
      h: [{ h: ['control-sm', 'control-md', 'control-lg'] }],
      w: [{ w: ['panel-log'] }],
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
