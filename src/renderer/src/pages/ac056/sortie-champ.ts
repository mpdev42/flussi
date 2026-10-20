import { useCallback, useEffect, useRef } from 'react';

// Pourquoi différer la saisie à la souris : quand l'utilisateur quitte un champ en cliquant ailleurs,
// le `blur` part à l'appui (`mousedown`). Si la saisie est appliquée tout de suite, React re-rend
// avant le relâchement et la mise en page peut bouger (onglet dont le compteur disparaît, message
// sous le champ qui s'efface, badge qui change de largeur…) : le relâchement tombe alors sur un autre
// élément et le navigateur envoie le `click` à leur ancêtre commun, le clic de navigation est perdu.
// On applique donc la saisie au relâchement, une fois la cible du clic fixée, et avant que le `click`
// ne soit traité : React vide une mise à jour faite dans un écouteur natif `pointerup` (évènement
// discret) dans une microtâche, qui précède le `click`. Au clavier, la saisie est appliquée tout de suite.

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
  appliquer?.();
}

function surAppui(): void {
  pointeurEnfonce = true;
}

/** Relâchement, annulation du pointeur ou touche pressée (un relâchement perdu ne bloque jamais le clavier). */
function surRelachement(): void {
  pointeurEnfonce = false;
  for (const attente of [...attentes]) lancer(attente);
}

let abonnes = 0;

/** Écouteurs en capture sur `document`, installés par le premier champ et retirés par le dernier. */
function suivrePointeur(): () => void {
  if (abonnes === 0) {
    document.addEventListener('pointerdown', surAppui, true);
    document.addEventListener('pointerup', surRelachement, true);
    document.addEventListener('pointercancel', surRelachement, true);
    document.addEventListener('keydown', surRelachement, true);
  }
  abonnes += 1;
  return () => {
    abonnes -= 1;
    if (abonnes === 0) {
      document.removeEventListener('pointerdown', surAppui, true);
      document.removeEventListener('pointerup', surRelachement, true);
      document.removeEventListener('pointercancel', surRelachement, true);
      document.removeEventListener('keydown', surRelachement, true);
      pointeurEnfonce = false;
    }
  };
}

/**
 * Sortie d'un champ : renvoie `sortir(appliquer)`, à appeler au `blur`. Sans pointeur enfoncé
 * (Tab, Maj+Tab, autre sortie), `appliquer` est exécuté tout de suite ; sinon au relâchement (ou à
 * l'annulation du pointeur). Si le champ est démonté avant, la saisie en attente est appliquée au
 * démontage. Une saisie encore en attente passe toujours avant la suivante.
 */
export function useSortieChamp(): (appliquer: () => void) => void {
  const attente = useRef<Attente>({ appliquer: null });

  useEffect(() => {
    const cetteAttente = attente.current;
    const arreter = suivrePointeur();
    return () => {
      arreter();
      lancer(cetteAttente);
    };
  }, []);

  return useCallback((appliquer) => {
    lancer(attente.current);
    if (pointeurEnfonce) {
      attente.current.appliquer = appliquer;
      attentes.add(attente.current);
    } else {
      appliquer();
    }
  }, []);
}
