# Flussi — Design system (DESIGN.md)

The strict reference for every screen of Flussi, the Windows desktop tool that checks, corrects and sends the daily file to the insurance partner. Every value used by a component or a screen comes from a token in this file. Light mode only.

- Machine-readable source: `tokens.json` (this system). CSS custom properties: `handoff/flussi-tokens.css`. Component styles: `handoff/flussi.css`. React components: `handoff/*.tsx`.
- CSS variable = `--` + token name (`blue-500` → `var(--blue-500)`).
- Units: px for the desktop app (Windows display scaling 100–125% scales them); rem given where it helps (1rem = 16px).

---

## 1. Principles

1. **Unmistakable state.** Status, warnings, errors and the active environment are always visible and always written in words with an icon. Colour reinforces, never carries meaning alone.
2. **One blue, one navy, everything else neutral.** `blue-500` means "you can act here". `navy-700` means "this is Flussi" (header, headings). Semantic colours mean success / warning / error / info and nothing else. Violet means Recette and nothing else.
3. **Dense but calm.** 14px body, 32px controls, 4px grid, borders rather than shadows, small radii. Readable on a 1920×1080 office monitor at 100–125% scaling.
4. **Raw data looks raw.** File values, codes, identifiers, fingerprints use IBM Plex Mono with tabular figures, exactly as in the file.
5. **French first.** Labels run 20–30% longer than English: buttons and tabs size to their content, never truncate an action label, allow two-line labels in table headers.

---

## 2. Colour

### 2.1 Brand light blue — `blue-*` (anchor: `blue-500`)

