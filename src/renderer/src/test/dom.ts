// Aides des tests jsdom du renderer (sans @testing-library). Jamais importées hors des tests.
// Importer ce module active l'environnement `act` de React pour le fichier de test.

import { act, createElement, useEffect, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Monture {
  conteneur: HTMLElement;
  /** Rend un autre élément dans la même racine (changement de props). */
  rerendre: (element: ReactElement) => Promise<void>;
  /** Démonte la racine, dans `act`. Sans effet si déjà démontée. */
  demonter: () => Promise<void>;
}

/** Monte un élément dans le document jsdom, dans `act`. Penser à `demonter()` en fin de test. */
export async function monter(element: ReactElement): Promise<Monture> {
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine: Root = createRoot(conteneur);
  let demontee = false;

  await act(async () => {
    racine.render(element);
  });

  return {
    conteneur,
    rerendre: async (suivant) => {
      await act(async () => {
        racine.render(suivant);
      });
    },
    demonter: async () => {
      if (!demontee) {
        demontee = true;
        await act(async () => {
          racine.unmount();
        });
      }
      conteneur.remove();
    },
  };
}

export interface MontureHook<T> extends Monture {
  /** Dernière valeur renvoyée par le hook (mise à jour après chaque rendu validé). */
  lire: () => T;
}

/** Monte un composant de test minimal qui appelle le hook et expose sa dernière valeur. */
export async function monterHook<T>(hook: () => T): Promise<MontureHook<T>> {
  const sonde: { valeur?: T } = {};
  function Sonde() {
    const valeur = hook();
    useEffect(() => {
      sonde.valeur = valeur;
    });
    return null;
  }
  const monture = await monter(createElement(Sonde));
  return { ...monture, lire: () => sonde.valeur as T };
}

/** Saisie dans un champ contrôlé par React : setter natif puis évènement `input` qui remonte. */
export async function saisir(champ: HTMLInputElement, valeur: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Setter natif de HTMLInputElement.value introuvable.');
  await act(async () => {
    setter.call(champ, valeur);
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export async function cliquer(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

/** Soumet un formulaire comme le fait le navigateur (évènement `submit` qui remonte). */
export async function soumettre(formulaire: HTMLFormElement): Promise<void> {
  await act(async () => {
    formulaire.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

/** Laisse les promesses en attente se résoudre, et les mises à jour React se valider. */
export async function vider(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export interface Differe<T> {
  promesse: Promise<T>;
  resoudre: (valeur: T) => void;
  rejeter: (cause: unknown) => void;
}

/** Promesse résolue ou rejetée à la main, pour tester l'état « en cours ». */
export function differe<T>(): Differe<T> {
  let resoudre!: (valeur: T) => void;
  let rejeter!: (cause: unknown) => void;
  const promesse = new Promise<T>((ok, ko) => {
    resoudre = ok;
    rejeter = ko;
  });
  return { promesse, resoudre, rejeter };
}
