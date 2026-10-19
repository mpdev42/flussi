/**
 * Flussi — Écran « Fichier AC056 » (charger, contrôler et corriger un fichier AC056 ; consulter les rejets MSP)
 * design/handoff/ac056.tsx — RÉFÉRENCE VISUELLE, pas une application. Jamais importé par l'app.
 *
 * Fichier autonome : React est le seul import. Icônes Lucide en SVG inline (makeIcon), styles = FLUSSI_CSS
 * (flussi-tokens.css + flussi.css du design system, recopiés tels quels) + EXTENSION_CSS (classes .fl-ac056-*).
 * Données fictives codées en dur ; aucune logique métier, aucun contrôle, aucune lecture ni écriture.
 *
 * ── Composants réutilisés (kit Flussi, même API que design/handoff et design/patterns) ──────────────────────
 *   Button (primary / secondary / outline / ghost / destructive, sm, loading), Spinner, Skeleton,
 *   OperationProgress, Badge, EnvironmentBadge, CountBadge, Alert, Card, EmptyState, EnvironmentBanner,
 *   AppHeader, AppFrame, ConfirmDialog (dialog-width-sm). Classes .fl-* existantes : .fl-tabs / .fl-tab /
 *   .fl-tab-error, .fl-tree / .fl-tree-node(-selected / -error), .fl-field / .fl-input(-mono) / .fl-error-msg,
 *   .fl-alert-*, .fl-badge-*, .fl-count, .fl-dialog-*, .fl-operation, .fl-type-* (h1, h6, caption, data-sm,
 *   data-strong).
 *   NB : AppFrame / AppHeader et la barre .fl-preview-* sont reconstruits ici d'après DESIGN.md §9.3 et le
 *   brief (parametres.tsx n'était pas joint) : à aligner sur parametres.tsx lors de l'intégration.
 *
 * ── Extensions (EXTENSION_CSS) ────────────────────────────────────────────────────────────────────────────
 *   Nouveaux tokens de taille, déclarés sur .fl-app (à reporter dans tokens.json) :
 *     --content-max-width   1600px  largeur max du contenu (repris de parametres.tsx)
 *     --panel-nav-width      344px  colonne gauche (évènements) ≥ 1440 px ; 328px en dessous
 *                                   (minimum pour dossier + n° + contrat + code + compteur sans troncature)
 *     --panel-errors-width   336px  colonne droite (récapitulatif) ≥ 1440 px ; 264px en dessous
 *     --log-panel-height     184px  journal déplié : ~7 lignes + en-tête
 *   À 1280 px la colonne centrale garde ~600 px ; sous 1440 px le formulaire passe de 2 à 1 colonne.
 *   Nouvelles classes : .fl-ac056-* (barre de fichier, colonnes, liste d'évènements, sous-listes, onglets
 *   qui passent à la ligne, formulaire, récapitulatif, choix de fichier, journal), .fl-app-header / .fl-app-nav,
 *   .fl-preview-* (barre d'états hors application). Toutes les valeurs sont des tokens existants.
 *   Aperçu uniquement : .fl-app .fl-overlay en position absolue pour que le voile reste dans le cadre.
 *
 * ── Décisions de design à standardiser ────────────────────────────────────────────────────────────────────
 *   • Badges de type : « VEOS » = Badge neutral + FileText ; « Rejet » = Badge warning + FileWarning
 *     (un rejet demande de l'attention sans être une erreur du fichier courant). Tons existants uniquement.
 *   • Marqueur « Modifié » : Badge neutral + PencilLine, juste après le badge de type.
 *   • Compteur de la barre : Badge error + CircleAlert (« 4 erreurs », « 3 lignes rejetées ») ;
 *     à zéro Badge success + CircleCheck « Aucune erreur ».
 *   • h1 unique : sans fichier ouvert, titre « Fichier AC056 » (style h1) ; fichier ouvert, le NOM DU FICHIER
 *     dans la barre de fichier, en style data-strong (valeur brute, jamais reformatée).
 *   • h2 : titres de colonnes (Évènements, Erreurs / Lignes rejetées) et titre de l'entité (« 400 · Bénéficiaire »).
 *   • Largeurs de colonnes : tokens ci-dessus ; les trois colonnes sont des panneaux (bordure border-default,
 *     radius-lg) qui défilent chacun ; la barre de fichier et les onglets d'entités restent en place.
 *   • Alerts d'écran (états 4, 5, 6, 8, 14, 15, 16) toujours entre la barre de fichier et les colonnes.
 *   • Bandeau « Journal non enregistré » : Alert error pleine largeur, sans rayon, sous l'en-tête.
 *   • « Enregistrer » désactivé (fichier mal formé) : raison écrite à sa gauche (CircleAlert + « Fichier mal formé »).
 *   • Onglets d'entités absentes : désactivés, texte text-disabled + infobulle « Entité absente de cet évènement ».
 *   • Lignes rejetées : même marquage que les erreurs (CircleAlert + CountBadge) dans la navigation et les onglets,
 *     mais aucun marquage de champ (tout est en lecture seule) ; l'explication est dans l'encadré MSP.
 *
 * ── Comportements décrits en commentaire (non codés) ──────────────────────────────────────────────────────
 *   • Contrôle d'un champ à la SORTIE du champ (Tab ou clic ailleurs), jamais à chaque frappe ; met à jour les
 *     marquages à tous les niveaux et le récapitulatif. Pas de saut automatique vers l'erreur suivante.
 *   • Clic sur une erreur : ouvre l'évènement, l'onglet, la sous-entité et met le focus sur le champ (ici : ligne
 *     sélectionnée + champ entouré du focus-ring-error). Anomalie sans champ : ouvre la ligne indiquée.
 *   • Quitter l'écran par la navigation puis revenir conserve fichier, sélection et modifications : pas de
 *     confirmation. Seul « Changer de fichier » demande « Abandonner les modifications ? ».
 *   • Messages des états 14 à 16 : restent affichés jusqu'à la prochaine action.
 *   • Fichier de rejet décodé en Windows-1252 (accents : « Réunion »).
 *   • Journal de session : jamais de valeur AC056 (ni nom, ni N° INSEE) ; uniquement fichiers, nombres, résultats.
 *   • Zones à garder rapides sur 5 500 lignes / centaines d'évènements : listes IN / OUT, liste d'évènements,
 *     sous-listes, récapitulatif des erreurs, journal (marquées dans le code).
 *   • Titre de la fenêtre inchangé (« Flussi — Recette » / « Flussi ») : le nom du fichier n'apparaît que dans la barre.
 *   • Emplacement réservé à droite d'« Enregistrer » pour « Déposer chez MSP » (version ultérieure), non dessiné.
 */
import * as React from 'react';

/* ============================================================================
 * FLUSSI_CSS — flussi-tokens.css + flussi.css du design system, recopiés tels quels
 * (sans les @font-face : IBM Plex est livrée avec l'application ; repli Segoe UI / Consolas).
 * ========================================================================== */
