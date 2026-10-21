import { useCallback, useEffect, useRef } from 'react';

// Pourquoi différer la saisie à la souris : quand l'utilisateur quitte un champ en cliquant ailleurs,
// le `blur` part à l'appui (`mousedown`). Si la saisie est appliquée tout de suite, React re-rend
// avant le relâchement et la mise en page peut bouger (onglet dont le compteur disparaît, message
// sous le champ qui s'efface, badge qui change de largeur…) : le relâchement tombe alors sur un autre
// élément et le navigateur envoie le `click` à leur ancêtre commun, le clic de navigation est perdu.
// On applique donc la saisie au relâchement, une fois la cible du clic fixée, et avant que le `click`
// ne soit traité : React vide une mise à jour faite dans un écouteur natif `pointerup` (évènement
// discret) dans une microtâche, qui précède le `click`. Au clavier, la saisie est appliquée tout de suite.
//
// Deux cas de perte de focus de la fenêtre (Alt+Tab, clic dans une autre application) :
// - le pointeur était enfoncé : le `pointerup` part dans l'autre fenêtre et n'arrive jamais. Le `blur`
//   de la fenêtre vaut relâchement, sinon la saisie resterait en attente ;
// - le champ perd le focus parce que la fenêtre le perd (`document.hasFocus()` est faux pendant son
//   `blur`) : ce n'est pas une sortie de champ (l'`OnExit` de Lazarus ne se déclenche pas quand
//   l'application perd la main). La saisie n'est pas appliquée et la frappe reste en cours ; elle le
//   sera à la vraie sortie du champ, après le retour dans la fenêtre.

/** Vrai tant qu'un bouton de pointeur est enfoncé. */
let pointeurEnfonce = false;

interface Attente {
  appliquer: (() => void) | null;
}

/** Sorties de champ qui attendent le relâchement du pointeur. */
const attentes = new Set<Attente>();

/** Applique la saisie en attente d'un champ, une seule fois. */
function lancer(attente: Attente): void {
  const { appliquer } = attente;
  attente.appliquer = null;
  attentes.delete(attente);
  try {
    appliquer?.();
  } catch {
    // Une exception ne doit ni empêcher les autres saisies en attente, ni remonter dans un écouteur
    // natif ou dans le nettoyage d'un effet (écran blanc). Ignorée en silence : `saisirChamp` est déjà
    // protégé par `useFichierAc056`, qui affiche un message générique sous le champ.
  }
}

function surAppui(): void {
  pointeurEnfonce = true;
}

/** Relâchement, annulation du pointeur, perte de focus de la fenêtre ou touche pressée. */
function surRelachement(): void {
  pointeurEnfonce = false;
  for (const attente of [...attentes]) lancer(attente);
}

/** Touches qui n'agissent qu'avec une autre (Maj+clic, Ctrl+clic) : elles ne valent pas relâchement. */
const TOUCHES_DE_MODIFICATION: ReadonlySet<string> = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'AltGraph',
  'CapsLock',
]);

/**
 * Une touche pressée vaut relâchement (un relâchement perdu ne bloque jamais le clavier), sauf la
 * répétition d'une touche tenue et les touches de modification seules.
 */
function surTouche(evenement: KeyboardEvent): void {
  if (evenement.repeat || TOUCHES_DE_MODIFICATION.has(evenement.key)) return;
  surRelachement();
}

let ecouteursInstalles = false;

/**
 * Écouteurs en capture sur `document` et sur `window`, installés une seule fois (au premier champ) et
 * jamais retirés : un changement de fiche démonte et remonte les champs sans toucher aux écouteurs.
 * Ils ne font rien tant qu'aucune saisie n'est en attente.
 */
function suivrePointeur(): void {
  if (ecouteursInstalles) return;
  ecouteursInstalles = true;
  document.addEventListener('pointerdown', surAppui, true);
  document.addEventListener('pointerup', surRelachement, true);
  document.addEventListener('pointercancel', surRelachement, true);
  document.addEventListener('keydown', surTouche, true);
  window.addEventListener('blur', surRelachement);
}

/**
 * Sortie d'un champ : renvoie `sortir(appliquer)`, à appeler au `blur`. Sans pointeur enfoncé
 * (Tab, Maj+Tab, autre sortie), `appliquer` est exécuté tout de suite ; sinon au relâchement (ou à
 * l'annulation du pointeur, ou à la perte de focus de la fenêtre). Si le champ est démonté avant, la
 * saisie en attente est appliquée au démontage. Une saisie encore en attente passe toujours avant la
 * suivante.
 *
 * Renvoie faux, sans rien faire, quand le champ ne perd le focus que parce que la fenêtre le perd :
 * l'appelant garde alors sa frappe en cours.
 */
export function useSortieChamp(): (appliquer: () => void) => boolean {
  const attente = useRef<Attente>({ appliquer: null });

  useEffect(() => {
    const cetteAttente = attente.current;
    suivrePointeur();
    return () => lancer(cetteAttente);
  }, []);

  return useCallback((appliquer) => {
    if (!document.hasFocus()) return false;
    lancer(attente.current);
    attente.current.appliquer = appliquer;
    if (pointeurEnfonce) attentes.add(attente.current);
    else lancer(attente.current);
    return true;
  }, []);
}