Print reference **C100 M30 Y0 K5**. A naive CMYK→RGB formula gives `#00AAF2`, far too bright because it ignores how ink behaves on paper; a colour-managed conversion for coated paper lands around `#0077BD`–`#007CC2`. Flussi uses **`#0077BD`**: visually the print blue, and white text on it reaches 4.80:1 (the brief's `#007CC2` reaches only 4.50:1, with no margin). Scale built around it at constant hue.

| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `blue-50` | `#EEF6FC` | 1.09 | Ghost button hover, selected row in a table, tinted info on interactive areas. |
| `blue-100` | `#D5E9F7` | 1.25 | Selection background (selected row, selected tree node) with `neutral-900` text. |
| `blue-200` | `#AAD2EE` | 1.60 | Borders of selected items on `blue-50`; progress track highlight. |
| `blue-300` | `#75B5E0` | 2.22 | Focus ring and links ON the navy header (`focus-on-dark`, 6.3:1 on `navy-700`). Never text on white. |
| `blue-400` | `#3A95CF` | 3.29 | Decorative only (charts, illustrations of state). Never text on white (3.3:1). |
| `blue-500` | `#0077BD` | 4.80 | BRAND light blue (C100 M30 Y0 K5). Primary button fill, focus ring, checked controls, progress fill. White text on it: 4.8:1. |
| `blue-600` | `#00649F` | 6.32 | Primary button hover; link text on white and `neutral-50` (6.3:1); ghost button text. |
| `blue-700` | `#005182` | 8.40 | Primary button pressed; link hover; text on `blue-50`/`blue-100` (6.7:1+). |
| `blue-800` | `#003F65` | 11.06 | Strong text on blue tints when more weight is needed. |
| `blue-900` | `#002D49` | 14.27 | Reserved: darkest step of the scale, not used by the current components. |

### 2.2 Brand navy — `navy-*` (anchor: `navy-700`)

Print reference **C100 M80 Y0 K45** → **`#13295B`** (colour-managed rendering for coated paper, as supplied; the naive formula's `#001C8C` is far too saturated). The anchor sits at 700 so the lighter steps can serve as tints for secondary actions and info.

| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `navy-50` | `#EEF1F8` | 1.13 | Secondary button fill; info background (`info-bg`). |
| `navy-100` | `#D9E0EF` | 1.32 | Secondary button hover. |
| `navy-200` | `#B3C0DD` | 1.83 | Secondary button border; info border (`info-border`). |
| `navy-300` | `#8698C4` | 2.88 | Hairlines and inactive icons on the navy header. |
| `navy-400` | `#5A71A9` | 4.81 | Decorative only on white (4.8:1 at most for large type). |
| `navy-500` | `#38528D` | 7.61 | Info solid fill (white text 7.6:1). |
| `navy-600` | `#233D77` | 10.47 | Info text (`info-text`) on white and `info-bg`. |
| `navy-700` | `#13295B` | 14.04 | BRAND navy (C100 M80 Y0 K45). App header background, headings h1–h4, secondary button text. White text on it: 14:1. |
| `navy-800` | `#0E1F46` | 16.12 | App header pressed/active item. |
| `navy-900` | `#091431` | 18.17 | Reserved: darkest step, for an identity mark on white. |

### 2.3 Neutrals — `neutral-*` and `white`

Cool grey, slightly tinted towards the navy so it sits with the brand. No washed-out greys for text: the lightest text grey is `neutral-600` (except placeholders, `neutral-500`, on white only).

| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `white` | `#FFFFFF` | 1.00 | Card, dialog, input and popover surface (`bg-surface`). Text on brand and semantic solids. |
| `neutral-50` | `#F7F8FA` | 1.06 | Page background (`bg-page`), read-only field background, table zebra rows. |
| `neutral-100` | `#EEF0F3` | 1.14 | Subtle surface (`bg-subtle`): table header, disabled control fill, skeleton highlight. |
| `neutral-200` | `#E0E4E9` | 1.28 | Subtle dividers inside cards and tables (`border-subtle`); skeleton base; progress track. |
| `neutral-300` | `#C9CFD7` | 1.57 | Default border of cards, tables, dialogs (`border-default`). |
| `neutral-400` | `#858E9A` | 3.32 | Control borders: inputs, selects, checkboxes, switch track off (`border-control`, 3.3:1 on white). Disabled text. |
| `neutral-500` | `#6A7380` | 4.80 | Placeholder text on white only (4.8:1); input border on hover. |
| `neutral-600` | `#525A66` | 6.97 | Secondary text: hints, captions, metadata, table headers (`text-muted`, 7.0:1 on white, 6.1:1 on `neutral-100`). |
| `neutral-700` | `#3D444F` | 9.82 | Field labels and icons next to text. |
| `neutral-800` | `#29303A` | 13.31 | Tooltip background alternative; strong secondary text. |
| `neutral-900` | `#181D24` | 16.93 | Default text (`text-default`, 16.9:1 on white); tooltip background. |

### 2.4 Semantic colours

Each set has five variants: `-bg` (tinted background), `-border` (decorative border on that background), `-text` (text and icons on white, `bg-page` and the set's `-bg`), `-solid` (strong fill), `-on-solid` (text on the fill). Info is built from the navy scale so that it never competes with interactive blue.

| Set | `-bg` | `-border` | `-text` | `-solid` | `-on-solid` | text on bg | on-solid on solid |
|---|---|---|---|---|---|---|---|
| **success** | `#EBF6EF` | `#93CFA8` | `#18663A` | `#1C7A44` | `#FFFFFF` | 6.3:1 | 5.4:1 |
| **warning** | `#FFF5DD` | `#EDC26A` | `#7F4E00` | `#E8A317` | `#181D24` | 6.5:1 | 7.8:1 |
| **error** | `#FDEDEC` | `#EDA39E` | `#B0241A` | `#B8261B` | `#FFFFFF` | 5.9:1 | 6.3:1 |
| **info** | `#EEF1F8` | `#B3C0DD` | `#233D77` | `#38528D` | `#FFFFFF` | 9.3:1 | 7.6:1 |

- **success** — File valid, file of the day, upload confirmed.
- **warning** — Needs attention but not blocking: file is not today's, partial rejection, stale data. `warning-solid` takes dark text (`warning-on-solid` = `neutral-900`): white on amber fails contrast.
- **error** — Blocking: field in error, check failed, upload failed. Always with the `CircleAlert` icon and words. Extra: `error-solid-hover` `#96201A` for the destructive button hover.
- **info** — Neutral information and finished states that are not a success per se ("Déposé").

Success and error differ in hue AND are always paired with distinct icons (`CircleCheck` vs `CircleAlert`) and words, so they stay distinguishable for colour-blind users.

### 2.5 Test-environment colour — `testenv-*`

A dedicated violet, used only for the Recette environment: far from the brand blue, from amber (warning) and from red (error).

| Token | Hex | Use |
|---|---|---|
| `testenv-solid` | `#6B1F9C` | TEST ENVIRONMENT ("Recette") banner fill. Dedicated violet: never used for anything else, never for a semantic state. |
| `testenv-stripe` | `#7A2DAC` | Second stripe of the Recette banner pattern (45°, 8px bands) — the stripes make the banner recognisable without colour. |
| `testenv-on-solid` | `#FFFFFF` | Text and icon on the Recette banner (9.1:1 on `testenv-solid`, 7.5:1 on `testenv-stripe`). |
| `testenv-bg` | `#F5EEFA` | Background of the "Recette" badge in the header and in Settings. |
| `testenv-border` | `#C7A6DF` | Border of the "Recette" badge. |
| `testenv-text` | `#5E1C8A` | Text of the "Recette" badge on `testenv-bg` (9.2:1) or white. |

### 2.6 Role tokens (aliases)

Screens use these role names first; they point at the scales above.

| Token | Resolves to | Use |
|---|---|---|
| `bg-page` | `#F7F8FA` (= `neutral-50`) | Window/page background behind cards and tables. |
| `bg-surface` | `#FFFFFF` (= `white`) | Cards, dialogs, inputs, popovers, table body. |
| `bg-subtle` | `#EEF0F3` (= `neutral-100`) | Table header, disabled controls, read-only zones. |
| `bg-header` | `#13295B` (= `navy-700`) | Application header bar (identity). |
| `bg-overlay` | `#181D2466` | Dialog backdrop: `neutral-900` at 40%. |
| `text-default` | `#181D24` (= `neutral-900`) | Body text, field values, table cells — on `bg-page`, `bg-surface`, `bg-subtle`. |
| `text-heading` | `#13295B` (= `navy-700`) | Headings h1–h4 and card titles on `bg-page` and `bg-surface` (14:1). |
| `text-muted` | `#525A66` (= `neutral-600`) | Hints, captions, metadata, table header labels — on `bg-page`, `bg-surface`, `bg-subtle` (6.1:1 min). |
| `text-label` | `#3D444F` (= `neutral-700`) | Field labels (9.8:1 on white). |
| `text-placeholder` | `#6A7380` (= `neutral-500`) | Input placeholder, on white only (4.8:1). |
| `text-disabled` | `#858E9A` (= `neutral-400`) | Disabled labels and values (exempt from contrast, always paired with a disabled cursor/fill). |
| `text-on-brand` | `#FFFFFF` (= `white`) | Text on `blue-500`, `navy-700`, `error-solid`. |
| `border-subtle` | `#E0E4E9` (= `neutral-200`) | Dividers inside cards, table row separators. |
| `border-default` | `#C9CFD7` (= `neutral-300`) | Outer border of cards, tables, dialogs, tabs. |
| `border-control` | `#858E9A` (= `neutral-400`) | Border of inputs, selects, checkboxes, radios, outline buttons (3.3:1 on white). |
| `border-control-hover` | `#6A7380` (= `neutral-500`) | Control border on hover. |
| `action-primary` | `#0077BD` (= `blue-500`) | Primary action fill. |
| `action-primary-hover` | `#00649F` (= `blue-600`) | Primary action hover. |
| `action-primary-active` | `#005182` (= `blue-700`) | Primary action pressed. |
| `link` | `#00649F` (= `blue-600`) | Links and ghost-button text on white / `bg-page` (6.3:1). |
| `link-hover` | `#005182` (= `blue-700`) | Link hover. |
| `focus` | `#0077BD` (= `blue-500`) | Focus ring colour on light surfaces (4.5:1 on `bg-page`). |
| `focus-on-dark` | `#75B5E0` (= `blue-300`) | Focus ring on the navy header (6.3:1 on `navy-700`). |
| `selection-bg` | `#D5E9F7` (= `blue-100`) | Selected table row / tree node background, with `text-default`. |
| `selection-border` | `#0077BD` (= `blue-500`) | Selected tree node / active tab indicator (2px). |

### 2.7 Contrast checks (WCAG 2.1 AA)

| Foreground | Background | Ratio | Requirement |
|---|---|---|---|
| `text-default` | `bg-page` | 15.94:1 | 4.5:1 (text) ✓ |
| `text-muted` | `bg-subtle` | 6.10:1 | 4.5:1 (text) ✓ |
| `text-muted` | `bg-page` | 6.56:1 | 4.5:1 (text) ✓ |
| `text-label` | `bg-surface` | 9.82:1 | 4.5:1 (text) ✓ |
| `text-heading` | `bg-page` | 13.21:1 | 4.5:1 (text) ✓ |
| `link` | `bg-page` | 5.95:1 | 4.5:1 (text) ✓ |
| `text-placeholder` | `bg-surface` | 4.80:1 | 4.5:1 (text) ✓ |
| `border-control` | `bg-surface` | 3.32:1 | 3:1 (non-text: border / focus) ✓ |
| `border-control` | `bg-page` | 3.12:1 | 3:1 (non-text: border / focus) ✓ |
| `text-on-brand` | `action-primary` | 4.80:1 | 4.5:1 (text) ✓ |
| `text-on-brand` | `action-primary-hover` | 6.32:1 | 4.5:1 (text) ✓ |
| `text-on-brand` | `bg-header` | 14.04:1 | 4.5:1 (text) ✓ |
| `focus` | `bg-page` | 4.52:1 | 3:1 (non-text: border / focus) ✓ |
| `focus` | `bg-surface` | 4.80:1 | 3:1 (non-text: border / focus) ✓ |
| `focus-on-dark` | `bg-header` | 6.31:1 | 3:1 (non-text: border / focus) ✓ |
| `blue-700` | `blue-50` | 7.69:1 | 4.5:1 (text) ✓ |
| `navy-700` | `navy-50` | 12.42:1 | 4.5:1 (text) ✓ |
| `navy-700` | `navy-100` | 10.60:1 | 4.5:1 (text) ✓ |
| `text-default` | `selection-bg` | 13.57:1 | 4.5:1 (text) ✓ |
| `blue-600` | `blue-50` | 5.78:1 | 4.5:1 (text) ✓ |
| `success-text` | `success-bg` | 6.32:1 | 4.5:1 (text) ✓ |
| `warning-text` | `warning-bg` | 6.47:1 | 4.5:1 (text) ✓ |
| `error-text` | `error-bg` | 5.94:1 | 4.5:1 (text) ✓ |
| `info-text` | `info-bg` | 9.26:1 | 4.5:1 (text) ✓ |
| `success-on-solid` | `success-solid` | 5.36:1 | 4.5:1 (text) ✓ |
| `warning-on-solid` | `warning-solid` | 7.81:1 | 4.5:1 (text) ✓ |
| `error-on-solid` | `error-solid` | 6.30:1 | 4.5:1 (text) ✓ |
| `info-on-solid` | `info-solid` | 7.61:1 | 4.5:1 (text) ✓ |
| `error-solid` | `bg-surface` | 6.30:1 | 4.5:1 (text) ✓ |
| `white` | `error-solid-hover` | 8.34:1 | 4.5:1 (text) ✓ |
| `testenv-on-solid` | `testenv-solid` | 9.13:1 | 4.5:1 (text) ✓ |
| `testenv-on-solid` | `testenv-stripe` | 7.50:1 | 4.5:1 (text) ✓ |
| `testenv-text` | `testenv-bg` | 9.20:1 | 4.5:1 (text) ✓ |
| `white` | `neutral-900` | 16.93:1 | 4.5:1 (text) ✓ |
| `error-text` | `bg-page` | 6.35:1 | 4.5:1 (text) ✓ |
| `warning-text` | `bg-surface` | 7.02:1 | 4.5:1 (text) ✓ |
| `success-text` | `bg-surface` | 7.00:1 | 4.5:1 (text) ✓ |

Disabled text (`text-disabled`) is exempt from contrast requirements (WCAG 1.4.3) and is always paired with a disabled fill and `cursor: not-allowed`.

---

## 3. Typography

### 3.1 Families

| Role | Family | Stack (`--font-*`) | Files |
|---|---|---|---|
| UI | **IBM Plex Sans** (SIL OFL 1.1) | `"IBM Plex Sans", "Segoe UI", Arial, sans-serif` | `fonts/IBMPlexSans-Regular.woff2` (400), `-Medium` (500), `-SemiBold` (600) |
| Raw data, codes | **IBM Plex Mono** (SIL OFL 1.1) | `"IBM Plex Mono", Consolas, "Courier New", monospace` | `fonts/IBMPlexMono-Regular.woff2` (400), `-Medium` (500) |

Why: IBM Plex is free, hints well under Windows ClearType, has a sober corporate voice, open apertures that keep `1 l I` and `0 O` apart, and a matching mono. Plex Sans figures are tabular by default; components still set `font-variant-numeric: tabular-nums` on values, amounts and data so a later font change cannot break column alignment. Bundle the woff2 files with the app (no network fonts in a desktop tool). The files are the Latin subset: all French characters (é è ê à ç œ « » ’ … €) are covered.

### 3.2 Scale and styles

| Style | Family | Size | Line height | Weight | Letter-spacing | Use |
|---|---|---|---|---|---|---|
| `h1` | sans | 24px / 1.5rem | 32px (1.33) | 600 | -0.01em | Screen title, once per screen, `text-heading`. |
| `h2` | sans | 20px / 1.25rem | 28px (1.40) | 600 | -0.005em | Main section of a screen; dialog title for large dialogs. |
| `h3` | sans | 18px / 1.125rem | 24px (1.33) | 600 | 0em | Dialog titles, card titles of primary cards. |
| `h4` | sans | 16px / 1rem | 24px (1.50) | 600 | 0em | Card titles, form section titles. |
| `h5` | sans | 14px / 0.875rem | 20px (1.43) | 600 | 0em | Sub-groups inside a form or card; alert titles. |
| `h6` | sans | 12px / 0.75rem | 16px (1.33) | 600 | 0.04em | Overline above a group of fields; set in UPPERCASE, `text-muted`. |
| `body` | sans | 14px / 0.875rem | 20px (1.43) | 400 | 0em | Default text everywhere, table cells. |
| `body-sm` | sans | 13px / 0.8125rem | 18px (1.38) | 400 | 0em | Dense tables, secondary paragraphs, error messages under fields. |
| `caption` | sans | 12px / 0.75rem | 16px (1.33) | 400 | 0.01em | Hints, timestamps, metadata — `text-muted`. |
| `label` | sans | 13px / 0.8125rem | 18px (1.38) | 500 | 0em | Field labels — `text-label`. |
| `field-value` | sans | 14px / 0.875rem | 20px (1.43) | 400 | 0em | Read-only values in label/value grids (tabular figures on). |
| `button` | sans | 14px / 0.875rem | 20px (1.43) | 500 | 0em | Button labels (sm: 13px). |
| `data` | mono | 13px / 0.8125rem | 20px (1.54) | 400 | 0em | Raw fixed-width values, codes, identifiers, SHA-256 — inputs and table cells. |
| `data-sm` | mono | 12px / 0.75rem | 16px (1.33) | 400 | 0em | Line numbers, positions, error codes in dense lists. |
| `data-strong` | mono | 13px / 0.8125rem | 20px (1.54) | 500 | 0em | An error code or record type used as a key. |

Rules:
- h1–h4 in `text-heading` (`navy-700`); h5 in `text-default`; h6 in `text-muted`, UPPERCASE, `ls-caps`.
- One h1 per screen. Dialog titles use h3 size (18/24).
- Labels in `label` + `text-label`; captions and hints in `caption` + `text-muted`.
- Raw values in `data`; never set a raw value in the sans face, never reformat it (keep leading zeros and padding spaces).
- Line length for paragraphs: max 80 characters (`max-width: 80ch`).

Size tokens (for component CSS): `fs-12` 12px · `fs-13` 13px · `fs-14` 14px · `fs-16` 16px · `fs-18` 18px · `fs-20` 20px · `fs-24` 24px. Line heights: `lh-16` · `lh-18` · `lh-20` · `lh-24` · `lh-28` · `lh-32`. Weights: `fw-regular` 400 · `fw-medium` 500 · `fw-semibold` 600. Tracking: `ls-tight` -0.01em · `ls-normal` 0em · `ls-caps` 0.04em.

### 3.3 French formats

| Data | Format | Example |
|---|---|---|
| Date | `JJ/MM/AAAA` | 02/10/2026 |
| Date + time | `JJ/MM/AAAA à HH:MM` | 02/10/2026 à 08:12 |
| Time with seconds (logs) | `HH:MM:SS` | 08:30:12 |
| Number | space thousands, comma decimals | 1 234,56 |
| Amount | number + no-break space + € | 1 234,56 € |
| Size | octets: o, Ko, Mo, Go | 5,1 Mo |
| Percentage | number + no-break space + % | 47 % |
| Raw file date | unchanged, in mono | 20261002 |

Thousands and unit separators are **U+00A0** (no-break space): IBM Plex has no glyph for U+202F, which `Intl.NumberFormat('fr-FR')` emits — `handoff/format.ts` swaps it. French punctuation: no-break space before `: ; ? !` ("Déposer le fichier ?"), typographic apostrophe `’`.

---

## 4. Spacing

4px grid. Use the tokens; never an in-between value.

| Token | Value | Use |
|---|---|---|
| `space-half` | `2px` | Badge vertical padding, icon nudges. |
| `space-1` | `4px` | Icon-to-text gap in badges; gap between label and input. |
| `space-2` | `8px` | Icon-to-label gap in buttons; gap between inline controls. |
| `space-3` | `12px` | Input horizontal padding; gap between fields in a row; small button padding. |
| `space-4` | `16px` | Button padding; card padding (dense); gap between stacked fields. |
| `space-5` | `20px` | Large button padding; card padding (default). |
| `space-6` | `24px` | Dialog padding; gap between cards; section spacing. |
| `space-8` | `32px` | Gap between screen sections. |
| `space-10` | `40px` | Screen side padding at 1920px. |
| `space-12` | `48px` | Empty states vertical padding. |
| `space-16` | `64px` | Largest gap: centring an empty screen. |

Layout at 1920×1080: screen side padding `space-10`, gap between cards `space-6`, form fields stacked at `space-4`, fields side by side at `space-3`–`space-4`. Content max width 1600px, centred. At 125% scaling the effective viewport is 1536px: every screen must work from 1280px wide without horizontal scrolling.

## 5. Border radii

| Token | Value | Use |
|---|---|---|
| `radius-none` | `0px` | Tables, the Recette banner, the app header. |
| `radius-sm` | `2px` | Checkboxes, tags inside dense tables, skeleton lines. |
| `radius-md` | `4px` | Buttons, inputs, selects, badges, tooltips, alerts. |
| `radius-lg` | `6px` | Cards, dialogs, popovers, progress panel. (= shadcn `--radius`.) |
| `radius-full` | `9999px` | Switch track and thumb, radio, count badge, spinner. |

## 6. Shadows / elevation

Borders separate; shadows only lift what floats. Shadows are tinted with navy at low alpha.

| Token | Value | Use |
|---|---|---|
| `shadow-xs` | `0 1px 2px #13295B0F` | Switch thumb, sticky table header. |
| `shadow-sm` | `0 1px 2px #13295B0F, 0 1px 3px #13295B14` | Sticky toolbars and the app header separation. |
| `shadow-md` | `0 2px 4px #13295B0F, 0 6px 16px #13295B1F` | Tooltips, dropdown menus, popovers. |
| `shadow-lg` | `0 4px 8px #13295B14, 0 16px 40px #13295B33` | Dialogs only. |
| `focus-ring` | `0 0 0 2px #FFFFFF, 0 0 0 4px #0077BD` | Keyboard focus on light surfaces: 2px white gap + 2px `focus` ring. Applied with :focus-visible. |
| `focus-ring-error` | `0 0 0 2px #FFFFFF, 0 0 0 4px #B8261B` | Keyboard focus on a field in error (keeps the error colour). |
| `focus-ring-on-dark` | `0 0 0 2px #13295B, 0 0 0 4px #75B5E0` | Keyboard focus on the navy header. |

## 7. Motion

Motion is functional only: state feedback, never decoration. All animation stops under prefers-reduced-motion (spinner becomes static, skeleton stops pulsing).

| Token | Value | Use |
|---|---|---|
| `duration-fast` | `100ms` | Hover / pressed colour changes. |
| `duration-base` | `150ms` | Focus ring, checkbox, switch thumb, tooltip fade. |
| `duration-slow` | `200ms` | Dialog and overlay enter (exit uses duration-base). |
| `duration-spin` | `800ms` | One spinner revolution. |
| `duration-pulse` | `1600ms` | Skeleton pulse and indeterminate progress cycle. |
| `delay-tooltip` | `400ms` | Hover delay before a tooltip opens (0 on keyboard focus). |

| Token | Value | Use |
|---|---|---|
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Colour and position changes inside the screen. |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Elements appearing (dialog, tooltip). |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving. |
| `ease-linear` | `linear` | Spinner rotation, progress stripes. |

Hover colour changes: `duration-fast` + `ease-standard`. No bouncing, no sliding panels, no animated page transitions.

## 8. Sizes, layering, opacity

| Token | Value | Use |
|---|---|---|
| `control-sm` | `28px` | Small button/input height (dense tables, toolbars). |
| `control-md` | `32px` | Default button, input, select height. |
| `control-lg` | `40px` | Large button (main action of a step: "Déposer le fichier"). |
| `icon-sm` | `14px` | Icons in badges and small buttons. |
| `icon-md` | `16px` | Default icon size (buttons, inputs, alerts, tree nodes). |
| `icon-lg` | `20px` | Icons in alerts with a title and in dialog headers. |
| `check-size` | `16px` | Checkbox and radio box. |
| `switch-width` | `32px` | Switch track width. |
| `switch-height` | `18px` | Switch track height. |
| `border-width` | `1px` | Every border. |
| `border-width-strong` | `2px` | Active tab underline, selected tree node bar, focus ring. |
| `banner-height` | `32px` | Recette banner height. |
| `header-height` | `48px` | Application header height. |
| `dialog-width-sm` | `440px` | Confirmation dialogs. |
| `dialog-width-md` | `560px` | Form dialogs. |
| `tooltip-max-width` | `280px` | Tooltip max width. |
| `progress-height` | `8px` | Progress bar thickness. |

| Token | Value | Use |
|---|---|---|
| `z-sticky` | `10` | Sticky table headers and toolbars. |
| `z-header` | `100` | Application header. |
| `z-banner` | `110` | Recette banner (always above the header). |
| `z-overlay` | `1000` | Dialog backdrop. |
| `z-dialog` | `1010` | Dialog panel. |
| `z-tooltip` | `1100` | Tooltips (above dialogs). |

| Token | Value | Use |
|---|---|---|
| `opacity-track` | `0.25` | Spinner track behind the moving arc. |
| `opacity-divider` | `0.5` | Separator line inside the Recette banner. |

---

## 9. Usage guidelines

### 9.1 When to use each colour

| Need | Use | Never |
|---|---|---|
| Something the user can act on | `action-primary` (`blue-500`) fill, `link` (`blue-600`) text | navy for buttons other than `secondary` |
| Identity and structure | `bg-header` (`navy-700`), `text-heading` | navy as a status |
| Selected row / node | `selection-bg` + 2px `selection-border` | a semantic colour |
| Success, warning, error, info | the semantic set, always with icon + words | as decoration, as a section colour |
| Recette | `testenv-*` only | anything else, ever |
| Everything else | neutrals | tinted backgrounds for decoration |

### 9.2 How errors are flagged

Errors follow one chain from the top of the file down to the field, so the user can follow the red to the problem.

**On a field** (Input, Textarea, Select, Checkbox):
1. Border `error-solid` (1px) — the field stays white.
2. `CircleAlert` icon (icon-md) inside the field, right-aligned, in `error-text`.
3. Message under the field: `CircleAlert` icon-sm + text in `body-sm` medium `error-text`, replacing the hint. Say what is wrong and what is expected, with the error code in mono when there is one: "ERR002 · Code inconnu du référentiel."
4. `aria-invalid="true"` and `aria-describedby` → the message. Focus keeps the red ring (`focus-ring-error`).

**On a tab:** `CircleAlert` icon-sm + label in `error-text` medium + `CountBadge` (error-solid pill, white figure) with the number of errors below. Screen readers hear "Bénéficiaires, 3 erreurs".

**On a tree node** (event → beneficiary → coverage → entity): `CircleAlert` icon-md replacing the node's icon, label in `error-text` medium, `CountBadge` right-aligned with the number of errors in that subtree. Every ancestor aggregates the counts of its descendants. The selected node keeps `selection-bg` + 2px `selection-border` on the left, its red label stays red.

**On the whole file:** an `Alert` tone `error` at the top of the screen ("12 erreurs bloquent le dépôt") with a "Corriger les erreurs" action; the "Déposer" primary button stays disabled with the reason written next to it.

When an error is fixed, its flag disappears at every level immediately; when the count reaches 0 the `CountBadge` disappears and a success Alert says the file can be saved.

### 9.3 The test-environment banner

- Shown on every screen, every dialog context, from launch to exit, while the active environment is Recette. Not dismissible.
- Position: first element of the window, above the navy header; full width; height `banner-height` (32px); sticky; `z-banner`.
- Look: 45° stripes `testenv-solid` / `testenv-stripe`, 8px bands; `FlaskConical` icon-md; "RECETTE" in semibold UPPERCASE with `ls-caps`; a thin divider; the sentence "Les fichiers sont déposés sur le serveur de test du partenaire, pas en production." in `testenv-on-solid` 13px.
- The header also shows the `EnvironmentBadge` ("RECETTE" on `testenv-bg`) next to the app name.
- **Production stays neutral:** no banner, no colour; the header shows "Environnement : Production" in plain `navy-100` text. Every confirmation dialog before a send repeats the environment in its summary.

### 9.4 Status badges

`Du jour` (success, CalendarCheck) · `Ancien` (warning, Clock) · `En erreur` (error, CircleAlert) · `Déposé` (info, Send) · `Valide` (success, CircleCheck) · `En attente` (neutral, Hourglass). Tinted by default; `solid` only to make one status stand out in a long table.

### 9.5 Buttons and irreversible actions

One `primary` per view. Labels are verb + object in sentence case ("Enregistrer le fichier", "Télécharger les fichiers de rejet"). Any send to the partner goes through a `ConfirmDialog` whose title is a question ("Déposer le fichier chez le partenaire ?"), whose body lists environment / file / check result / SHA-256, whose focus starts on "Annuler" and whose confirm button repeats the verb ("Déposer le fichier").

### 9.6 Focus and keyboard

Every interactive element shows `focus-ring` on `:focus-visible` (2px white gap + 2px `blue-500`, ≥3:1 on all light surfaces); `focus-ring-error` on fields in error and destructive buttons; `focus-ring-on-dark` on the navy header. Never remove the outline without this replacement. Tab order follows reading order; dialogs trap focus and return it on close.

### 9.7 Iconography

Lucide icons (ISC licence), outline style, stroke 1.75, sizes `icon-sm` 14 / `icon-md` 16 / `icon-lg` 20, colour `currentColor`. Icons accompany words; an icon alone is allowed only on icon buttons with `aria-label` and a Tooltip. No emoji, no illustrations.

---

## 10. Semantic tokens (shadcn-compatible)

Light mode only. HSL triplets without the `hsl()` wrapper, consumed as `hsl(var(--primary))`. These map the Flussi palette above; the brand scales (`blue-50…900`, `navy-50…900`, `neutral-50…900`) remain the human-readable reference. Note: these names are NOT declared in `tokens.json`/`flussi-tokens.css` (where every colour is a full value) to avoid two meanings for one variable; paste the block below where the downstream tooling expects it.

| Variable | HSL triplet | Hex | Flussi token | Use |
|---|---|---|---|---|
| `--background` | `220 23.1% 97.5%` | `#F7F8FA` | `bg-page` | App window background. |
| `--foreground` | `215 20% 11.8%` | `#181D24` | `text-default` | Default text. |
| `--card` | `0 0% 100%` | `#FFFFFF` | `bg-surface` | Cards. |
| `--card-foreground` | `215 20% 11.8%` | `#181D24` | `text-default` | Text in cards. |
| `--popover` | `0 0% 100%` | `#FFFFFF` | `bg-surface` | Menus, popovers, select lists. |
| `--popover-foreground` | `215 20% 11.8%` | `#181D24` | `text-default` | Text in popovers. |
| `--primary` | `202.2 100% 37.1%` | `#0077BD` | `blue-500` | Primary button, checked controls. |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | `white` | Text on primary (4.8:1). |
| `--secondary` | `222 41.7% 95.3%` | `#EEF1F8` | `navy-50` | Secondary button fill. |
| `--secondary-foreground` | `221.7 65.5% 21.6%` | `#13295B` | `navy-700` | Secondary button text (12.4:1). |
| `--muted` | `216 17.2% 94.3%` | `#EEF0F3` | `neutral-100` | Muted surfaces (table header, disabled). |
| `--muted-foreground` | `216 10.9% 36.1%` | `#525A66` | `neutral-600` | Secondary text (6.1:1 on muted). |
| `--accent` | `205.7 70% 96.1%` | `#EEF6FC` | `blue-50` | Hover background of ghost buttons and menu items. |
| `--accent-foreground` | `202.6 100% 25.5%` | `#005182` | `blue-700` | Text on accent (7.7:1). |
| `--destructive` | `4.2 74.4% 41.4%` | `#B8261B` | `error-solid` | Destructive button. |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` | `white` | Text on destructive (6.3:1). |
| `--border` | `214.3 14.9% 81.6%` | `#C9CFD7` | `neutral-300` | Default borders (cards, tables). |
| `--input` | `214.3 9.4% 56.3%` | `#858E9A` | `neutral-400` | Input borders (3.3:1 on white). |
| `--ring` | `202.2 100% 37.1%` | `#0077BD` | `blue-500` | Focus ring. |
| `--radius` | `0.375rem` | — | `radius-lg` (6px) | shadcn derives lg = 6px, md = 4px (`radius-md`), sm = 2px (`radius-sm`). |

```css
:root {
  --background: 220 23.1% 97.5%;
  --foreground: 215 20% 11.8%;
  --card: 0 0% 100%;
  --card-foreground: 215 20% 11.8%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 20% 11.8%;
  --primary: 202.2 100% 37.1%;
  --primary-foreground: 0 0% 100%;
  --secondary: 222 41.7% 95.3%;
  --secondary-foreground: 221.7 65.5% 21.6%;
  --muted: 216 17.2% 94.3%;
  --muted-foreground: 216 10.9% 36.1%;
  --accent: 205.7 70% 96.1%;
  --accent-foreground: 202.6 100% 25.5%;
  --destructive: 4.2 74.4% 41.4%;
  --destructive-foreground: 0 0% 100%;
  --border: 214.3 14.9% 81.6%;
  --input: 214.3 9.4% 56.3%;
  --ring: 202.2 100% 37.1%;
  --radius: 0.375rem;
}
```

---

## 11. Handoff

`handoff/` holds the React 18 + TypeScript components (they import `lucide-react`), `flussi-tokens.css` (generated from `tokens.json`: every token as a CSS variable, `@font-face`, `.fl-type-*` classes), `flussi.css` (component styles, tokens only), `format.ts` (French formats) and `index.ts`. Wrap the app in `<div className="fl-root">`. Components: Button · Input · Textarea · Select · Checkbox · Radio / RadioGroup · Switch · Card / DataList · Dialog / ConfirmDialog · Alert · Badge / StatusBadge / CountBadge / EnvironmentBadge · Tooltip · Spinner · Skeleton · ProgressBar / OperationProgress · EnvironmentBanner. Each component's live preview in this system shows default, hover, focus, disabled and (where relevant) loading and error states.