const FLUSSI_CSS = `
/* Flussi — design tokens as CSS custom properties. Generated from project/tokens.json: do not edit by hand. */


:root {
  /* colours */
  --white: #FFFFFF;
  --blue-50: #EEF6FC;
  --blue-100: #D5E9F7;
  --blue-200: #AAD2EE;
  --blue-300: #75B5E0;
  --blue-400: #3A95CF;
  --blue-500: #0077BD;
  --blue-600: #00649F;
  --blue-700: #005182;
  --blue-800: #003F65;
  --blue-900: #002D49;
  --navy-50: #EEF1F8;
  --navy-100: #D9E0EF;
  --navy-200: #B3C0DD;
  --navy-300: #8698C4;
  --navy-400: #5A71A9;
  --navy-500: #38528D;
  --navy-600: #233D77;
  --navy-700: #13295B;
  --navy-800: #0E1F46;
  --navy-900: #091431;
  --neutral-50: #F7F8FA;
  --neutral-100: #EEF0F3;
  --neutral-200: #E0E4E9;
  --neutral-300: #C9CFD7;
  --neutral-400: #858E9A;
  --neutral-500: #6A7380;
  --neutral-600: #525A66;
  --neutral-700: #3D444F;
  --neutral-800: #29303A;
  --neutral-900: #181D24;
  --success-bg: #EBF6EF;
  --success-border: #93CFA8;
  --success-text: #18663A;
  --success-solid: #1C7A44;
  --success-on-solid: #FFFFFF;
  --warning-bg: #FFF5DD;
  --warning-border: #EDC26A;
  --warning-text: #7F4E00;
  --warning-solid: #E8A317;
  --warning-on-solid: #181D24;
  --error-bg: #FDEDEC;
  --error-border: #EDA39E;
  --error-text: #B0241A;
  --error-solid: #B8261B;
  --error-on-solid: #FFFFFF;
  --info-bg: var(--navy-50);
  --info-border: var(--navy-200);
  --info-text: var(--navy-600);
  --info-solid: var(--navy-500);
  --info-on-solid: #FFFFFF;
  --error-solid-hover: #96201A;
  --testenv-solid: #6B1F9C;
  --testenv-stripe: #7A2DAC;
  --testenv-on-solid: #FFFFFF;
  --testenv-bg: #F5EEFA;
  --testenv-border: #C7A6DF;
  --testenv-text: #5E1C8A;
  --bg-page: var(--neutral-50);
  --bg-surface: var(--white);
  --bg-subtle: var(--neutral-100);
  --bg-header: var(--navy-700);
  --bg-overlay: #181D2466;
  --text-default: var(--neutral-900);
  --text-heading: var(--navy-700);
  --text-muted: var(--neutral-600);
  --text-label: var(--neutral-700);
  --text-placeholder: var(--neutral-500);
  --text-disabled: var(--neutral-400);
  --text-on-brand: var(--white);
  --border-subtle: var(--neutral-200);
  --border-default: var(--neutral-300);
  --border-control: var(--neutral-400);
  --border-control-hover: var(--neutral-500);
  --action-primary: var(--blue-500);
  --action-primary-hover: var(--blue-600);
  --action-primary-active: var(--blue-700);
  --link: var(--blue-600);
  --link-hover: var(--blue-700);
  --focus: var(--blue-500);
  --focus-on-dark: var(--blue-300);
  --selection-bg: var(--blue-100);
  --selection-border: var(--blue-500);
  /* font families */
  --font-sans: "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", Consolas, "Courier New", monospace;
  /* spacing */
  --space-half: 2px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  /* radius */
  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-full: 9999px;
  /* shadow */
  --shadow-xs: 0 1px 2px #13295B0F;
  --shadow-sm: 0 1px 2px #13295B0F, 0 1px 3px #13295B14;
  --shadow-md: 0 2px 4px #13295B0F, 0 6px 16px #13295B1F;
  --shadow-lg: 0 4px 8px #13295B14, 0 16px 40px #13295B33;
  --focus-ring: 0 0 0 2px #FFFFFF, 0 0 0 4px #0077BD;
  --focus-ring-error: 0 0 0 2px #FFFFFF, 0 0 0 4px #B8261B;
  --focus-ring-on-dark: 0 0 0 2px #13295B, 0 0 0 4px #75B5E0;
  /* fontSize */
  --fs-12: 12px;
  --fs-13: 13px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-18: 18px;
  --fs-20: 20px;
  --fs-24: 24px;
  /* lineHeight */
  --lh-16: 16px;
  --lh-18: 18px;
  --lh-20: 20px;
  --lh-24: 24px;
  --lh-28: 28px;
  --lh-32: 32px;
  /* fontWeight */
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  /* letterSpacing */
  --ls-tight: -0.01em;
  --ls-normal: 0em;
  --ls-caps: 0.04em;
  /* size */
  --control-sm: 28px;
  --control-md: 32px;
  --control-lg: 40px;
  --icon-sm: 14px;
  --icon-md: 16px;
  --icon-lg: 20px;
  --check-size: 16px;
  --switch-width: 32px;
  --switch-height: 18px;
  --border-width: 1px;
  --border-width-strong: 2px;
  --banner-height: 32px;
  --header-height: 48px;
  --dialog-width-sm: 440px;
  --dialog-width-md: 560px;
  --tooltip-max-width: 280px;
  --progress-height: 8px;
  /* duration */
  --duration-fast: 100ms;
  --duration-base: 150ms;
  --duration-slow: 200ms;
  --duration-spin: 800ms;
  --duration-pulse: 1600ms;
  --delay-tooltip: 400ms;
  /* easing */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-linear: linear;
  /* opacity */
  --opacity-track: 0.25;
  --opacity-divider: 0.5;
  /* zIndex */
  --z-sticky: 10;
  --z-header: 100;
  --z-banner: 110;
  --z-overlay: 1000;
  --z-dialog: 1010;
  --z-tooltip: 1100;
}

/* Type styles (prefixed so they never collide with app classes) */
.fl-type-h1 { font-family: var(--font-sans); font-size: 24px; line-height: 32px; font-weight: 600; letter-spacing: -0.01em; color: var(--text-heading); }
.fl-type-h2 { font-family: var(--font-sans); font-size: 20px; line-height: 28px; font-weight: 600; letter-spacing: -0.005em; color: var(--text-heading); }
.fl-type-h3 { font-family: var(--font-sans); font-size: 18px; line-height: 24px; font-weight: 600; letter-spacing: 0em; color: var(--text-heading); }
.fl-type-h4 { font-family: var(--font-sans); font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: 0em; color: var(--text-heading); }
.fl-type-h5 { font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0em; }
.fl-type-h6 { font-family: var(--font-sans); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); }
.fl-type-body { font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 400; letter-spacing: 0em; }
.fl-type-body-sm { font-family: var(--font-sans); font-size: 13px; line-height: 18px; font-weight: 400; letter-spacing: 0em; }
.fl-type-caption { font-family: var(--font-sans); font-size: 12px; line-height: 16px; font-weight: 400; letter-spacing: 0.01em; color: var(--text-muted); }
.fl-type-label { font-family: var(--font-sans); font-size: 13px; line-height: 18px; font-weight: 500; letter-spacing: 0em; color: var(--text-label); }
.fl-type-field-value { font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 400; letter-spacing: 0em; font-variant-numeric: tabular-nums; }
.fl-type-button { font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 500; letter-spacing: 0em; }
.fl-type-data { font-family: var(--font-mono); font-size: 13px; line-height: 20px; font-weight: 400; letter-spacing: 0em; font-variant-numeric: tabular-nums; }
.fl-type-data-sm { font-family: var(--font-mono); font-size: 12px; line-height: 16px; font-weight: 400; letter-spacing: 0em; font-variant-numeric: tabular-nums; }
.fl-type-data-strong { font-family: var(--font-mono); font-size: 13px; line-height: 20px; font-weight: 500; letter-spacing: 0em; font-variant-numeric: tabular-nums; }

/* Flussi — component styles. Every value is a token from flussi-tokens.css (DESIGN.md).
   Load order: flussi-tokens.css, then this file.
   [data-force="hover|focus|active"] reproduces an interactive state for documentation previews only. */

/* ---------- Base ---------- */
.fl-root, .fl-root * { box-sizing: border-box; }
.fl-root {
  font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20);
  color: var(--text-default); background: var(--bg-page);
  -webkit-font-smoothing: antialiased;
}
.fl-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.fl-icon { flex: none; display: block; }

/* ---------- Button ---------- */
.fl-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  height: var(--control-md); padding: 0 var(--space-4);
  font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20); font-weight: var(--fw-medium);
  border: var(--border-width) solid transparent; border-radius: var(--radius-md);
  cursor: pointer; white-space: nowrap; user-select: none; text-decoration: none;
  transition: background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard);
}
.fl-btn:focus-visible, .fl-btn[data-force="focus"] { outline: var(--border-width-strong) solid transparent; box-shadow: var(--focus-ring); }
.fl-btn-sm { height: var(--control-sm); padding: 0 var(--space-3); font-size: var(--fs-13); line-height: var(--lh-18); gap: var(--space-1); }
.fl-btn-lg { height: var(--control-lg); padding: 0 var(--space-5); font-size: var(--fs-16); line-height: var(--lh-24); }
.fl-btn-icon-only { padding: 0; width: var(--control-md); }
.fl-btn-sm.fl-btn-icon-only { width: var(--control-sm); }
.fl-btn-lg.fl-btn-icon-only { width: var(--control-lg); }

.fl-btn-primary { background: var(--action-primary); color: var(--text-on-brand); }
.fl-btn-primary:hover, .fl-btn-primary[data-force="hover"] { background: var(--action-primary-hover); }
.fl-btn-primary:active, .fl-btn-primary[data-force="active"] { background: var(--action-primary-active); }

.fl-btn-secondary { background: var(--navy-50); border-color: var(--navy-200); color: var(--navy-700); }
.fl-btn-secondary:hover, .fl-btn-secondary[data-force="hover"] { background: var(--navy-100); }
.fl-btn-secondary:active, .fl-btn-secondary[data-force="active"] { background: var(--navy-200); }

.fl-btn-outline { background: var(--bg-surface); border-color: var(--border-control); color: var(--text-default); }
.fl-btn-outline:hover, .fl-btn-outline[data-force="hover"] { background: var(--neutral-50); border-color: var(--border-control-hover); }
.fl-btn-outline:active, .fl-btn-outline[data-force="active"] { background: var(--neutral-100); }

.fl-btn-ghost { background: transparent; color: var(--link); }
.fl-btn-ghost:hover, .fl-btn-ghost[data-force="hover"] { background: var(--blue-50); color: var(--link-hover); }
.fl-btn-ghost:active, .fl-btn-ghost[data-force="active"] { background: var(--blue-100); color: var(--link-hover); }

.fl-btn-destructive { background: var(--error-solid); color: var(--error-on-solid); }
.fl-btn-destructive:hover, .fl-btn-destructive[data-force="hover"], .fl-btn-destructive:active { background: var(--error-solid-hover); }
.fl-btn-destructive:focus-visible, .fl-btn-destructive[data-force="focus"] { box-shadow: var(--focus-ring-error); }

.fl-btn:disabled, .fl-btn[aria-disabled="true"] {
  background: var(--bg-subtle); border-color: var(--border-subtle); color: var(--text-disabled); cursor: not-allowed;
}
.fl-btn-ghost:disabled, .fl-btn-ghost[aria-disabled="true"] { background: transparent; border-color: transparent; }
.fl-btn[aria-busy="true"] { cursor: progress; }
.fl-btn-primary[aria-busy="true"] { background: var(--action-primary-hover); color: var(--text-on-brand); border-color: transparent; }
.fl-btn-destructive[aria-busy="true"] { background: var(--error-solid-hover); color: var(--error-on-solid); border-color: transparent; }
.fl-btn-secondary[aria-busy="true"] { background: var(--navy-50); border-color: var(--navy-200); color: var(--navy-700); }
.fl-btn-outline[aria-busy="true"] { background: var(--bg-surface); border-color: var(--border-control); color: var(--text-default); }
.fl-btn-ghost[aria-busy="true"] { color: var(--link); }

/* ---------- Field (Input, Textarea, Select) ---------- */
.fl-field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.fl-label { font-size: var(--fs-13); line-height: var(--lh-18); font-weight: var(--fw-medium); color: var(--text-label); }
.fl-label-required { color: var(--error-text); margin-left: var(--space-half); }
.fl-field-disabled .fl-label { color: var(--text-disabled); }
.fl-hint { font-size: var(--fs-12); line-height: var(--lh-16); color: var(--text-muted); margin: 0; }
.fl-hint-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.fl-error-msg { display: flex; align-items: flex-start; gap: var(--space-1); margin: 0; font-size: var(--fs-13); line-height: var(--lh-18); font-weight: var(--fw-medium); color: var(--error-text); }
.fl-error-msg .fl-icon { margin-top: var(--space-half); }

.fl-control-wrap { position: relative; display: flex; align-items: center; }
.fl-input, .fl-textarea, .fl-select {
  width: 100%; margin: 0;
  font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default);
  background: var(--bg-surface); border: var(--border-width) solid var(--border-control); border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard);
}
.fl-input { height: var(--control-md); padding: 0 var(--space-3); }
.fl-input-sm { height: var(--control-sm); font-size: var(--fs-13); line-height: var(--lh-18); padding: 0 var(--space-2); }
.fl-textarea { min-height: calc(var(--lh-20) * 4 + var(--space-2) * 2); padding: var(--space-2) var(--space-3); resize: vertical; display: block; }
.fl-input::placeholder, .fl-textarea::placeholder { color: var(--text-placeholder); opacity: 1; }
.fl-input:hover, .fl-textarea:hover, .fl-select:hover,
.fl-input[data-force="hover"], .fl-textarea[data-force="hover"], .fl-select[data-force="hover"] { border-color: var(--border-control-hover); }
.fl-input:focus, .fl-textarea:focus, .fl-select:focus,
.fl-input[data-force="focus"], .fl-textarea[data-force="focus"], .fl-select[data-force="focus"] { outline: var(--border-width-strong) solid transparent; border-color: var(--focus); box-shadow: var(--focus-ring); }
.fl-input[aria-invalid="true"], .fl-textarea[aria-invalid="true"], .fl-select[aria-invalid="true"] { border-color: var(--error-solid); }
.fl-input[aria-invalid="true"]:focus, .fl-textarea[aria-invalid="true"]:focus, .fl-select[aria-invalid="true"]:focus,
.fl-input[aria-invalid="true"][data-force="focus"], .fl-textarea[aria-invalid="true"][data-force="focus"] { border-color: var(--error-solid); box-shadow: var(--focus-ring-error); }
.fl-input:disabled, .fl-textarea:disabled, .fl-select:disabled { background: var(--bg-subtle); border-color: var(--border-default); color: var(--text-disabled); cursor: not-allowed; }
.fl-input:read-only:not(:disabled), .fl-textarea:read-only:not(:disabled) { background: var(--bg-page); border-color: var(--border-default); }
.fl-input-mono, .fl-textarea-mono { font-family: var(--font-mono); font-size: var(--fs-13); font-variant-numeric: tabular-nums; letter-spacing: var(--ls-normal); }
.fl-input-has-icon { padding-right: calc(var(--space-3) + var(--icon-md) + var(--space-2)); }
.fl-input-status-icon { position: absolute; right: var(--space-3); color: var(--error-text); pointer-events: none; }

.fl-select { height: var(--control-md); padding: 0 calc(var(--space-3) + var(--icon-md) + var(--space-2)) 0 var(--space-3); appearance: none; -webkit-appearance: none; cursor: pointer; }
.fl-select-chevron { position: absolute; right: var(--space-3); color: var(--text-muted); pointer-events: none; }
.fl-select:disabled + .fl-select-chevron { color: var(--text-disabled); }

/* ---------- Checkbox & Radio ---------- */
.fl-check { display: inline-flex; align-items: flex-start; gap: var(--space-2); cursor: pointer; font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); }
.fl-check-box { position: relative; flex: none; width: var(--check-size); height: var(--check-size); margin-top: var(--space-half); }
.fl-check-input {
  appearance: none; -webkit-appearance: none; margin: 0; width: var(--check-size); height: var(--check-size); display: block; cursor: inherit;
  background: var(--bg-surface); border: var(--border-width) solid var(--border-control); border-radius: var(--radius-sm);
  transition: background-color var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard);
}
.fl-radio .fl-check-input { border-radius: var(--radius-full); }
.fl-check:hover .fl-check-input, .fl-check[data-force="hover"] .fl-check-input { border-color: var(--border-control-hover); }
.fl-check-input:focus-visible, .fl-check[data-force="focus"] .fl-check-input { outline: var(--border-width-strong) solid transparent; box-shadow: var(--focus-ring); }
.fl-check-input:checked, .fl-check-input[type="checkbox"]:indeterminate { background: var(--action-primary); border-color: var(--action-primary); }
.fl-check:hover .fl-check-input:checked, .fl-check[data-force="hover"] .fl-check-input:checked { background: var(--action-primary-hover); border-color: var(--action-primary-hover); }
.fl-radio .fl-check-input:checked { background: var(--bg-surface); border: calc(var(--check-size) / 2 - var(--space-1) / 2 - var(--space-half)) solid var(--action-primary); }
.fl-check-mark { position: absolute; inset: 0; margin: auto; color: var(--text-on-brand); pointer-events: none; opacity: 0; }
.fl-check-input:checked + .fl-check-mark, .fl-check-input[type="checkbox"]:indeterminate + .fl-check-mark { opacity: 1; }
.fl-check-input[aria-invalid="true"] { border-color: var(--error-solid); }
.fl-check-input:disabled { background: var(--bg-subtle); border-color: var(--border-default); }
.fl-check-input:disabled:checked, .fl-check-input[type="checkbox"]:disabled:indeterminate { background: var(--neutral-300); border-color: var(--neutral-300); }
.fl-radio .fl-check-input:disabled:checked { background: var(--bg-subtle); border-color: var(--neutral-300); }
.fl-check-disabled { cursor: not-allowed; color: var(--text-disabled); }
.fl-check-text { display: flex; flex-direction: column; }
.fl-check-desc { font-size: var(--fs-12); line-height: var(--lh-16); color: var(--text-muted); }
.fl-check-disabled .fl-check-desc { color: var(--text-disabled); }
.fl-fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.fl-fieldset legend { padding: 0; margin-bottom: var(--space-2); font-size: var(--fs-13); line-height: var(--lh-18); font-weight: var(--fw-medium); color: var(--text-label); }
.fl-fieldset-row { flex-direction: row; flex-wrap: wrap; gap: var(--space-2) var(--space-6); }

/* ---------- Switch ---------- */
.fl-switch { display: inline-flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); background: none; border: 0; padding: 0; font-family: var(--font-sans); text-align: left; }
.fl-switch-track {
  position: relative; flex: none; width: var(--switch-width); height: var(--switch-height);
  background: var(--border-control); border-radius: var(--radius-full);
  transition: background-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard);
}
.fl-switch-thumb {
  position: absolute; top: var(--space-half); left: var(--space-half);
  width: calc(var(--switch-height) - var(--space-1)); height: calc(var(--switch-height) - var(--space-1));
  background: var(--bg-surface); border-radius: var(--radius-full); box-shadow: var(--shadow-xs);
  transition: transform var(--duration-base) var(--ease-standard);
}
.fl-switch:hover .fl-switch-track, .fl-switch[data-force="hover"] .fl-switch-track { background: var(--border-control-hover); }
.fl-switch[aria-checked="true"] .fl-switch-track { background: var(--action-primary); }
.fl-switch[aria-checked="true"]:hover .fl-switch-track, .fl-switch[aria-checked="true"][data-force="hover"] .fl-switch-track { background: var(--action-primary-hover); }
.fl-switch[aria-checked="true"] .fl-switch-thumb { transform: translateX(calc(var(--switch-width) - var(--switch-height))); }
.fl-switch:focus-visible { outline: none; }
.fl-switch:focus-visible .fl-switch-track, .fl-switch[data-force="focus"] .fl-switch-track { box-shadow: var(--focus-ring); }
.fl-switch:disabled { cursor: not-allowed; color: var(--text-disabled); }
.fl-switch:disabled .fl-switch-track { background: var(--neutral-200); }
.fl-switch:disabled[aria-checked="true"] .fl-switch-track { background: var(--neutral-300); }
.fl-switch-state { font-size: var(--fs-13); line-height: var(--lh-18); color: var(--text-muted); min-width: 9ch; }
.fl-switch:disabled .fl-switch-state { color: var(--text-disabled); }

/* ---------- Card ---------- */
.fl-card { background: var(--bg-surface); border: var(--border-width) solid var(--border-default); border-radius: var(--radius-lg); display: flex; flex-direction: column; min-width: 0; }
.fl-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) var(--space-5); border-bottom: var(--border-width) solid var(--border-subtle); }
.fl-card-titles { display: flex; flex-direction: column; gap: var(--space-half); min-width: 0; }
.fl-card-title { margin: 0; font-size: var(--fs-16); line-height: var(--lh-24); font-weight: var(--fw-semibold); color: var(--text-heading); display: flex; align-items: center; gap: var(--space-2); }
.fl-card-desc { margin: 0; font-size: var(--fs-13); line-height: var(--lh-18); color: var(--text-muted); }
.fl-card-actions { display: flex; gap: var(--space-2); flex: none; }
.fl-card-body { padding: var(--space-5); }
.fl-card-body-flush { padding: 0; }
.fl-card-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-5); border-top: var(--border-width) solid var(--border-subtle); background: var(--bg-page); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
.fl-card-interactive { cursor: pointer; transition: border-color var(--duration-fast) var(--ease-standard); }
.fl-card-interactive:hover, .fl-card-interactive[data-force="hover"] { border-color: var(--border-control-hover); }
.fl-card-interactive:focus-visible, .fl-card-interactive[data-force="focus"] { outline: var(--border-width-strong) solid transparent; box-shadow: var(--focus-ring); }
.fl-card-selected { border-color: var(--selection-border); box-shadow: inset 0 0 0 var(--border-width) var(--selection-border); }

/* Label / value grid used inside cards */
.fl-dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-6); margin: 0; }
.fl-dl dt { font-size: var(--fs-13); line-height: var(--lh-20); color: var(--text-muted); }
.fl-dl dd { margin: 0; font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); font-variant-numeric: tabular-nums; min-width: 0; overflow-wrap: anywhere; }
.fl-mono { font-family: var(--font-mono); font-size: var(--fs-13); font-variant-numeric: tabular-nums; }

/* ---------- Dialog ---------- */
.fl-overlay {
  position: fixed; inset: 0; z-index: var(--z-overlay); background: var(--bg-overlay);
  display: flex; align-items: center; justify-content: center; padding: var(--space-6);
  animation: fl-fade-in var(--duration-slow) var(--ease-enter);
}
.fl-overlay-inline { position: relative; inset: auto; min-height: 100vh; }
.fl-dialog {
  position: relative; z-index: var(--z-dialog); width: 100%; max-width: var(--dialog-width-md); max-height: calc(100vh - var(--space-12));
  display: flex; flex-direction: column; background: var(--bg-surface);
  border: var(--border-width) solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  animation: fl-dialog-in var(--duration-slow) var(--ease-enter);
}
.fl-dialog:focus { outline: none; }
.fl-dialog-sm { max-width: var(--dialog-width-sm); }
.fl-dialog-header { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-5) var(--space-6) var(--space-3); }
.fl-dialog-header-icon { margin-top: var(--space-half); }
.fl-dialog-header-icon-warning { color: var(--warning-text); }
.fl-dialog-header-icon-error { color: var(--error-text); }
.fl-dialog-header-icon-info { color: var(--info-text); }
.fl-dialog-title { margin: 0; flex: 1; font-size: var(--fs-18); line-height: var(--lh-24); font-weight: var(--fw-semibold); color: var(--text-heading); }
.fl-dialog-close { margin: calc(var(--space-1) * -1) calc(var(--space-2) * -1) 0 0; color: var(--text-muted); }
.fl-dialog-body { padding: 0 var(--space-6) var(--space-5); overflow: auto; display: flex; flex-direction: column; gap: var(--space-4); }
.fl-dialog-desc { margin: 0; color: var(--text-default); }
.fl-dialog-footer { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-6); border-top: var(--border-width) solid var(--border-subtle); background: var(--bg-page); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
.fl-dialog-summary { background: var(--bg-page); border: var(--border-width) solid var(--border-subtle); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); }
@keyframes fl-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fl-dialog-in { from { opacity: 0; transform: translateY(var(--space-2)); } to { opacity: 1; transform: none; } }

/* ---------- Alert ---------- */
.fl-alert { display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: var(--border-width) solid; border-radius: var(--radius-md); font-size: var(--fs-14); line-height: var(--lh-20); }
.fl-alert-icon { margin-top: var(--space-half); }
.fl-alert-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.fl-alert-title { margin: 0; font-size: var(--fs-14); line-height: var(--lh-20); font-weight: var(--fw-semibold); }
.fl-alert-desc { margin: 0; color: var(--text-default); }
.fl-alert-actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
.fl-alert-dismiss { margin: calc(var(--space-1) * -1) calc(var(--space-2) * -1) 0 0; color: var(--text-muted); }
.fl-alert-info { background: var(--info-bg); border-color: var(--info-border); }
.fl-alert-info .fl-alert-icon, .fl-alert-info .fl-alert-title { color: var(--info-text); }
.fl-alert-success { background: var(--success-bg); border-color: var(--success-border); }
.fl-alert-success .fl-alert-icon, .fl-alert-success .fl-alert-title { color: var(--success-text); }
.fl-alert-warning { background: var(--warning-bg); border-color: var(--warning-border); }
.fl-alert-warning .fl-alert-icon, .fl-alert-warning .fl-alert-title { color: var(--warning-text); }
.fl-alert-error { background: var(--error-bg); border-color: var(--error-border); }
.fl-alert-error .fl-alert-icon, .fl-alert-error .fl-alert-title { color: var(--error-text); }

/* ---------- Badge ---------- */
.fl-badge {
  display: inline-flex; align-items: center; gap: var(--space-1); max-width: 100%;
  padding: var(--space-half) var(--space-2); border: var(--border-width) solid; border-radius: var(--radius-md);
  font-family: var(--font-sans); font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-medium); white-space: nowrap; vertical-align: middle;
}
.fl-badge-neutral { background: var(--bg-subtle); border-color: var(--border-default); color: var(--text-label); }
.fl-badge-brand { background: var(--blue-50); border-color: var(--blue-200); color: var(--blue-700); }
.fl-badge-info { background: var(--info-bg); border-color: var(--info-border); color: var(--info-text); }
.fl-badge-success { background: var(--success-bg); border-color: var(--success-border); color: var(--success-text); }
.fl-badge-warning { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }
.fl-badge-error { background: var(--error-bg); border-color: var(--error-border); color: var(--error-text); }
.fl-badge-testenv { background: var(--testenv-bg); border-color: var(--testenv-border); color: var(--testenv-text); text-transform: uppercase; letter-spacing: var(--ls-caps); font-weight: var(--fw-semibold); }
.fl-badge-solid.fl-badge-error { background: var(--error-solid); border-color: var(--error-solid); color: var(--error-on-solid); }
.fl-badge-solid.fl-badge-success { background: var(--success-solid); border-color: var(--success-solid); color: var(--success-on-solid); }
.fl-badge-solid.fl-badge-warning { background: var(--warning-solid); border-color: var(--warning-solid); color: var(--warning-on-solid); }
.fl-badge-solid.fl-badge-info { background: var(--info-solid); border-color: var(--info-solid); color: var(--info-on-solid); }
.fl-badge-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

.fl-count {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-half);
  min-width: var(--switch-height); height: var(--switch-height); padding: 0 var(--space-1);
  border-radius: var(--radius-full); font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-semibold); font-variant-numeric: tabular-nums;
  background: var(--error-solid); color: var(--error-on-solid);
}
.fl-count-warning { background: var(--warning-solid); color: var(--warning-on-solid); }
.fl-count-neutral { background: var(--neutral-200); color: var(--text-default); }

/* ---------- Tabs & tree error flags (patterns used with CountBadge) ---------- */
.fl-tabs { display: flex; gap: var(--space-1); border-bottom: var(--border-width) solid var(--border-default); }
.fl-tab {
  display: inline-flex; align-items: center; gap: var(--space-2); height: var(--control-lg); padding: 0 var(--space-3);
  background: none; border: 0; border-bottom: var(--border-width-strong) solid transparent; margin-bottom: calc(var(--border-width) * -1);
  font-family: var(--font-sans); font-size: var(--fs-14); font-weight: var(--fw-medium); color: var(--text-muted); cursor: pointer;
}
.fl-tab:hover { color: var(--text-default); }
.fl-tab[aria-selected="true"] { color: var(--text-heading); border-bottom-color: var(--selection-border); }
.fl-tab:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-md) var(--radius-md) 0 0; }
.fl-tab-error { color: var(--error-text); }
.fl-tree { list-style: none; margin: 0; padding: 0; font-size: var(--fs-14); line-height: var(--lh-20); }
.fl-tree-node { display: flex; align-items: center; gap: var(--space-2); height: var(--control-md); padding: 0 var(--space-2); border-radius: var(--radius-md); color: var(--text-default); }
.fl-tree-node-selected { background: var(--selection-bg); box-shadow: inset var(--border-width-strong) 0 0 var(--selection-border); }
.fl-tree-node-error { color: var(--error-text); font-weight: var(--fw-medium); }
.fl-tree-node .fl-count { margin-left: auto; }

/* ---------- Tooltip ---------- */
.fl-tooltip-anchor { position: relative; display: inline-flex; }
.fl-tooltip {
  position: absolute; z-index: var(--z-tooltip); left: 50%; transform: translateX(-50%);
  width: max-content; max-width: var(--tooltip-max-width); padding: var(--space-1) var(--space-2);
  background: var(--neutral-900); color: var(--white); border-radius: var(--radius-md); box-shadow: var(--shadow-md);
  font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-regular); text-align: left; white-space: normal; pointer-events: none;
  animation: fl-fade-in var(--duration-base) var(--ease-enter);
}
.fl-tooltip-top { bottom: calc(100% + var(--space-2)); }
.fl-tooltip-bottom { top: calc(100% + var(--space-2)); }
.fl-tooltip-start { left: 0; transform: none; }
.fl-tooltip-kbd { font-family: var(--font-mono); color: var(--neutral-300); margin-left: var(--space-1); }

/* ---------- Loading ---------- */
.fl-spinner { flex: none; display: inline-block; color: currentColor; animation: fl-spin var(--duration-spin) var(--ease-linear) infinite; }
.fl-spinner-track { stroke: currentColor; opacity: var(--opacity-track); }
.fl-spinner-arc { stroke: currentColor; }
.fl-spinner-brand { color: var(--action-primary); }
@keyframes fl-spin { to { transform: rotate(360deg); } }

.fl-skeleton { display: block; background: var(--neutral-200); border-radius: var(--radius-sm); animation: fl-pulse var(--duration-pulse) var(--ease-standard) infinite; }
.fl-skeleton-text { height: var(--fs-14); margin: var(--space-1) 0; }
.fl-skeleton-circle { border-radius: var(--radius-full); }
@keyframes fl-pulse { 0%, 100% { background: var(--neutral-200); } 50% { background: var(--neutral-100); } }

.fl-progress { position: relative; height: var(--progress-height); background: var(--neutral-200); border-radius: var(--radius-full); overflow: hidden; }
.fl-progress-fill { height: 100%; background: var(--action-primary); border-radius: var(--radius-full); transition: width var(--duration-slow) var(--ease-standard); }
.fl-progress-error .fl-progress-fill { background: var(--error-solid); }
.fl-progress-success .fl-progress-fill { background: var(--success-solid); }
.fl-progress-indeterminate .fl-progress-fill { width: 40%; position: absolute; animation: fl-indeterminate var(--duration-pulse) var(--ease-standard) infinite; }
@keyframes fl-indeterminate { from { left: -40%; } to { left: 100%; } }

.fl-operation { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-5); background: var(--bg-surface); border: var(--border-width) solid var(--border-default); border-radius: var(--radius-lg); }
.fl-operation-head { display: flex; align-items: center; gap: var(--space-3); }
.fl-operation-title { margin: 0; flex: 1; font-size: var(--fs-14); line-height: var(--lh-20); font-weight: var(--fw-semibold); color: var(--text-heading); }
.fl-operation-icon-success { color: var(--success-text); }
.fl-operation-icon-error { color: var(--error-text); }
.fl-operation-pct { font-family: var(--font-mono); font-size: var(--fs-13); font-variant-numeric: tabular-nums; color: var(--text-default); }
.fl-operation-meta { display: flex; justify-content: space-between; gap: var(--space-4); font-size: var(--fs-12); line-height: var(--lh-16); color: var(--text-muted); font-variant-numeric: tabular-nums; }
.fl-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--fs-13); line-height: var(--lh-20); }
.fl-step { display: flex; align-items: center; gap: var(--space-2); color: var(--text-muted); }
.fl-step-done { color: var(--text-default); }
.fl-step-done .fl-icon { color: var(--success-text); }
.fl-step-current { color: var(--text-default); font-weight: var(--fw-medium); }
.fl-step-current .fl-spinner { color: var(--action-primary); }
.fl-step-error { color: var(--error-text); font-weight: var(--fw-medium); }
.fl-step-status { margin-left: auto; font-size: var(--fs-12); color: var(--text-muted); }

/* ---------- Environment banner ---------- */
.fl-env-banner {
  position: sticky; top: 0; z-index: var(--z-banner);
  display: flex; align-items: center; justify-content: center; gap: var(--space-2);
  height: var(--banner-height); padding: 0 var(--space-4);
  background: repeating-linear-gradient(-45deg, var(--testenv-solid) 0 var(--space-2), var(--testenv-stripe) var(--space-2) var(--space-4));
  color: var(--testenv-on-solid); font-size: var(--fs-13); line-height: var(--lh-18);
}
.fl-env-banner-label { font-weight: var(--fw-semibold); text-transform: uppercase; letter-spacing: var(--ls-caps); }
.fl-env-banner-sep { width: var(--border-width); height: var(--space-4); background: var(--testenv-on-solid); opacity: var(--opacity-divider); }

@media (prefers-reduced-motion: reduce) {
  .fl-spinner, .fl-skeleton, .fl-progress-indeterminate .fl-progress-fill, .fl-overlay, .fl-dialog, .fl-tooltip { animation: none; }
  .fl-progress-indeterminate .fl-progress-fill { left: 0; width: 100%; opacity: var(--opacity-divider); }
  .fl-btn, .fl-input, .fl-textarea, .fl-select, .fl-check-input, .fl-switch-track, .fl-switch-thumb, .fl-progress-fill { transition: none; }
}
`;

