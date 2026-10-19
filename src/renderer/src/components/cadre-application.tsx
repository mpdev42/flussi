import * as React from 'react';

import { EnvironmentBanner, type Environment } from '@/components/ui/environment-banner';
import { EnvironmentBadge } from '@/components/ui/status-badge';
import { ContexteVerrouNavigation, useEtatVerrouNavigation } from '@/components/verrou-navigation';
import { cn } from '@/lib/utils';

/** Entrée de la navigation principale de l'en-tête. */
export interface EntreeNavigation {
  id: string;
  libelle: string;
}

export interface CadreApplicationProps {
  /** Mode actif : la recette affiche le bandeau et le badge, la production reste neutre. */
  environnement: Environment;
  /** Version de l'application, affichée discrètement à droite de l'en-tête. */
  version: string;
  /** Entrées de la navigation principale, dans l'ordre d'affichage (peut être vide). */
  navigation: EntreeNavigation[];
  /** Identifiant de l'entrée active. */
  actif: string;
  onNaviguer: (id: string) => void;
  /**
   * Alerte globale et permanente, affichée sous l'en-tête sur tous les écrans, hors de la zone qui
   * défile, par exemple le bandeau "Journal non enregistré". Rien n'est rendu si absente.
   */
  alerte?: React.ReactNode;
  /**
   * Contenu de la colonne « Journal de la session », panneau à droite de l'écran courant sur tous
   * les écrans, avec son propre défilement. Rien n'est rendu si absent.
   */
  journal?: React.ReactNode;
  /** Écran courant. */
  children: React.ReactNode;
}

const LIBELLES_ENVIRONNEMENT: Record<Environment, string> = {
  recette: 'Recette',
  prod: 'Production',
};

/** false (motif `condition && <Element />`) est traité comme une absence : pas de conteneur vide. */
function estPresent(noeud: React.ReactNode): boolean {
  return noeud != null && typeof noeud !== 'boolean';
}

/**
 * Au changement d'écran : défilement remis en haut, focus sur le premier `h1` visible de la zone
 * principale (un écran gardé monté mais masqué par `hidden` est ignoré), sinon sur la zone
 * elle-même. Rien au premier rendu.
 */
function useFocusChangementEcran(actif: string): React.RefObject<HTMLElement | null> {
  const zone = React.useRef<HTMLElement>(null);
  const precedent = React.useRef(actif);

  React.useEffect(() => {
    if (precedent.current === actif) return;
    precedent.current = actif;
    const main = zone.current;
    if (!main) return;
    main.scrollTop = 0;
    const titre = Array.from(main.querySelectorAll('h1')).find((h1) => !h1.closest('[hidden]'));
    if (titre) {
      if (!titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1');
      titre.focus({ preventScroll: true });
    } else {
      main.focus({ preventScroll: true });
    }
  }, [actif]);

  return zone;
}

/**
 * Cadre commun à tous les écrans : bandeau Recette (rien en production), en-tête bleu marine avec
 * la navigation principale, alerte globale facultative, puis, sur toute la hauteur restante de la
 * fenêtre, l'écran courant et la colonne facultative du journal de la session.
 *
 * Fournit aux écrans le verrou de navigation (`useVerrouNavigation`).
 */
export function CadreApplication({
  environnement,
  version,
  navigation,
  actif,
  onNaviguer,
  alerte,
  journal,
  children,
}: CadreApplicationProps) {
  const { verrouillee, contexte } = useEtatVerrouNavigation();
  const zone = useFocusChangementEcran(actif);

  return (
    <ContexteVerrouNavigation.Provider value={contexte}>
      <div className="flex h-screen flex-col">
        <EnvironmentBanner environment={environnement} />
        <header className="z-header flex h-12 shrink-0 items-stretch gap-8 bg-header px-10 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-on-brand">Flussi</span>
            {environnement === 'recette' && <EnvironmentBadge />}
          </div>
          <nav aria-label="Navigation principale" className="flex items-stretch gap-1">
            {navigation.map((entree) => {
              const estActive = entree.id === actif;
              return (
                <button
                  key={entree.id}
                  type="button"
                  aria-current={estActive ? 'page' : undefined}
                  disabled={verrouillee}
                  onClick={() => onNaviguer(entree.id)}
                  className={cn(
                    'flex items-center border-b-2 px-4 pt-0.5 text-sm font-medium transition-colors duration-fast focus-visible:shadow-focus-dark focus-visible:outline-none disabled:cursor-not-allowed disabled:text-navy-300',
                    estActive
                      ? 'border-blue-300 bg-navy-800 text-on-brand'
                      : 'border-transparent text-navy-100 enabled:hover:bg-navy-800 enabled:hover:text-on-brand',
                  )}
                >
                  {entree.libelle}
                </button>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-body-sm text-navy-100">
            <span>Environnement : {LIBELLES_ENVIRONNEMENT[environnement]}</span>
            <span className="text-xs text-navy-100">Flussi {version}</span>
          </div>
        </header>
        {estPresent(alerte) && <div className="shrink-0">{alerte}</div>}
        <div className="flex min-h-0 flex-1 gap-4 bg-background">
          <main
            ref={zone}
            tabIndex={-1}
            className="min-h-0 min-w-0 flex-1 overflow-auto focus:outline-none [&_h1:focus]:outline-none"
          >
            {children}
          </main>
          {estPresent(journal) && (
            <aside
              aria-label="Journal de la session"
              className="my-4 mr-6 flex w-panel-log shrink-0 flex-col overflow-hidden rounded-lg border bg-card"
            >
              {journal}
            </aside>
          )}
        </div>
      </div>
    </ContexteVerrouNavigation.Provider>
  );
}
