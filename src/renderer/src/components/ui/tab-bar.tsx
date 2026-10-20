import * as React from 'react';
import { CircleAlert } from 'lucide-react';

import { CountBadge } from '@/components/ui/status-badge';
import { idOngletTabBar } from '@/components/ui/tab-bar-ids';
import { cn } from '@/lib/utils';

/** Un onglet de la barre. */
export interface OngletTabBar {
  /**
   * Identifiant stable, unique dans la barre, sans espace : il sert à construire l'`id` du bouton
   * (`idOngletTabBar`), repris tel quel dans l'`aria-labelledby` du panneau (liste d'`id` séparés
   * par des espaces).
   */
  id: string;
  libelle: string;
  /** Nombre d'erreurs du contenu de l'onglet : au-dessus de 0, l'onglet est marqué en erreur. */
  compteur?: number;
  /** Onglet visible mais inaccessible (contenu absent), sauté au clavier. */
  desactive?: boolean;
  /** Libellé en IBM Plex Mono (codes courts : « 100 », « 400 »). */
  mono?: boolean;
}

export interface TabBarProps {
  onglets: readonly OngletTabBar[];
  /** Identifiant de l'onglet sélectionné. */
  actif: string;
  /** Appelé au clic et à chaque déplacement au clavier (activation automatique). */
  onChange: (id: string) => void;
  /** Nom accessible de la `tablist`. */
  ariaLabel: string;
  /**
   * `id` du `tabpanel` que la barre commande (`aria-controls` de chaque onglet), sans espace.
   * Chaque onglet porte l'`id` `idOngletTabBar(idPanneau, id)` (`tab-bar-ids.ts`) : le panneau
   * s'y réfère par `aria-labelledby`.
   */
  idPanneau: string;
  /** Nom accessible du compteur, singulier puis pluriel. */
  noun?: [string, string];
  /** Infobulle d'un onglet désactivé, visible au survol seulement (jamais lue, voir `TabBar`). */
  titreDesactive?: string;
  /** Mention lue par les lecteurs d'écran après le libellé d'un onglet désactivé. */
  mentionDesactive?: string;
  /** Classes du conteneur `tablist` (bordure, marges). */
  className?: string;
}

/**
 * Barre d'onglets accessible (motif ARIA « Tabs », activation automatique) : seul l'onglet actif
 * est atteint par Tab, les flèches gauche et droite passent à l'onglet voisin (en boucle), Début et
 * Fin au premier et au dernier ; les onglets désactivés sont sautés. Les onglets passent à la ligne,
 * jamais de défilement horizontal. Un onglet en erreur affiche icône, libellé rouge et compteur
 * (DESIGN.md §9.2) ; le lecteur d'écran entend « Bénéficiaires, 3 erreurs ».
 *
 * Le soulignement de 2 px des onglets déborde de 1 px vers le bas (`-mb-px`, comme `.fl-tab`) :
 * posé sur le filet de 1 px du conteneur (`border-b` passé par `className`), il le recouvre au
 * lieu de s'y ajouter.
 *
 * Onglet désactivé : la mention (`mentionDesactive`, masquée) fait partie du nom accessible,
 * « Garanties (entité absente) ». L'infobulle (`titreDesactive`) n'est pas posée sur le bouton,
 * où elle deviendrait sa description accessible et serait lue après la mention, mais sur une
 * enveloppe `role="none"` et `display: contents` : sans boîte ni place dans l'arbre
 * d'accessibilité (la `tablist` garde ses `tab` pour enfants), elle s'affiche quand même au survol
 * du bouton, le navigateur cherchant le `title` dans les ancêtres de l'élément survolé.
 */
export function TabBar({
  onglets,
  actif,
  onChange,
  ariaLabel,
  idPanneau,
  noun = ['erreur', 'erreurs'],
  titreDesactive = 'Entité absente de cet évènement',
  mentionDesactive = '(entité absente)',
  className,
}: TabBarProps) {
  const boutons = React.useRef(new Map<string, HTMLButtonElement>());
  const accessibles = onglets.filter((onglet) => !onglet.desactive);
  // Un seul onglet tabulable : l'actif, ou le premier accessible si l'actif est désactivé ou absent
  const tabulable = accessibles.some((onglet) => onglet.id === actif) ? actif : accessibles[0]?.id;

  const aller = (id: string) => {
    boutons.current.get(id)?.focus();
    if (id !== actif) onChange(id);
  };

  const surTouche = (evenement: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    const position = accessibles.findIndex((onglet) => onglet.id === id);
    if (position < 0 || accessibles.length === 0) return;
    const dernier = accessibles.length - 1;
    const cibles: Record<string, number> = {
      ArrowRight: position === dernier ? 0 : position + 1,
      ArrowLeft: position === 0 ? dernier : position - 1,
      Home: 0,
      End: dernier,
    };
    const cible = cibles[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    aller(accessibles[cible].id);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex flex-wrap gap-1', className)}>
      {onglets.map((onglet) => {
        const selectionne = onglet.id === actif;
        const compteur = onglet.compteur ?? 0;
        const enErreur = compteur > 0;
        const bouton = (
          <button
            key={onglet.id}
            ref={(element) => {
              if (element) boutons.current.set(onglet.id, element);
              else boutons.current.delete(onglet.id);
            }}
            type="button"
            role="tab"
            id={idOngletTabBar(idPanneau, onglet.id)}
            aria-selected={selectionne}
            aria-controls={idPanneau}
            tabIndex={onglet.id === tabulable ? 0 : -1}
            disabled={onglet.desactive}
            onClick={() => aller(onglet.id)}
            onKeyDown={(evenement) => surTouche(evenement, onglet.id)}
            className={cn(
              'inline-flex h-control-md items-center gap-2 whitespace-nowrap border-b-2 -mb-px px-2 font-sans text-sm font-medium',
              'transition-colors duration-fast ease-standard motion-reduce:transition-none',
              'focus-visible:rounded-t-md focus-visible:shadow-focus focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:text-neutral-400',
              selectionne ? 'border-blue-500' : 'border-transparent',
              enErreur
                ? 'text-error-text'
                : selectionne
                  ? 'text-navy-700'
                  : 'text-neutral-600 enabled:hover:text-foreground',
            )}
          >
            {enErreur && (
              <CircleAlert className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className={cn(onglet.mono && 'font-mono text-data tabular-nums')}>
              {onglet.libelle}
            </span>
            {enErreur && (
              <>
                <span className="sr-only">, </span>
                <CountBadge count={compteur} noun={noun} />
              </>
            )}
            {onglet.desactive && <span className="sr-only"> {mentionDesactive}</span>}
          </button>
        );
        if (!onglet.desactive) return bouton;
        return (
          <span key={onglet.id} role="none" title={titreDesactive} className="contents">
            {bouton}
          </span>
        );
      })}
    </div>
  );
}