/* ============================================================================
 * EXTENSION_CSS — classes et tokens propres à l'écran « Fichier AC056 ».
 * Tout est exprimé en tokens Flussi ; seuls les tokens de taille ci-dessous
 * sont nouveaux (voir l'en-tête du fichier pour leur justification).
 * ========================================================================== */
const EXTENSION_CSS = `
/* ---------- Nouveaux tokens (à reporter dans tokens.json) ---------- */
.fl-app {
  --content-max-width: 1600px;      /* repris de parametres.tsx */
  --panel-nav-width: 344px;         /* colonne gauche : liste des évènements (≥ 1440 px) */
  --panel-errors-width: 336px;      /* colonne droite : récapitulatif des erreurs (≥ 1440 px) */
  --log-panel-height: 184px;        /* journal de session déplié : 7 lignes + en-tête */
}
@media (max-width: 1439px) {
  .fl-app {
    --panel-nav-width: 328px;       /* minimum pour dossier + n° + contrat + code + compteur sans troncature */
    --panel-errors-width: 264px;
  }
}

/* ---------- Barre de prévisualisation (hors application) ---------- */
.fl-preview { display: flex; flex-direction: column; height: 100vh; min-width: 1280px; background: var(--neutral-800); }
.fl-preview-toolbar {
  flex: none; display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-3) var(--space-6);
  padding: var(--space-3) var(--space-4); background: var(--neutral-800); color: var(--white);
  font-family: var(--font-sans); font-size: var(--fs-12); line-height: var(--lh-16);
}
.fl-preview-group { display: flex; flex-direction: column; gap: var(--space-1); }
.fl-preview-label { font-weight: var(--fw-semibold); text-transform: uppercase; letter-spacing: var(--ls-caps); color: var(--neutral-300); }
.fl-preview-options { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.fl-preview-chip {
  height: var(--control-sm); padding: 0 var(--space-2); border-radius: var(--radius-md);
  border: var(--border-width) solid var(--neutral-600); background: transparent; color: var(--neutral-100);
  font-family: var(--font-sans); font-size: var(--fs-12); cursor: pointer; white-space: nowrap;
}
.fl-preview-chip:hover { border-color: var(--neutral-400); }
.fl-preview-chip[aria-pressed="true"] { background: var(--white); color: var(--neutral-900); border-color: var(--white); }
.fl-preview-chip:focus-visible { outline: none; box-shadow: var(--focus-ring-on-dark); }

/* ---------- Cadre d'application ---------- */
.fl-app { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; background: var(--bg-page); overflow: hidden; }
.fl-app .fl-env-banner { flex: none; }
/* Aperçu uniquement : le voile du dialogue reste dans le cadre de l'application, pas sur la barre d'états. */
.fl-app .fl-overlay { position: absolute; }

.fl-app-header {
  position: relative; z-index: var(--z-header); flex: none; display: flex; align-items: stretch; gap: var(--space-6);
  height: var(--header-height); padding: 0 var(--space-6); background: var(--bg-header); color: var(--text-on-brand); box-shadow: var(--shadow-sm);
}
.fl-app-header-brand { display: flex; align-items: center; gap: var(--space-2); }
.fl-app-header-name { font-size: var(--fs-16); line-height: var(--lh-24); font-weight: var(--fw-semibold); }
.fl-app-nav ul { display: flex; height: 100%; margin: 0; padding: 0; list-style: none; gap: var(--space-1); }
.fl-app-nav li { display: flex; }
.fl-app-nav-item {
  display: flex; align-items: center; padding: 0 var(--space-4); background: none; border: 0;
  color: var(--navy-100); font-family: var(--font-sans); font-size: var(--fs-14); font-weight: var(--fw-medium); cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard);
}
.fl-app-nav-item:hover { background: var(--navy-600); color: var(--white); }
.fl-app-nav-item[aria-current="page"] { background: var(--navy-800); color: var(--white); box-shadow: inset 0 calc(var(--border-width-strong) * -1) 0 var(--blue-300); }
.fl-app-nav-item:focus-visible { outline: none; box-shadow: var(--focus-ring-on-dark); }
.fl-app-nav-item:disabled { color: var(--navy-300); background: none; cursor: not-allowed; }
.fl-app-nav-item[aria-current="page"]:disabled { background: var(--navy-800); }
.fl-app-header-meta { margin-left: auto; display: flex; align-items: center; gap: var(--space-3); font-size: var(--fs-13); line-height: var(--lh-18); color: var(--navy-100); }
.fl-app-header-sep { width: var(--border-width); height: var(--space-4); background: var(--navy-300); }

/* Bandeau global « Journal non enregistré » : pleine largeur, sans rayon, hors zone défilante. */
.fl-ac056-global-alert { flex: none; border-radius: var(--radius-none); border-width: 0 0 var(--border-width) 0; padding: var(--space-3) var(--space-6); }

/* ---------- Écran ---------- */
.fl-ac056 { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.fl-ac056-inner { width: 100%; max-width: var(--content-max-width); margin: 0 auto; padding: 0 var(--space-6); }

/* Barre de fichier */
.fl-ac056-filebar { flex: none; background: var(--bg-surface); border-bottom: var(--border-width) solid var(--border-default); }
.fl-ac056-filebar .fl-ac056-inner { display: flex; align-items: center; gap: var(--space-3); min-height: calc(var(--control-lg) + var(--space-4)); }
.fl-ac056-filename { margin: 0; color: var(--text-heading); }
.fl-ac056-filebar-meta { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); min-width: 0; }
.fl-ac056-filebar-actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); flex: none; }
.fl-ac056-save-reason { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--fs-13); line-height: var(--lh-18); font-weight: var(--fw-medium); color: var(--error-text); }

/* Emplacement des Alerts d'écran (états 4, 5, 6, 8, 14, 15, 16) */
.fl-ac056-alert-slot { flex: none; padding-top: var(--space-4); }
.fl-ac056-alert-slot > * + * { margin-top: var(--space-3); }

/* Zone principale : trois colonnes qui défilent chacune */
.fl-ac056-main {
  flex: 1; min-height: 0; display: grid; gap: var(--space-4); padding-top: var(--space-4); padding-bottom: var(--space-4);
  grid-template-columns: var(--panel-nav-width) minmax(0, 1fr) var(--panel-errors-width);
}
.fl-ac056-col { min-height: 0; display: flex; flex-direction: column; background: var(--bg-surface); border: var(--border-width) solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
.fl-ac056-col-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.fl-ac056-panel-head { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); padding: var(--space-3) var(--space-4); border-bottom: var(--border-width) solid var(--border-subtle); }
.fl-ac056-panel-title { margin: 0; font-size: var(--fs-16); line-height: var(--lh-24); font-weight: var(--fw-semibold); color: var(--text-heading); }
.fl-ac056-panel-count { color: var(--text-muted); font-size: var(--fs-12); line-height: var(--lh-16); }
.fl-ac056-panel-actions { margin-left: auto; display: flex; gap: var(--space-1); }

/* Colonne gauche : évènements */
.fl-ac056-event-grid { display: grid; align-items: center; gap: var(--space-2); grid-template-columns: var(--icon-md) 6ch 2ch minmax(0, 1fr) 4ch var(--switch-height); }
.fl-ac056-event-head { padding: var(--space-2) var(--space-4) var(--space-1); font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-medium); color: var(--text-muted); background: var(--bg-subtle); border-bottom: var(--border-width) solid var(--border-subtle); }
.fl-ac056-list { list-style: none; margin: 0; padding: var(--space-1) var(--space-2); }
.fl-ac056-event {
  width: 100%; min-height: var(--control-md); padding: 0 var(--space-2); border: 0; border-radius: var(--radius-md); background: none;
  font-family: var(--font-mono); font-size: var(--fs-13); line-height: var(--lh-20); font-variant-numeric: tabular-nums;
  color: var(--text-default); text-align: left; cursor: pointer;
}
.fl-ac056-event > span { overflow-wrap: anywhere; }
.fl-ac056-event .fl-icon { color: var(--text-muted); }
.fl-ac056-event:hover { background: var(--blue-50); }
.fl-ac056-event.is-selected { background: var(--selection-bg); box-shadow: inset var(--border-width-strong) 0 0 var(--selection-border); }
.fl-ac056-event.is-error { color: var(--error-text); font-weight: var(--fw-medium); }
.fl-ac056-event.is-error .fl-icon { color: var(--error-text); }
.fl-ac056-event:focus-visible, .fl-ac056-node:focus-visible, .fl-ac056-errrow:focus-visible, .fl-ac056-filerow:focus-visible, .fl-ac056-log-bar:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.fl-ac056-event:disabled, .fl-ac056-node:disabled, .fl-ac056-errrow:disabled { cursor: not-allowed; }

.fl-ac056-sub { padding: var(--space-1) 0 var(--space-2) var(--space-6); }
.fl-ac056-sub-title { margin: var(--space-1) 0; padding: 0 var(--space-2); }
.fl-ac056-node { width: 100%; border: 0; background: none; font-family: var(--font-sans); font-size: var(--fs-14); text-align: left; cursor: pointer; }
.fl-ac056-node:hover { background: var(--blue-50); }
.fl-ac056-node.fl-tree-node-selected:hover { background: var(--selection-bg); }
.fl-ac056-node .fl-icon { color: var(--text-muted); }
.fl-ac056-node.fl-tree-node-error .fl-icon { color: var(--error-text); }
.fl-ac056-node-text { min-width: 0; overflow-wrap: anywhere; }
.fl-ac056-node-muted { display: flex; align-items: center; gap: var(--space-2); min-height: var(--control-md); padding: 0 var(--space-2); color: var(--text-muted); font-style: normal; }
.fl-ac056-node-muted .fl-icon { color: var(--text-muted); }
.fl-ac056-node-muted .fl-count { margin-left: auto; }
.fl-ac056-nested { padding-left: var(--space-6); }

/* Colonne centrale : onglets d'entités + formulaire */
.fl-ac056-tabbar { flex: none; padding: var(--space-3) var(--space-4) 0; border-bottom: var(--border-width) solid var(--border-subtle); }
.fl-ac056-context { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); margin-bottom: var(--space-2); font-size: var(--fs-12); line-height: var(--lh-16); color: var(--text-muted); }
.fl-ac056-context b { font-family: var(--font-mono); font-size: var(--fs-12); font-weight: var(--fw-medium); color: var(--text-default); }
.fl-ac056-tabs { flex-wrap: wrap; border-bottom: 0; }            /* retour à la ligne, jamais de défilement horizontal */
.fl-ac056-tabs .fl-tab { height: var(--control-md); padding: 0 var(--space-2); white-space: nowrap; }
.fl-ac056-tab-mono > span:not(.fl-count):not(.fl-sr-only) { font-family: var(--font-mono); font-size: var(--fs-13); }
.fl-ac056-tabs .fl-tab:disabled { color: var(--text-disabled); cursor: not-allowed; }
.fl-ac056-tabs .fl-tab-error[aria-selected="true"] { color: var(--error-text); }
.fl-ac056-subtabs { margin-top: var(--space-1); padding-top: var(--space-1); border-top: var(--border-width) solid var(--border-subtle); }

.fl-ac056-entity { padding: var(--space-5) var(--space-6) var(--space-6); }
.fl-ac056-entity-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-1) var(--space-3); margin-bottom: var(--space-4); }
.fl-ac056-entity-title { margin: 0; font-size: var(--fs-18); line-height: var(--lh-24); font-weight: var(--fw-semibold); color: var(--text-heading); }
.fl-ac056-entity-title .fl-mono { font-size: var(--fs-16); font-weight: var(--fw-medium); }
.fl-ac056-msp { margin-bottom: var(--space-5); }
.fl-ac056-msp p { margin: 0; }
.fl-ac056-msp p + p { margin-top: var(--space-1); }
.fl-ac056-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4) var(--space-6); }
@media (max-width: 1439px) { .fl-ac056-form { grid-template-columns: minmax(0, 1fr); } }
.fl-ac056-field-target .fl-input { box-shadow: var(--focus-ring-error); }
.fl-ac056-empty-entity { color: var(--text-muted); }

/* Colonne droite : récapitulatif des erreurs */
.fl-ac056-errlist { list-style: none; margin: 0; padding: var(--space-1) var(--space-2); }
.fl-ac056-errrow {
  width: 100%; display: grid; grid-template-columns: var(--icon-md) minmax(0, 1fr); gap: var(--space-1) var(--space-2);
  padding: var(--space-2); border: 0; border-radius: var(--radius-md); background: none; text-align: left; cursor: pointer;
  font-family: var(--font-sans); color: var(--text-default);
}
.fl-ac056-errrow:hover { background: var(--blue-50); }
.fl-ac056-errrow.is-current { background: var(--selection-bg); box-shadow: inset var(--border-width-strong) 0 0 var(--selection-border); }
.fl-ac056-errrow > .fl-icon { margin-top: var(--space-half); color: var(--error-text); }
.fl-ac056-errrow-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); }
.fl-ac056-errrow-field { font-size: var(--fs-13); line-height: var(--lh-18); font-weight: var(--fw-medium); color: var(--error-text); }
.fl-ac056-errrow-msg { grid-column: 2; font-size: var(--fs-13); line-height: var(--lh-18); color: var(--text-default); }
.fl-ac056-code { font-family: var(--font-mono); font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-medium); color: var(--text-default); font-variant-numeric: tabular-nums; }
.fl-ac056-noerror { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-3) var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: var(--success-bg); color: var(--success-text); font-weight: var(--fw-medium); }
.fl-ac056-minor { margin: var(--space-2) var(--space-4) var(--space-4); padding-top: var(--space-3); border-top: var(--border-width) solid var(--border-subtle); }
.fl-ac056-minor-title { display: flex; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-2); }
.fl-ac056-minor ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.fl-ac056-minor li { display: grid; grid-template-columns: var(--icon-sm) minmax(0, 1fr); gap: var(--space-2); font-size: var(--fs-13); line-height: var(--lh-18); color: var(--text-muted); }
.fl-ac056-minor li .fl-icon { margin-top: var(--space-half); }

/* Choix du fichier */
.fl-ac056-chooser { flex: 1; min-height: 0; overflow-y: auto; padding-top: var(--space-6); padding-bottom: var(--space-6); }
.fl-ac056-chooser-head { margin-bottom: var(--space-5); }
.fl-ac056-chooser-head p { margin: var(--space-1) 0 0; }
.fl-ac056-chooser-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-6); align-items: start; }
.fl-ac056-file-grid { display: grid; align-items: center; gap: var(--space-3); grid-template-columns: minmax(0, 1fr) 18ch 7ch 9ch; }
.fl-ac056-file-head { padding: var(--space-2) var(--space-5); background: var(--bg-subtle); border-bottom: var(--border-width) solid var(--border-subtle); font-size: var(--fs-12); line-height: var(--lh-16); font-weight: var(--fw-medium); color: var(--text-muted); }
.fl-ac056-filelist { list-style: none; margin: 0; padding: 0; }
.fl-ac056-filelist li + li { border-top: var(--border-width) solid var(--border-subtle); }
.fl-ac056-filerow {
  width: 100%; min-height: var(--control-lg); padding: 0 var(--space-5); border: 0; background: none; text-align: left; cursor: pointer;
  font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); font-variant-numeric: tabular-nums;
}
.fl-ac056-filerow:hover { background: var(--blue-50); }
.fl-ac056-filerow .fl-mono { overflow-wrap: anywhere; }
.fl-ac056-num { text-align: right; }
.fl-ac056-emptystate { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-12) var(--space-6); text-align: center; color: var(--text-muted); }
.fl-ac056-emptystate p { margin: 0; color: var(--text-default); font-weight: var(--fw-medium); }

/* Chargement */
.fl-ac056-skel { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }

/* Journal de session */
.fl-ac056-log { flex: none; background: var(--bg-surface); border-top: var(--border-width) solid var(--border-default); }
.fl-ac056-log-bar {
  width: 100%; display: flex; align-items: center; gap: var(--space-3); height: var(--control-lg); padding: 0 var(--space-6);
  border: 0; background: var(--bg-subtle); cursor: pointer; font-family: var(--font-sans); font-size: var(--fs-13); line-height: var(--lh-18); color: var(--text-default); text-align: left;
}
.fl-ac056-log-bar:hover { background: var(--neutral-200); }
.fl-ac056-log-title { font-weight: var(--fw-semibold); color: var(--text-heading); white-space: nowrap; }
.fl-ac056-log-last { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-2); overflow: hidden; white-space: nowrap; color: var(--text-muted); }
.fl-ac056-log-last > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.fl-ac056-log-chevron { margin-left: auto; color: var(--text-muted); }
.fl-ac056-log-panel { height: var(--log-panel-height); overflow-y: auto; border-top: var(--border-width) solid var(--border-subtle); }
.fl-ac056-log-lines { list-style: none; margin: 0 auto; padding-top: var(--space-2); padding-bottom: var(--space-2); }
.fl-ac056-log-line { display: grid; grid-template-columns: 9ch 9ch minmax(0, 1fr); gap: var(--space-3); align-items: start; padding: var(--space-half) 0; font-size: var(--fs-13); line-height: var(--lh-20); }
.fl-ac056-log-time { font-family: var(--font-mono); font-size: var(--fs-12); color: var(--text-muted); font-variant-numeric: tabular-nums; }
.fl-ac056-level { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--fs-12); line-height: var(--lh-20); font-weight: var(--fw-medium); }
.fl-ac056-level-titre { color: var(--text-heading); font-weight: var(--fw-semibold); }
.fl-ac056-level-info { color: var(--text-muted); }
.fl-ac056-level-succes { color: var(--success-text); }
.fl-ac056-level-erreur { color: var(--error-text); }
.fl-ac056-msg-titre { font-weight: var(--fw-semibold); color: var(--text-heading); }
.fl-ac056-msg-info { color: var(--text-muted); }
.fl-ac056-msg-succes { color: var(--success-text); }
.fl-ac056-msg-erreur { color: var(--error-text); font-weight: var(--fw-medium); }
`;

/* ============================================================================
 * Kit partagé Flussi (même API que design/patterns/*.tsx)
 * ========================================================================== */
const { useState } = React;
const NB = ' ';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type IconProps = { size?: number; className?: string };
/** Icône Lucide en SVG inline : trait 1,75, tailles 14 / 16 / 20, couleur currentColor. */
function makeIcon(name: string, body: React.ReactNode) {
  const Icon = ({ size = 16, className }: IconProps) => (
    <svg className={cx('fl-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{body}</svg>
  );
  Icon.displayName = name;
  return Icon;
}

const CircleAlert = makeIcon('CircleAlert', <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>);
const CircleCheck = makeIcon('CircleCheck', <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
const Info = makeIcon('Info', <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
const TriangleAlert = makeIcon('TriangleAlert', <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);
const ChevronLeft = makeIcon('ChevronLeft', <path d="m15 18-6-6 6-6" />);
const ChevronRight = makeIcon('ChevronRight', <path d="m9 18 6-6-6-6" />);
const ChevronUp = makeIcon('ChevronUp', <path d="m18 15-6-6-6 6" />);
const ChevronDown = makeIcon('ChevronDown', <path d="m6 9 6 6 6-6" />);
const FileText = makeIcon('FileText', <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>);
const FileWarning = makeIcon('FileWarning', <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);
const PencilLine = makeIcon('PencilLine', <><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" /><path d="m15 5 3 3" /></>);
const UserIcon = makeIcon('User', <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const UserX = makeIcon('UserX', <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m17 8 5 5" /><path d="m22 8-5 5" /></>);
const Shield = makeIcon('Shield', <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />);
const Folder = makeIcon('Folder', <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />);
const FolderOpen = makeIcon('FolderOpen', <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />);
const RefreshCw = makeIcon('RefreshCw', <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>);
const RotateCcw = makeIcon('RotateCcw', <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
const Save = makeIcon('Save', <><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></>);
const Inbox = makeIcon('Inbox', <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>);
const ScrollText = makeIcon('ScrollText', <><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></>);
const FlaskConical = makeIcon('FlaskConical', <><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" /></>);
const X = makeIcon('X', <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: React.ReactNode; iconAfter?: React.ReactNode; loading?: boolean;
};
function Button({ variant = 'outline', size = 'md', icon, iconAfter, loading, className, children, onClick, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx('fl-btn', `fl-btn-${variant}`, size === 'sm' && 'fl-btn-sm', className)}
      aria-busy={loading || undefined} aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick} {...rest}>
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} label={null} /> : icon}
      {children}
      {!loading && iconAfter}
    </button>
  );
}

function Spinner({ size = 16, label = 'Chargement…', brand }: { size?: number; label?: string | null; brand?: boolean }) {
  const stroke = size >= 20 ? 2.5 : 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg className={cx('fl-spinner', brand && 'fl-spinner-brand')} width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      role={label ? 'status' : undefined} aria-label={label ?? undefined} aria-hidden={label ? undefined : true}>
      <circle className="fl-spinner-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
      <circle className="fl-spinner-arc" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * 0.28} ${c}`} />
    </svg>
  );
}

function Skeleton({ width = '100%', height }: { width?: number | string; height?: number | string }) {
  return <span aria-hidden="true" className="fl-skeleton fl-skeleton-text" style={{ width, height }} />;
}

/** Opération en cours (titre + barre indéterminée). */
function OperationProgress({ title }: { title: React.ReactNode }) {
  return (
    <div className="fl-operation" aria-live="polite" aria-busy="true">
      <div className="fl-operation-head"><Spinner brand label={null} /><p className="fl-operation-title">{title}</p></div>
      <div className="fl-progress fl-progress-indeterminate" role="progressbar" aria-label={typeof title === 'string' ? title : 'Progression'}><div className="fl-progress-fill" /></div>
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'error' | 'testenv';
function Badge({ tone = 'neutral', icon, mono, children }: { tone?: BadgeTone; icon?: React.ReactNode; mono?: boolean; children: React.ReactNode }) {
  return <span className={cx('fl-badge', `fl-badge-${tone}`, mono && 'fl-badge-mono')}>{icon}{children}</span>;
}

function EnvironmentBadge() {
  return <Badge tone="testenv" icon={<FlaskConical size={14} />}>Recette</Badge>;
}

/** Compteur d'erreurs des onglets et nœuds. Masqué à 0. */
function CountBadge({ count, noun = ['erreur', 'erreurs'] }: { count: number; noun?: [string, string] }) {
  if (count <= 0) return null;
  return (
    <span className="fl-count">
      <span aria-hidden="true">{count > 99 ? '99+' : String(count)}</span>
      <span className="fl-sr-only">{`${count} ${count > 1 ? noun[1] : noun[0]}`}</span>
    </span>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'error';
const ALERT_ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
function Alert({ tone = 'info', title, children, actions, className }: { tone?: AlertTone; title?: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'} className={cx('fl-alert', `fl-alert-${tone}`, className)}>
      <Icon className="fl-alert-icon" size={title ? 20 : 16} />
      <div className="fl-alert-content">
        {title && <p className="fl-alert-title">{title}</p>}
        {children && <div className="fl-alert-desc">{children}</div>}
        {actions && <div className="fl-alert-actions">{actions}</div>}
      </div>
    </div>
  );
}

function Card({ title, description, headingLevel = 2, flush, children }: { title: React.ReactNode; description?: React.ReactNode; headingLevel?: 2 | 3; flush?: boolean; children: React.ReactNode }) {
  const H = `h${headingLevel}` as 'h2';
  return (
    <section className="fl-card">
      <header className="fl-card-header">
        <div className="fl-card-titles">
          <H className="fl-card-title">{title}</H>
          {description && <p className="fl-card-desc">{description}</p>}
        </div>
      </header>
      <div className={cx('fl-card-body', flush && 'fl-card-body-flush')}>{children}</div>
    </section>
  );
}

function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="fl-ac056-emptystate">
      <Inbox size={20} />
      <p>{title}</p>
      {action}
    </div>
  );
}

function EnvironmentBanner({ environment }: { environment: Env }) {
  if (environment !== 'recette') return null;
  return (
    <div className="fl-env-banner" role="note" aria-label="Environnement de recette">
      <FlaskConical />
      <span className="fl-env-banner-label">Recette</span>
      <span className="fl-env-banner-sep" aria-hidden="true" />
      <span>Les fichiers sont déposés sur le serveur de test du partenaire, pas en production.</span>
    </div>
  );
}

type Env = 'recette' | 'production';
const NAV = ['Accueil', 'Fichier AC056', 'Journal', 'Paramètres'];

/** En-tête marine : « Flussi » + badge Recette, navigation principale, environnement et version à droite. */
function AppHeader({ env, navDisabled }: { env: Env; navDisabled?: boolean }) {
  return (
    <header className="fl-app-header">
      <div className="fl-app-header-brand">
        <span className="fl-app-header-name">Flussi</span>
        {env === 'recette' && <EnvironmentBadge />}
      </div>
      <nav className="fl-app-nav" aria-label="Navigation principale">
        <ul>
          {NAV.map((item) => (
            <li key={item}>
              {/* Quitter l'écran puis revenir conserve le fichier ouvert, la sélection et les modifications non
                  enregistrées : changer d'entrée ne demande donc aucune confirmation. Désactivé pendant un enregistrement. */}
              <button type="button" className="fl-app-nav-item" aria-current={item === 'Fichier AC056' ? 'page' : undefined} disabled={navDisabled}>{item}</button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="fl-app-header-meta">
        <span>{`Environnement${NB}: ${env === 'recette' ? 'Recette' : 'Production'}`}</span>
        <span className="fl-app-header-sep" aria-hidden="true" />
        <span>Flussi 0.3.0</span>
      </div>
    </header>
  );
}

/** Cadre de l'application : bandeau Recette, en-tête, emplacement d'alerte globale, puis l'écran. */
function AppFrame({ env, navDisabled, globalAlert, children }: { env: Env; navDisabled?: boolean; globalAlert?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fl-app">
      <EnvironmentBanner environment={env} />
      <AppHeader env={env} navDisabled={navDisabled} />
      {globalAlert}
      {children}
    </div>
  );
}

/* ============================================================================
 * Données fictives (codées en dur, aucune génération, aucune lecture de fichier)
 * ========================================================================== */
type TabKey = '001' | '100' | '110' | '115' | '120' | '125' | '130' | '135' | '155' | '180' | 'coord' | 'benef' | 'gar' | '485' | '490';
const TABS: Array<{ key: TabKey; label: string; mono?: boolean }> = [
  { key: '001', label: '001', mono: true }, { key: '100', label: '100', mono: true }, { key: '110', label: '110', mono: true },
  { key: '115', label: '115', mono: true }, { key: '120', label: '120', mono: true }, { key: '125', label: '125', mono: true },
  { key: '130', label: '130', mono: true }, { key: '135', label: '135', mono: true }, { key: '155', label: '155', mono: true },
  { key: '180', label: '180', mono: true }, { key: 'coord', label: 'Coordonnées' }, { key: 'benef', label: 'Bénéficiaires' },
  { key: 'gar', label: 'Garanties' }, { key: '485', label: 'Critères (485)' }, { key: '490', label: 'Variables de souscription (490)' },
];
const SUBTABS: Record<'benef' | 'gar', string[]> = { benef: ['400', '405', '410', '411'], gar: ['700', '800'] };

interface Item {
  id: string; code?: string; label: string; count: number;
  subCounts: Record<string, number>; absentSub: string[];
  /** Regroupement « Bénéficiaire absent du rejet » (non sélectionnable). */
  absentGroup?: boolean; children?: Item[];
}
interface Ev {
  id: string; dossier: string; num: string; contrat: string; code: string; count: number;
  absent: TabKey[]; tabCounts: Partial<Record<TabKey, number>>; benefs: Item[]; covs: Item[];
}
interface Target { ev: string; tab: TabKey; item?: string; sub?: string; field?: string }
interface ErrRow { id: string; line: string; entity: string; field?: string; message: string; code?: string | null; structure?: boolean; target: Target }

/** Compteurs écrits tels qu'ils doivent apparaître pour chaque variante (aucun calcul). */
interface Counts { e2: number; benef: number; b2: number; t400: number; gar: number; c2b: number; t700: number; e3: number; t120: number }
const C_ERR: Counts = { e2: 3, benef: 2, b2: 2, t400: 2, gar: 1, c2b: 1, t700: 1, e3: 1, t120: 1 };
const C_MOD: Counts = { e2: 2, benef: 1, b2: 1, t400: 1, gar: 1, c2b: 1, t700: 1, e3: 1, t120: 1 };
const C_ZERO: Counts = { e2: 0, benef: 0, b2: 0, t400: 0, gar: 0, c2b: 0, t700: 0, e3: 0, t120: 0 };

function veosEvents(c: Counts): Ev[] {
  const absent: TabKey[] = ['135', '155', '485'];
  return [
    {
      id: 'e1', dossier: '900001', num: '1', contrat: 'CTR-FICTIF-0001', code: 'AFN', count: 0, absent, tabCounts: {},
      benefs: [{ id: 'b1', code: '10', label: 'Assuré principal', count: 0, subCounts: {}, absentSub: ['411'] }],
      covs: [{ id: 'c1', code: 'SANTE1', label: 'Santé base', count: 0, subCounts: {}, absentSub: ['800'] }],
    },
    {
      id: 'e2', dossier: '900002', num: '1', contrat: 'CTR-FICTIF-0002', code: 'ADR3', count: c.e2, absent,
      tabCounts: { benef: c.benef, gar: c.gar },
      benefs: [{ id: 'b2', code: '10', label: 'Assuré principal', count: c.b2, subCounts: { '400': c.t400 }, absentSub: ['411'] }],
      covs: [
        { id: 'c2a', code: 'SANTE1', label: 'Santé base', count: 0, subCounts: {}, absentSub: ['800'] },
        { id: 'c2b', code: 'SANTE2', label: 'Option renfort', count: c.c2b, subCounts: { '700': c.t700 }, absentSub: ['800'] },
      ],
    },
    {
      id: 'e3', dossier: '900003', num: '2', contrat: 'CTR-FICTIF-0003', code: 'RES', count: c.e3, absent, tabCounts: { '120': c.t120 },
      benefs: [{ id: 'b3', code: '10', label: 'Assuré principal', count: 0, subCounts: {}, absentSub: ['410', '411'] }],
      covs: [{ id: 'c3', code: 'SANTE1', label: 'Santé base', count: 0, subCounts: {}, absentSub: ['800'] }],
    },
  ];
}

const REJECT_EVENTS: Ev[] = [
  {
    id: 'r1', dossier: '900011', num: '1', contrat: 'CTR-FICTIF-0011', code: 'ADR3', count: 2,
    absent: ['110', '115', '120', '125', '130', '135', '155', '180', 'coord', '485', '490'], tabCounts: { benef: 1, gar: 1 },
    benefs: [{ id: 'rb1', code: '10', label: 'Assuré principal', count: 1, subCounts: { '400': 1 }, absentSub: ['405', '410', '411'] }],
    covs: [{ id: 'rc1', code: 'SANTE1', label: 'Santé base', count: 1, subCounts: { '800': 1 }, absentSub: [] }],
  },
  {
    id: 'r2', dossier: '900012', num: '1', contrat: 'CTR-FICTIF-0012', code: 'AFN', count: 1,
    absent: ['110', '115', '120', '125', '130', '135', '155', '180', 'coord', 'benef', '485', '490'], tabCounts: { gar: 1 },
    benefs: [],
    covs: [{
      id: 'rgroup', label: 'Bénéficiaire absent du rejet', count: 1, subCounts: {}, absentSub: [], absentGroup: true,
      children: [{ id: 'rc3', code: 'SANTE3', label: 'Option hospitalisation', count: 1, subCounts: { '700': 1 }, absentSub: ['800'] }],
    }],
  },
];

const E_DOB: ErrRow = { id: 'dob', line: '412', entity: '400', field: 'Date de naissance', message: `Date inexistante${NB}: saisissez une date réelle au format JJ/MM/AAAA.`, target: { ev: 'e2', tab: 'benef', item: 'b2', sub: '400', field: 'dob' } };
const E_CLE: ErrRow = { id: 'cle', line: '412', entity: '400', field: 'Clé INSEE', message: `La clé ne correspond pas au N°${NB}INSEE${NB}: 2 chiffres attendus, de 01 à 97.`, target: { ev: 'e2', tab: 'benef', item: 'b2', sub: '400', field: 'cle' } };
const E_700: ErrRow = { id: 'effet', line: '415', entity: '700', field: 'Date d’effet', message: 'Date d’effet antérieure à la date d’adhésion.', target: { ev: 'e2', tab: 'gar', item: 'c2b', sub: '700', field: 'effet' } };
const E_120: ErrRow = { id: 'produit', line: `1${NB}102`, entity: '120', field: 'Code produit', message: 'Code produit inconnu du référentiel.', target: { ev: 'e3', tab: '120', field: 'produit' } };
const E_STRUCT: ErrRow = { id: 'struct', line: `1${NB}290`, entity: 'Structure', message: 'Entité 990 hors dossier', structure: true, target: { ev: 'e3', tab: '001' } };

const REJECT_ROWS: ErrRow[] = [
  { id: 'rj1', line: '3', entity: '400', message: `«${NB}La date de naissance ne correspond pas au N°${NB}INSEE.${NB}»`, code: 'ERR014', target: { ev: 'r1', tab: 'benef', item: 'rb1', sub: '400' } },
  { id: 'rj2', line: '7', entity: '800', message: `«${NB}Le code garantie n’est pas ouvert à la date d’effet.${NB}»`, code: 'ERR021', target: { ev: 'r1', tab: 'gar', item: 'rc1', sub: '800' } },
  { id: 'rj3', line: '12', entity: '700', message: `«${NB}Garantie refusée.${NB}»`, code: null, target: { ev: 'r2', tab: 'gar', item: 'rc3', sub: '700' } },
];

const MINOR = [`Lignes 1${NB}288 et 1${NB}289${NB}: lignes vides, supprimées à l’enregistrement.`, 'BOM en tête de fichier.'];

interface FileEntry { name: string; date: string; size: string; reject: boolean }
const IN_FILES: FileEntry[] = [
  { name: 'AC056COUR_20261019.txt', date: '19/10/2026 à 08:05', size: `612${NB}Ko`, reject: false },
  { name: 'AC056COUR_20261018.txt', date: '18/10/2026 à 08:04', size: `598${NB}Ko`, reject: false },
  { name: 'AC056COUR_20261017.txt', date: '17/10/2026 à 08:06', size: `3,9${NB}Mo`, reject: false },
  { name: 'AC056COUR_20261016.txt', date: '16/10/2026 à 08:03', size: `605${NB}Ko`, reject: false },
  { name: 'AC056COUR_20261015.txt', date: '15/10/2026 à 08:05', size: `587${NB}Ko`, reject: false },
];
const OUT_FILES: FileEntry[] = [
  { name: 'AC056COUR_REJ_20261017.txt', date: '17/10/2026 à 14:32', size: `18${NB}Ko`, reject: true },
  { name: 'AC056COUR_REJ_20261016.txt', date: '16/10/2026 à 14:28', size: `6${NB}Ko`, reject: true },
  { name: 'AC056COUR_REJ_20261014.txt', date: '14/10/2026 à 14:35', size: `11${NB}Ko`, reject: true },
  { name: 'AC056COUR_REJ_20261010.txt', date: '10/10/2026 à 14:30', size: `4${NB}Ko`, reject: true },
];

/* ============================================================================
 * États de la maquette
 * ========================================================================== */
type StateId =
  | 'none' | 'empty' | 'p-down'
  | 'loading' | 'unreadable' | 'structure'
  | 'errors' | 'clean' | 'minor-only' | 'reject' | 'modified'
  | 'saving' | 'saved' | 'saved-errors' | 'save-failed' | 'confirm';

const STATE_GROUPS: Array<{ label: string; states: Array<{ id: StateId; label: string }> }> = [
  { label: 'Choix de fichier', states: [{ id: 'none', label: '1 · Aucun fichier ouvert' }, { id: 'empty', label: '2 · Dossier vide' }, { id: 'p-down', label: '3 · P: inaccessible' }] },
  { label: 'Chargement', states: [{ id: 'loading', label: '4 · Chargement en cours' }, { id: 'unreadable', label: '5 · Fichier illisible' }, { id: 'structure', label: '6 · Anomalie de structure' }] },
  { label: 'Fichier ouvert', states: [{ id: 'errors', label: '7 · Fichier avec erreurs (+ 10)' }, { id: 'clean', label: '8 · Aucune erreur' }, { id: 'minor-only', label: '9 · Anomalies non bloquantes seules' }, { id: 'reject', label: '11 · Fichier de rejet' }, { id: 'modified', label: '12 · Modifications non enregistrées' }] },
  { label: 'Enregistrement', states: [{ id: 'saving', label: '13 · Enregistrement en cours' }, { id: 'saved', label: '14 · Enregistré sans erreur' }, { id: 'saved-errors', label: '15 · Enregistré avec des erreurs' }, { id: 'save-failed', label: '16 · Échec de l’enregistrement' }, { id: 'confirm', label: '17 · Confirmation au changement de fichier' }] },
];

type Variant = 'err' | 'struct' | 'mod' | 'zero' | 'minor';
interface Config {
  phase: 'chooser' | 'loading' | 'unreadable' | 'open';
  mode: 'veos' | 'reject'; variant: Variant;
  modified?: boolean; busy?: boolean; dialog?: boolean;
  pageAlert?: 'structure' | 'clean' | 'saved' | 'saved-errors' | 'save-failed';
}
const CONFIG: Record<StateId, Config> = {
  'none': { phase: 'chooser', mode: 'veos', variant: 'err' },
  'empty': { phase: 'chooser', mode: 'veos', variant: 'err' },
  'p-down': { phase: 'chooser', mode: 'veos', variant: 'err' },
  'loading': { phase: 'loading', mode: 'veos', variant: 'err' },
  'unreadable': { phase: 'unreadable', mode: 'veos', variant: 'err' },
  'structure': { phase: 'open', mode: 'veos', variant: 'struct', pageAlert: 'structure' },
  'errors': { phase: 'open', mode: 'veos', variant: 'err' },
  'clean': { phase: 'open', mode: 'veos', variant: 'zero', pageAlert: 'clean' },
  'minor-only': { phase: 'open', mode: 'veos', variant: 'minor' },
  'reject': { phase: 'open', mode: 'reject', variant: 'err' },
  'modified': { phase: 'open', mode: 'veos', variant: 'mod', modified: true },
  'saving': { phase: 'open', mode: 'veos', variant: 'mod', modified: true, busy: true },
  'saved': { phase: 'open', mode: 'veos', variant: 'zero', pageAlert: 'saved' },
  'saved-errors': { phase: 'open', mode: 'veos', variant: 'mod', pageAlert: 'saved-errors' },
  'save-failed': { phase: 'open', mode: 'veos', variant: 'mod', modified: true, pageAlert: 'save-failed' },
  'confirm': { phase: 'open', mode: 'veos', variant: 'mod', modified: true, dialog: true },
};

function countsFor(v: Variant): Counts { return v === 'err' || v === 'struct' ? C_ERR : v === 'mod' ? C_MOD : C_ZERO; }
function errorsFor(v: Variant): ErrRow[] {
  if (v === 'err') return [E_DOB, E_CLE, E_700, E_120];
  if (v === 'struct') return [E_DOB, E_CLE, E_700, E_120, E_STRUCT];
  if (v === 'mod') return [E_DOB, E_700, E_120];
  return [];
}
function minorFor(v: Variant): string[] { return v === 'zero' ? [] : MINOR; }
/** Libellé du compteur d'erreurs, écrit tel qu'il apparaît. */
function errorLabel(v: Variant): string | null {
  return v === 'err' ? '4 erreurs' : v === 'struct' ? '5 erreurs' : v === 'mod' ? '3 erreurs' : null;
}

type Level = 'TITRE' | 'INFO' | 'Succès' | 'Erreur';
interface LogLine { time: string; level: Level; message: string }
const F = 'AC056COUR_20261019.txt';
/** Journal de session : aucune valeur AC056 (ni nom, ni N° INSEE), seulement noms de fichiers, nombres et résultats. */
function logFor(state: StateId): LogLine[] {
  const start: LogLine[] = [
    { time: '08:14:51', level: 'TITRE', message: 'Ouvrir l’écran Fichier AC056' },
    { time: '08:14:51', level: 'INFO', message: `Dossiers lus${NB}: 5 fichiers dans IN, 4 dans OUT` },
  ];
  const load: LogLine[] = [{ time: '08:15:02', level: 'TITRE', message: 'Charger' }];
  const loaded = (m: string): LogLine[] => [...start, ...load, { time: '08:15:03', level: 'Succès', message: `Fichier ${F} chargé${NB}: ${m}` }];
  const save: LogLine = { time: '08:21:40', level: 'TITRE', message: 'Enregistrer' };
  switch (state) {
    case 'none': return start;
    case 'empty': return [...start.slice(0, 1), { time: '08:14:51', level: 'INFO', message: `Dossiers lus${NB}: 5 fichiers dans IN, aucun dans OUT` }];
    case 'p-down': return [start[0], { time: '08:14:51', level: 'Erreur', message: `Dossiers de travail inaccessibles${NB}: le lecteur P: n’est pas connecté` }];
    case 'loading': return [...start, ...load];
    case 'unreadable': return [...start, ...load, { time: '08:15:02', level: 'Erreur', message: `Fichier ${F} illisible${NB}: ligne 3, 412 octets au lieu de 700` }];
    case 'structure': return [...loaded('5 erreurs'), { time: '08:15:03', level: 'Erreur', message: `Fichier ${F} mal formé${NB}: enregistrement refusé` }];
    case 'errors': return loaded('4 erreurs');
    case 'clean': return [...loaded('4 erreurs'), { time: '08:19:12', level: 'INFO', message: `4 champs corrigés${NB}: aucune erreur restante` }];
    case 'minor-only': return loaded('aucune erreur, 2 anomalies non bloquantes');
    case 'reject': return [...start, ...load, { time: '08:15:03', level: 'Succès', message: `Fichier AC056COUR_REJ_20261017.txt chargé${NB}: 3 lignes rejetées` }];
    case 'modified': case 'confirm': return [...loaded('4 erreurs'), { time: '08:18:27', level: 'INFO', message: `1 champ corrigé${NB}: 3 erreurs restantes` }];
    case 'saving': return [...loaded('4 erreurs'), { time: '08:18:27', level: 'INFO', message: `1 champ corrigé${NB}: 3 erreurs restantes` }, save];
    case 'saved': return [...loaded('4 erreurs'), save, { time: '08:21:41', level: 'Succès', message: `Fichier ${F} enregistré${NB}: 3 champs modifiés` }];
    case 'saved-errors': return [...loaded('4 erreurs'), save, { time: '08:21:41', level: 'Succès', message: `Fichier ${F} enregistré${NB}: 3 champs modifiés` }];
    case 'save-failed': return [...loaded('4 erreurs'), save, { time: '08:22:10', level: 'Erreur', message: `Fichier ${F} non enregistré${NB}: le lecteur P: ne répond pas` }];
  }
}

/* ============================================================================
 * Écran « Fichier AC056 »
 * ========================================================================== */
interface ScreenProps { state: StateId; rejectUnknown: boolean; onState: (s: StateId) => void }

function Ac056Screen({ state, rejectUnknown, onState }: ScreenProps) {
  const cfg = CONFIG[state];
  const [logOpen, setLogOpen] = useState(false);
  return (
    <main className="fl-ac056">
      {cfg.phase === 'chooser' && <FileChooser state={state} onOpen={(f) => onState(f.reject ? 'reject' : 'errors')} />}
      {cfg.phase !== 'chooser' && <OpenFile state={state} cfg={cfg} rejectUnknown={rejectUnknown} onState={onState} />}
      <SessionLog lines={logFor(state)} open={logOpen} onToggle={() => setLogOpen(!logOpen)} />
    </main>
  );
}

/* ---------- Choix du fichier (aucun fichier ouvert) ---------- */
function FileChooser({ state, onOpen }: { state: StateId; onOpen: (f: FileEntry) => void }) {
  return (
    <div className="fl-ac056-chooser">
      <div className="fl-ac056-inner">
        <div className="fl-ac056-chooser-head">
          {/* h1 de l'écran dans cet état ; une fois un fichier ouvert, le h1 est le nom du fichier (barre de fichier). */}
          <h1 className="fl-type-h1" style={{ margin: 0 }}>Fichier AC056</h1>
          <p className="fl-type-caption">Cliquez sur un fichier pour l’ouvrir.</p>
        </div>
        {state === 'p-down' ? (
          <Alert tone="error" title="Dossiers de travail inaccessibles"
            actions={<Button variant="secondary" size="sm" icon={<RotateCcw size={14} />}>Réessayer</Button>}>
            {/* Autre cause possible, même présentation : « Le dossier IN est verrouillé par un autre programme. » */}
            Le lecteur P: n’est pas connecté.
          </Alert>
        ) : (
          <div className="fl-ac056-chooser-grid">
            <FileListCard folder="IN" files={IN_FILES} onOpen={onOpen} />
            <FileListCard folder="OUT" files={state === 'empty' ? [] : OUT_FILES} onOpen={onOpen} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ reject }: { reject: boolean }) {
  return reject
    ? <Badge tone="warning" icon={<FileWarning size={14} />}>Rejet</Badge>
    : <Badge tone="neutral" icon={<FileText size={14} />}>VEOS</Badge>;
}

function FileListCard({ folder, files, onOpen }: { folder: 'IN' | 'OUT'; files: FileEntry[]; onOpen: (f: FileEntry) => void }) {
  const count = files.length === 0 ? 'Aucun fichier' : `${files.length} fichier${files.length > 1 ? 's' : ''} · du plus récent au plus ancien`;
  return (
    <Card title={<><Folder size={16} />{folder}</>} description={count} flush>
      {files.length === 0 ? (
        <EmptyState title={`Aucun fichier dans ${folder}`} action={<Button variant="outline" size="sm" icon={<RefreshCw size={14} />}>Actualiser</Button>} />
      ) : (
        <>
          <div className="fl-ac056-file-grid fl-ac056-file-head" aria-hidden="true">
            <span>Nom</span><span>Date</span><span className="fl-ac056-num">Taille</span><span>Type</span>
          </div>
          {/* Doit rester rapide avec beaucoup de fichiers (liste virtualisée si besoin). Aucun chemin n'est jamais affiché,
              pas de boîte « Ouvrir » Windows : un clic sur la ligne ouvre le fichier. */}
          <ul className="fl-ac056-filelist">
            {files.map((f) => (
              <li key={f.name}>
                <button type="button" className="fl-ac056-filerow fl-ac056-file-grid" onClick={() => onOpen(f)}>
                  <span className="fl-mono">{f.name}</span>
                  <span>{f.date}</span>
                  <span className="fl-ac056-num">{f.size}</span>
                  <span><TypeBadge reject={f.reject} /></span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ---------- Fichier ouvert ---------- */
function defaultSelection(cfg: Config, rejectUnknown: boolean): { ev: string; tab: TabKey; item: string; sub: string; err: number } {
  if (cfg.mode === 'reject') {
    return rejectUnknown
      ? { ev: 'r2', tab: 'gar', item: 'rc3', sub: '700', err: 2 }
      : { ev: 'r1', tab: 'benef', item: 'rb1', sub: '400', err: 0 };
  }
  return { ev: 'e2', tab: 'benef', item: 'b2', sub: '400', err: 0 };
}

function OpenFile({ state, cfg, rejectUnknown, onState }: { state: StateId; cfg: Config; rejectUnknown: boolean; onState: (s: StateId) => void }) {
  const isReject = cfg.mode === 'reject';
  const fileName = isReject ? 'AC056COUR_REJ_20261017.txt' : F;
  const events = isReject ? REJECT_EVENTS : veosEvents(countsFor(cfg.variant));
  const rows = isReject ? REJECT_ROWS : errorsFor(cfg.variant);
  const minor = isReject ? [] : minorFor(cfg.variant);

  const init = defaultSelection(cfg, rejectUnknown);
  const [evId, setEvId] = useState(init.ev);
  const [tab, setTab] = useState<TabKey>(init.tab);
  const [itemId, setItemId] = useState(init.item);
  const [sub, setSub] = useState(init.sub);
  const [errIdx, setErrIdx] = useState(rows.length ? Math.min(init.err, rows.length - 1) : -1);

  const ev = events.find((e) => e.id === evId) ?? events[0];
  const busy = !!cfg.busy;
  const current = errIdx >= 0 ? rows[errIdx] : undefined;

  const firstItem = (e: Ev, t: TabKey): Item | undefined => {
    const list = t === 'benef' ? e.benefs : t === 'gar' ? e.covs.flatMap((c) => c.children ?? [c]) : [];
    return list.find((i) => i.count > 0) ?? list[0];
  };
  const firstSub = (t: TabKey, it?: Item): string => {
    if (t !== 'benef' && t !== 'gar') return '';
    const subs = SUBTABS[t].filter((s) => !it?.absentSub.includes(s));
    return subs.find((s) => (it?.subCounts[s] ?? 0) > 0) ?? subs[0];
  };
  const chooseEvent = (e: Ev) => {
    setEvId(e.id);
    const t: TabKey = e.absent.includes(tab) ? '001' : tab;
    setTab(t);
    const it = firstItem(e, t); setItemId(it?.id ?? ''); setSub(firstSub(t, it));
  };
  const chooseTab = (t: TabKey) => { setTab(t); const it = firstItem(ev, t); setItemId(it?.id ?? ''); setSub(firstSub(t, it)); };
  const chooseItem = (it: Item) => { setItemId(it.id); setSub(firstSub(tab, it)); };
  /** Clic sur une erreur : ouvre l'évènement, l'onglet, la sous-entité et place le focus sur le champ concerné.
   *  Pour une anomalie sans champ (structure, ligne vide, encodage), ouvre la ligne indiquée. */
  const goTo = (i: number) => {
    const r = rows[i]; if (!r) return;
    setErrIdx(i); setEvId(r.target.ev); setTab(r.target.tab); setItemId(r.target.item ?? ''); setSub(r.target.sub ?? '');
  };

  const item = (tab === 'benef' ? ev.benefs : tab === 'gar' ? ev.covs.flatMap((c) => c.children ?? [c]) : []).find((i) => i.id === itemId);
  const targetField = current && current.target.ev === ev.id && current.target.tab === tab && (current.target.sub ?? '') === sub ? current.target.field : undefined;

  const pageAlert = renderPageAlert(cfg, state);
  return (
    <>
      <FileBar cfg={cfg} fileName={fileName} isReject={isReject} onChange={() => onState(cfg.modified ? 'confirm' : 'none')} />
      {(cfg.phase === 'loading' || cfg.phase === 'unreadable' || pageAlert) && (
        <div className="fl-ac056-inner fl-ac056-alert-slot">
          {cfg.phase === 'loading' && <OperationProgress title={`Chargement de ${F}…`} />}
          {cfg.phase === 'unreadable' && (
            <Alert tone="error" title="Ce fichier n’est pas un fichier AC056 lisible">
              {/* Autre cause possible : « Encodage incohérent à la ligne 57. » */}
              {`Ligne 3${NB}: 412 octets au lieu de 700.`}
            </Alert>
          )}
          {pageAlert}
        </div>
      )}
      {cfg.phase === 'loading' && <LoadingColumns />}
      {cfg.phase === 'open' && (
        <div className="fl-ac056-inner fl-ac056-main">
          <NavColumn events={events} ev={ev} tab={tab} itemId={itemId} busy={busy} onEvent={chooseEvent} onItem={chooseItem} isReject={isReject} />
          <EntityColumn ev={ev} tab={tab} sub={sub} item={item} busy={busy} cfg={cfg} isReject={isReject}
            onTab={chooseTab} onSub={setSub} targetField={targetField} />
          <ErrorColumn rows={rows} minor={minor} current={errIdx} busy={busy} isReject={isReject}
            onPick={goTo} onPrev={() => goTo(Math.max(0, errIdx - 1))} onNext={() => goTo(Math.min(rows.length - 1, errIdx + 1))} />
        </div>
      )}
      {cfg.dialog && (
        <ConfirmDialog title="Abandonner les modifications ?"
          description={`Les 3 champs modifiés de ${F} ne sont pas enregistrés. Ils seront perdus si vous ouvrez un autre fichier.`}
          confirmLabel="Abandonner" onCancel={() => onState('modified')} onConfirm={() => onState('none')} />
      )}
    </>
  );
}

/** Alerts d'écran, toujours entre la barre de fichier et les trois colonnes.
 *  États 14 à 16 : le message reste affiché jusqu'à la prochaine action de l'utilisateur. */
function renderPageAlert(cfg: Config, _state: StateId): React.ReactNode {
  switch (cfg.pageAlert) {
    case 'structure':
      return (
        <Alert tone="error" title={`Ce fichier est mal formé${NB}: relancez l’export VEOS`}>
          {`L’enregistrement est refusé${NB}: corriger les champs ne répare pas la structure du fichier. Relancez l’export dans VEOS, puis rechargez le fichier.`}
        </Alert>
      );
    case 'clean':
      return <Alert tone="success" title={`Le fichier ne contient plus d’erreur${NB}: vous pouvez l’enregistrer.`} />;
    case 'saved':
      return <Alert tone="success" title="Fichier enregistré" />;
    case 'saved-errors':
      return <Alert tone="warning" title={`Fichier enregistré avec 3 erreurs${NB}: il ne pourra pas être déposé chez MSP tant qu’elles ne sont pas corrigées.`} />;
    case 'save-failed':
      return (
        <Alert tone="error" title={`Enregistrement impossible${NB}: le fichier n’a pas été modifié`}
          actions={<Button variant="secondary" size="sm" icon={<RotateCcw size={14} />}>Réessayer</Button>}>
          {/* Autre cause possible : « Le fichier est verrouillé par un autre programme. » */}
          Le lecteur P: ne répond plus.
        </Alert>
      );
    default:
      return null;
  }
}

/* ---------- Barre de fichier ---------- */
function FileBar({ cfg, fileName, isReject, onChange }: { cfg: Config; fileName: string; isReject: boolean; onChange: () => void }) {
  const label = isReject ? null : errorLabel(cfg.variant);
  const showCount = cfg.phase === 'open';
  return (
    <div className="fl-ac056-filebar">
      <div className="fl-ac056-inner">
        <div className="fl-ac056-filebar-meta">
          {/* Unique h1 de l'écran quand un fichier est ouvert : le nom du fichier, en style data-strong. */}
          <h1 className="fl-ac056-filename fl-type-data-strong">{fileName}</h1>
          <span className="fl-type-caption">{isReject ? 'OUT' : 'IN'}</span>
          <TypeBadge reject={isReject} />
          {cfg.modified && <Badge tone="neutral" icon={<PencilLine size={14} />}>Modifié</Badge>}
          {showCount && isReject && <Badge tone="error" icon={<CircleAlert size={14} />}>3 lignes rejetées</Badge>}
          {showCount && !isReject && label && <Badge tone="error" icon={<CircleAlert size={14} />}>{label}</Badge>}
          {showCount && !isReject && !label && <Badge tone="success" icon={<CircleCheck size={14} />}>Aucune erreur</Badge>}
        </div>
        <div className="fl-ac056-filebar-actions">
          <Button variant="secondary" icon={<FolderOpen />} disabled={cfg.busy} onClick={onChange}>Changer de fichier</Button>
          {cfg.variant === 'struct' && (
            <span className="fl-ac056-save-reason"><CircleAlert size={14} />Fichier mal formé</span>
          )}
          {/* « Enregistrer » : fichiers VEOS uniquement, absent pendant le chargement et pour un fichier illisible.
              Reste actif même s'il reste des erreurs (avertissement non bloquant après l'enregistrement). */}
          {!isReject && cfg.phase === 'open' && (
            <Button variant="primary" icon={<Save />} loading={cfg.busy} disabled={cfg.variant === 'struct'}>
              {cfg.busy ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )}
          {/* Emplacement réservé : bouton « Déposer chez MSP » (version ultérieure), à droite d'« Enregistrer ». Ne pas dessiner. */}
        </div>
      </div>
    </div>
  );
}

/* ---------- Chargement : colonnes en squelettes ---------- */
function LoadingColumns() {
  const lines = (n: number) => Array.from({ length: n }, (_, i) => <Skeleton key={i} width={`${90 - (i % 3) * 15}%`} />);
  return (
    <div className="fl-ac056-inner fl-ac056-main" aria-busy="true">
      <div className="fl-ac056-col"><div className="fl-ac056-skel">{lines(8)}</div></div>
      <div className="fl-ac056-col"><div className="fl-ac056-skel">{lines(10)}</div></div>
      <div className="fl-ac056-col"><div className="fl-ac056-skel">{lines(6)}</div></div>
    </div>
  );
}

/* ---------- Colonne gauche : navigation ---------- */
function NavColumn({ events, ev, tab, itemId, busy, onEvent, onItem, isReject }: {
  events: Ev[]; ev: Ev; tab: TabKey; itemId: string; busy: boolean; isReject: boolean;
  onEvent: (e: Ev) => void; onItem: (i: Item) => void;
}) {
  const noun: [string, string] = isReject ? ['ligne rejetée', 'lignes rejetées'] : ['erreur', 'erreurs'];
  return (
    <section className="fl-ac056-col" aria-label="Évènements">
      <div className="fl-ac056-panel-head">
        <h2 className="fl-ac056-panel-title">Évènements</h2>
        <span className="fl-ac056-panel-count">{`${events.length} évènements`}</span>
      </div>
      <div className="fl-ac056-event-grid fl-ac056-event-head" aria-hidden="true">
        <span /><span>Dossier</span><span>N°</span><span>Contrat</span><span>Code</span><span />
      </div>
      <div className="fl-ac056-col-scroll">
        {/* Liste des évènements + sous-listes : doivent rester rapides avec plusieurs centaines d'évènements (virtualisation). */}
        <ul className="fl-ac056-list">
          {events.map((e) => {
            const selected = e.id === ev.id;
            const showSub = selected && (tab === 'benef' || tab === 'gar');
            return (
              <li key={e.id}>
                <button type="button" disabled={busy} aria-current={selected || undefined}
                  className={cx('fl-ac056-event fl-ac056-event-grid', selected && 'is-selected', e.count > 0 && 'is-error')}
                  onClick={() => onEvent(e)}>
                  {e.count > 0 ? <CircleAlert /> : <FileText />}
                  <span>{e.dossier}</span><span>{e.num}</span><span>{e.contrat}</span><span>{e.code}</span>
                  <CountBadge count={e.count} noun={noun} />
                </button>
                {showSub && (
                  <SubList tab={tab} items={tab === 'benef' ? e.benefs : e.covs} itemId={itemId} busy={busy} onItem={onItem} noun={noun} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SubList({ tab, items, itemId, busy, onItem, noun }: { tab: TabKey; items: Item[]; itemId: string; busy: boolean; onItem: (i: Item) => void; noun: [string, string] }) {
  const isBenef = tab === 'benef';
  const node = (it: Item) => {
    const sel = it.id === itemId;
    const NodeIcon = isBenef ? UserIcon : Shield;
    return (
      <li key={it.id}>
        <button type="button" disabled={busy} aria-current={sel || undefined}
          className={cx('fl-tree-node fl-ac056-node', sel && 'fl-tree-node-selected', it.count > 0 && 'fl-tree-node-error')}
          onClick={() => onItem(it)}>
          {it.count > 0 ? <CircleAlert /> : <NodeIcon />}
          <span className="fl-ac056-node-text"><span className="fl-mono">{it.code}</span>{` · ${it.label}`}</span>
          <CountBadge count={it.count} noun={noun} />
        </button>
      </li>
    );
  };
  return (
    <div className="fl-ac056-sub">
      <p className="fl-type-h6 fl-ac056-sub-title">{isBenef ? 'Bénéficiaires' : 'Garanties'}</p>
      <ul className="fl-tree">
        {items.map((it) => it.absentGroup ? (
          <li key={it.id}>
            {/* Garantie arrivée sans son bénéficiaire dans le fichier de rejet. */}
            <div className="fl-ac056-node-muted"><UserX /><span>{it.label}</span><CountBadge count={it.count} noun={noun} /></div>
            <ul className="fl-tree fl-ac056-nested">{(it.children ?? []).map(node)}</ul>
          </li>
        ) : node(it))}
      </ul>
    </div>
  );
}

/* ---------- Colonne centrale : onglets + formulaire ---------- */
function TabButton({ label, mono, count, selected, disabled, onClick, noun }: {
  label: string; mono?: boolean; count: number; selected: boolean; disabled: boolean; onClick: () => void; noun: [string, string];
}) {
  return (
    <button type="button" role="tab" aria-selected={selected} disabled={disabled}
      title={disabled ? 'Entité absente de cet évènement' : undefined}
      className={cx('fl-tab', count > 0 && 'fl-tab-error', mono && 'fl-ac056-tab-mono')} onClick={onClick}>
      {count > 0 && <CircleAlert size={14} />}
      <span>{label}</span>
      <CountBadge count={count} noun={noun} />
      {disabled && <span className="fl-sr-only"> (absente)</span>}
    </button>
  );
}

function EntityColumn({ ev, tab, sub, item, busy, cfg, isReject, onTab, onSub, targetField }: {
  ev: Ev; tab: TabKey; sub: string; item?: Item; busy: boolean; cfg: Config; isReject: boolean;
  onTab: (t: TabKey) => void; onSub: (s: string) => void; targetField?: string;
}) {
  const noun: [string, string] = isReject ? ['ligne rejetée', 'lignes rejetées'] : ['erreur', 'erreurs'];
  const hasSub = (tab === 'benef' || tab === 'gar') && !!item;
  return (
    <section className="fl-ac056-col" aria-label="Entité">
      <div className="fl-ac056-tabbar">
        <div className="fl-ac056-context">
          <span>Dossier <b>{ev.dossier}</b></span><span>Évènement <b>{ev.num}</b></span>
          <span>Contrat <b>{ev.contrat}</b></span><span>Code <b>{ev.code}</b></span>
        </div>
        <div role="tablist" aria-label="Entités de l’évènement" className="fl-tabs fl-ac056-tabs">
          {TABS.map((t) => (
            <TabButton key={t.key} label={t.label} mono={t.mono} count={ev.tabCounts[t.key] ?? 0} noun={noun}
              selected={t.key === tab} disabled={busy || ev.absent.includes(t.key)} onClick={() => onTab(t.key)} />
          ))}
        </div>
        {hasSub && (
          <div role="tablist" aria-label={tab === 'benef' ? 'Entités du bénéficiaire' : 'Entités de la garantie'} className="fl-tabs fl-ac056-tabs fl-ac056-subtabs">
            {SUBTABS[tab as 'benef' | 'gar'].map((s) => (
              <TabButton key={s} label={s} mono count={item!.subCounts[s] ?? 0} noun={noun}
                selected={s === sub} disabled={busy || item!.absentSub.includes(s)} onClick={() => onSub(s)} />
            ))}
          </div>
        )}
      </div>
      <div className="fl-ac056-col-scroll fl-ac056-entity">
        <EntityBody ev={ev} tab={tab} sub={sub} item={item} busy={busy} cfg={cfg} isReject={isReject} targetField={targetField} />
      </div>
    </section>
  );
}

function EntityBody({ ev, tab, sub, item, busy, cfg, isReject, targetField }: {
  ev: Ev; tab: TabKey; sub: string; item?: Item; busy: boolean; cfg: Config; isReject: boolean; targetField?: string;
}) {
  if ((tab === 'benef' || tab === 'gar') && !item) {
    return <p className="fl-ac056-empty-entity">{tab === 'benef' ? 'Choisissez un bénéficiaire dans la colonne de gauche.' : 'Choisissez une garantie dans la colonne de gauche.'}</p>;
  }
  const code = tab === 'benef' || tab === 'gar' ? sub : tab === 'coord' ? 'Coordonnées' : tab;
  const head = (title: React.ReactNode, line?: string) => (
    <div className="fl-ac056-entity-head">
      <h2 className="fl-ac056-entity-title">{title}</h2>
      {line && <span className="fl-type-data-sm" style={{ color: 'var(--text-muted)' }}>{`Ligne ${line}`}</span>}
    </div>
  );
  const codeTitle = (c: string, name?: string) => /^\d+$/.test(c)
    ? <><span className="fl-mono">{c}</span>{name ? ` · ${name}` : ''}</>
    : <>{c}</>;

  /* ----- Fichier de rejet : tout est en lecture seule, encadré MSP en tête de l'entité concernée ----- */
  if (isReject) {
    const msp = (codeMsp: string | null, message: string, explication: string) => (
      <Alert tone="error" className="fl-ac056-msp" title={<>{'Ligne rejetée par MSP · '}{codeMsp ? <span className="fl-type-data-strong">{codeMsp}</span> : 'code inconnu'}</>}>
        <p>{`Message MSP${NB}: ${message}`}</p>
        <p>{`Explication${NB}: ${explication}`}</p>
      </Alert>
    );
    if (ev.id === 'r1' && tab === 'benef' && sub === '400') {
      return (
        <>
          {msp('ERR014', `«${NB}La date de naissance ne correspond pas au N°${NB}INSEE.${NB}»`,
            'Le mois et l’année de naissance doivent correspondre aux chiffres 2 à 5 du N° INSEE. Corrigez la fiche dans VEOS puis relancez l’export.')}
          {head(codeTitle('400', 'Bénéficiaire'), '3')}
          <div className="fl-ac056-form">
            {/* Valeurs du fichier de rejet décodées en Windows-1252 : les accents (« Réunion ») doivent s'afficher correctement. */}
            <ROField label="Rang" value="10" mono chars={2} />
            <ROField label="Date d’ancienneté" value="01/09/2023" />
            <ROField label="Type d’assuré" value="Assuré principal" />
            <ROField label="Pays" value="Réunion" />
            <ROField label="Département" value="974 – La Réunion" />
            <ROField label="Situation de famille" value="Célibataire" />
            <ROField label="Sexe" value="Masculin" />
            <ROField label="Date de naissance" value="12/03/1979" />
            <ROField label="Catégorie sociale" value="Salarié cadre" />
            <ROField label="N° INSEE" value="1790397411222" mono chars={13} />
            <ROField label="Clé INSEE" value="45" mono chars={2} />
          </div>
        </>
      );
    }
    if (ev.id === 'r1' && tab === 'gar' && sub === '800') {
      return (
        <>
          {msp('ERR021', `«${NB}Le code garantie n’est pas ouvert à la date d’effet.${NB}»`,
            'La garantie SANTE1 n’est souscrite qu’à partir d’une date postérieure à la date d’effet indiquée. Vérifiez la date d’effet dans VEOS.')}
          {head(codeTitle('800'), '7')}
          <PlaceholderForm code="800" />
        </>
      );
    }
    if (ev.id === 'r2' && tab === 'gar' && sub === '700') {
      return (
        <>
          {msp(null, `«${NB}Garantie refusée.${NB}»`, 'Erreur inconnue. Contactez le service informatique.')}
          {head(codeTitle('700'), '12')}
          <PlaceholderForm code="700" />
        </>
      );
    }
    return <>{head(codeTitle(code))}<PlaceholderForm code={code} /></>;
  }

  /* ----- Fichier VEOS ----- */
  const v = cfg.variant;
  const zero = v === 'zero' || v === 'minor';
  if (ev.id === 'e2' && tab === 'benef' && sub === '400') {
    const dobError = !zero;
    const cleError = v === 'err' || v === 'struct';
    return (
      <>
        {head(codeTitle('400', 'Bénéficiaire'), '412')}
        <div className="fl-ac056-form">
          <ROField label="Rang" value="10" mono chars={2} />
          <ROField label="Date d’ancienneté" value="01/01/2024" />
          <ROField label="Type d’assuré" value="Assuré principal" />
          <ROField label="Pays" value="France" />
          <ROField label="Département" value="69 – Rhône" />
          <ROField label="Situation de famille" value="Marié(e)" />
          <ROField label="Sexe" value="Féminin" />
          {dobError
            ? <EditField key={`dob-${v}`} label="Date de naissance" value="31/02/1985" busy={busy} target={targetField === 'dob'}
                error={`Date inexistante${NB}: saisissez une date réelle au format JJ/MM/AAAA.`} />
            : <ROField label="Date de naissance" value="15/02/1985" />}
          <ROField label="Catégorie sociale" value="Salarié non cadre" />
          <ROField label="N° INSEE" value="2850269123456" mono chars={13} />
          {cleError
            ? <EditField key={`cle-${v}`} label="Clé INSEE" value="99" mono chars={2} busy={busy} target={targetField === 'cle'}
                error={`La clé ne correspond pas au N°${NB}INSEE${NB}: 2 chiffres attendus, de 01 à 97.`} />
            : v === 'mod'
              /* Champ corrigé (état 12) : plus de marquage rouge à aucun niveau. Qu'il reste modifiable ou non se décide au développement. */
              ? <EditField key={`cle-${v}`} label="Clé INSEE" value="97" mono chars={2} busy={busy} />
              : <ROField label="Clé INSEE" value="97" mono chars={2} />}
        </div>
      </>
    );
  }
  if (ev.id === 'e2' && tab === 'gar' && sub === '700' && item?.id === 'c2b') {
    return (
      <>
        {head(codeTitle('700'), '415')}
        <div className="fl-ac056-form">
          <ROField label="Code garantie" value="SANTE2" mono chars={6} />
          <ROField label="Libellé" value="Option renfort" />
          {zero
            ? <ROField label="Date d’effet" value="01/03/2026" />
            : <EditField key={`effet-${v}`} label="Date d’effet" value="01/01/2026" busy={busy} target={targetField === 'effet'}
                error="Date d’effet antérieure à la date d’adhésion." />}
          <ROField label="Date d’adhésion" value="01/03/2026" />
        </div>
      </>
    );
  }
  if (ev.id === 'e3' && tab === '120') {
    return (
      <>
        {head(codeTitle('120'), `1${NB}102`)}
        <div className="fl-ac056-form">
          {zero
            ? <ROField label="Code produit" value="PRD-FICTIF-02" mono chars={13} />
            : <EditField key={`produit-${v}`} label="Code produit" value="PRD-FICTIF-99" mono chars={13} busy={busy} target={targetField === 'produit'}
                error="Code produit inconnu du référentiel." />}
          <ROField label="Date d’effet" value="01/10/2026" />
          <ROField label="Libellé" value="Valeur fictive" />
        </div>
      </>
    );
  }
  return <>{head(codeTitle(code))}<PlaceholderForm code={code} /></>;
}

/** Formulaire factice de 4 champs en lecture seule pour les entités non détaillées. */
function PlaceholderForm({ code }: { code: string }) {
  return (
    <div className="fl-ac056-form">
      <ROField label="Code enregistrement" value={/^\d+$/.test(code) ? code : '050'} mono chars={3} />
      <ROField label="Date d’effet" value="01/01/2026" />
      <ROField label="Libellé" value="Valeur fictive" />
      <ROField label="Référence" value="REF-FICTIVE-01" mono chars={14} />
    </div>
  );
}

let fieldSeq = 0;
function useId(): string { const [id] = useState(() => `fl-ac056-f${++fieldSeq}`); return id; }
function monoWidth(chars?: number, withIcon?: boolean): React.CSSProperties | undefined {
  return chars ? { width: `calc(${chars}ch + var(--space-3) * 2 + var(--border-width) * 2${withIcon ? ' + var(--icon-md) + var(--space-2)' : ''})`, maxWidth: '100%' } : undefined;
}

/** Champ en lecture seule (fond neutral-50, aucune affordance de saisie). Les listes et les dates affichent leur valeur de la même façon. */
function ROField({ label, value, mono, chars }: { label: string; value: string; mono?: boolean; chars?: number }) {
  const id = useId();
  return (
    <div className="fl-field">
      <label className="fl-label" htmlFor={id}>{label}</label>
      <div className="fl-control-wrap" style={mono ? monoWidth(chars) : undefined}>
        <input id={id} className={cx('fl-input', mono && 'fl-input-mono')} readOnly value={value} spellCheck={false} />
      </div>
    </div>
  );
}

/** Champ en erreur, seul champ modifiable. Le contrôle s'exécute quand l'utilisateur QUITTE le champ (Tab ou clic ailleurs),
 *  jamais à chaque frappe ; il met à jour les marquages à tous les niveaux (champ, onglet, nœud, évènement, barre de fichier)
 *  et le récapitulatif. Aucun saut automatique vers l'erreur suivante. */
function EditField({ label, value, mono, chars, error, busy, target }: { label: string; value: string; mono?: boolean; chars?: number; error?: string; busy?: boolean; target?: boolean }) {
  const id = useId();
  return (
    <div className={cx('fl-field', target && 'fl-ac056-field-target')}>
      <label className="fl-label" htmlFor={id}>{label}</label>
      <div className="fl-control-wrap" style={mono ? monoWidth(chars, !!error) : undefined}>
        <input id={id} className={cx('fl-input', mono && 'fl-input-mono', !!error && 'fl-input-has-icon')} defaultValue={value}
          maxLength={mono && chars ? chars : undefined} spellCheck={false} disabled={busy}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
          /* onBlur : contrôle du champ (non codé dans cette maquette). */ />
        {error && <CircleAlert className="fl-input-status-icon" />}
      </div>
      {error && <p className="fl-error-msg" id={`${id}-error`}><CircleAlert size={14} /><span>{error}</span></p>}
    </div>
  );
}

/* ---------- Colonne droite : récapitulatif des erreurs ---------- */
function ErrorColumn({ rows, minor, current, busy, isReject, onPick, onPrev, onNext }: {
  rows: ErrRow[]; minor: string[]; current: number; busy: boolean; isReject: boolean;
  onPick: (i: number) => void; onPrev: () => void; onNext: () => void;
}) {
  const n = rows.length;
  const count = isReject ? `${n} lignes rejetées` : n === 0 ? null : `${n} erreur${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}`;
  return (
    <section className="fl-ac056-col" aria-label={isReject ? 'Lignes rejetées' : 'Erreurs'}>
      <div className="fl-ac056-panel-head">
        <h2 className="fl-ac056-panel-title">{isReject ? 'Lignes rejetées' : 'Erreurs'}</h2>
        {count && <span className="fl-ac056-panel-count">{count}</span>}
        {n > 0 && (
          <div className="fl-ac056-panel-actions">
            <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} disabled={busy || current <= 0} onClick={onPrev}>Précédente</Button>
            <Button variant="ghost" size="sm" iconAfter={<ChevronRight size={14} />} disabled={busy || current >= n - 1} onClick={onNext}>Suivante</Button>
          </div>
        )}
      </div>
      <div className="fl-ac056-col-scroll">
        {n === 0 && <div className="fl-ac056-noerror" role="status"><CircleCheck />Aucune erreur</div>}
        {n > 0 && (
          /* Ordre du fichier. Se met à jour après chaque correction ; doit rester rapide avec des centaines d'erreurs (virtualisation).
             Un clic ouvre l'évènement, l'onglet et le champ concernés (ou la ligne pour une anomalie sans champ). */
          <ol className="fl-ac056-errlist">
            {rows.map((r, i) => (
              <li key={r.id}>
                <button type="button" disabled={busy} aria-current={i === current || undefined}
                  className={cx('fl-ac056-errrow', i === current && 'is-current')} onClick={() => onPick(i)}>
                  <CircleAlert />
                  <span className="fl-ac056-errrow-head">
                    <span className="fl-type-data-sm">{`Ligne ${r.line}`}</span>
                    {r.structure
                      ? <span className="fl-ac056-errrow-field">Structure</span>
                      : <span className="fl-ac056-code">{r.entity}</span>}
                    {r.field && <span className="fl-ac056-errrow-field">{r.field}</span>}
                    {isReject && (r.code ? <span className="fl-ac056-code">{r.code}</span> : <span className="fl-type-caption">aucun code</span>)}
                  </span>
                  <span className="fl-ac056-errrow-msg">{isReject ? `Message MSP${NB}: ${r.message}` : r.message}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {minor.length > 0 && (
          <div className="fl-ac056-minor">
            <h3 className="fl-type-h6 fl-ac056-minor-title"><Info size={14} />{`Anomalies non bloquantes (${minor.length})`}</h3>
            <ul>{minor.map((m) => <li key={m}><Info size={14} /><span>{m}</span></li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Journal de la session (bas d'écran, repliable) ---------- */
const LEVEL: Record<Level, { cls: string; icon?: React.ReactNode }> = {
  TITRE: { cls: 'titre' },
  INFO: { cls: 'info' },
  'Succès': { cls: 'succes', icon: <CircleCheck size={14} /> },
  Erreur: { cls: 'erreur', icon: <CircleAlert size={14} /> },
};

function SessionLog({ lines, open, onToggle }: { lines: LogLine[]; open: boolean; onToggle: () => void }) {
  const last = lines[lines.length - 1];
  return (
    <section className="fl-ac056-log" aria-label="Journal de la session">
      {/* Session en cours uniquement ; distinct de l'entrée « Journal » de la navigation (historique des sessions). */}
      <button type="button" className="fl-ac056-log-bar" aria-expanded={open} onClick={onToggle}>
        <ScrollText />
        <span className="fl-ac056-log-title">Journal de la session</span>
        <span className="fl-type-caption">{`${lines.length} ligne${lines.length > 1 ? 's' : ''}`}</span>
        {!open && last && (
          <span className="fl-ac056-log-last">
            <span className="fl-ac056-log-time">{last.time}</span>
            <span className={cx('fl-ac056-level', `fl-ac056-level-${LEVEL[last.level].cls}`)}>{LEVEL[last.level].icon}{last.level}</span>
            <span>{last.message}</span>
          </span>
        )}
        {open ? <ChevronDown className="fl-ac056-log-chevron" /> : <ChevronUp className="fl-ac056-log-chevron" />}
      </button>
      {open && (
        <div className="fl-ac056-log-panel">
          {/* Ligne la plus récente en bas ; doit rester rapide sur une longue session. */}
          <ol className="fl-ac056-log-lines fl-ac056-inner">
            {lines.map((l, i) => (
              <li key={i} className="fl-ac056-log-line">
                <span className="fl-ac056-log-time">{l.time}</span>
                <span className={cx('fl-ac056-level', `fl-ac056-level-${LEVEL[l.level].cls}`)}>{LEVEL[l.level].icon}{l.level}</span>
                <span className={`fl-ac056-msg-${LEVEL[l.level].cls}`}>{l.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/* ---------- Dialogue de confirmation (ConfirmDialog, dialog-width-sm) ---------- */
function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fl-overlay">
      <div className="fl-dialog fl-dialog-sm" role="alertdialog" aria-modal="true" aria-labelledby="fl-ac056-dlg-title" aria-describedby="fl-ac056-dlg-desc">
        <div className="fl-dialog-header">
          <TriangleAlert className="fl-dialog-header-icon fl-dialog-header-icon-warning" size={20} />
          <h2 className="fl-dialog-title" id="fl-ac056-dlg-title">{title.replace(' ?', `${NB}?`)}</h2>
          <Button variant="ghost" size="sm" className="fl-btn-icon-only fl-dialog-close" aria-label="Fermer" icon={<X />} onClick={onCancel} />
        </div>
        <div className="fl-dialog-body"><p className="fl-dialog-desc" id="fl-ac056-dlg-desc">{description}</p></div>
        <div className="fl-dialog-footer">
          {/* Focus initial sur « Annuler » : Entrée ne confirme jamais par accident. */}
          <Button variant="outline" autoFocus onClick={onCancel}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Aperçu : barre d'états (hors application) + écran
 * ========================================================================== */
export default function Ac056Preview() {
  const [state, setState] = useState<StateId>('errors');
  const [env, setEnv] = useState<Env>('recette');
  const [journalDown, setJournalDown] = useState(false);
  const [rejectUnknown, setRejectUnknown] = useState(false);
  const chip = (pressed: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" className="fl-preview-chip" aria-pressed={pressed} onClick={onClick}>{label}</button>
  );
  return (
    <div className="fl-root fl-preview">
      <style>{FLUSSI_CSS}</style>
      <style>{EXTENSION_CSS}</style>
      <div className="fl-preview-toolbar" role="toolbar" aria-label="États de la maquette">
        {STATE_GROUPS.map((g) => (
          <div key={g.label} className="fl-preview-group">
            <span className="fl-preview-label">{g.label}</span>
            <div className="fl-preview-options">{g.states.map((s) => chip(state === s.id, s.label, () => setState(s.id)))}</div>
          </div>
        ))}
        {state === 'reject' && (
          <div className="fl-preview-group">
            <span className="fl-preview-label">Encadré MSP</span>
            <div className="fl-preview-options">
              {chip(!rejectUnknown, 'ERR014', () => setRejectUnknown(false))}
              {chip(rejectUnknown, 'Code inconnu', () => setRejectUnknown(true))}
            </div>
          </div>
        )}
        <div className="fl-preview-group">
          <span className="fl-preview-label">Environnement</span>
          <div className="fl-preview-options">
            {chip(env === 'recette', 'Recette', () => setEnv('recette'))}
            {chip(env === 'production', 'Production', () => setEnv('production'))}
          </div>
        </div>
        <div className="fl-preview-group">
          <span className="fl-preview-label">18 · Journal non enregistré</span>
          <div className="fl-preview-options">
            {chip(!journalDown, 'Non', () => setJournalDown(false))}
            {chip(journalDown, 'Oui', () => setJournalDown(true))}
          </div>
        </div>
      </div>
      <AppFrame env={env} navDisabled={CONFIG[state].busy}
        globalAlert={journalDown ? (
          <Alert tone="error" className="fl-ac056-global-alert" title="Journal non enregistré">
            {`2 lignes en attente${NB}: Flussi réessaie à chaque nouvel évènement. Vérifiez que le lecteur P: est connecté.`}
          </Alert>
        ) : undefined}>
        {/* La clé remonte l'écran à chaque changement d'état : sélection par défaut de l'état choisi. */}
        <Ac056Screen key={`${state}-${rejectUnknown}`} state={state} rejectUnknown={rejectUnknown} onState={setState} />
      </AppFrame>
    </div>
  );
}
