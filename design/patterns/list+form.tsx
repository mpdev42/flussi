/**
 * Flussi — reference screen pattern: liste + formulaire
 * Visual reference, not production code. Self-contained: React is the only import.
 * Every value comes from DESIGN.md tokens (inlined in FLUSSI_CSS below), applied with Tailwind arbitrary values.
 * Drop into design/patterns/list+form.tsx. The shared kit below is identical in list.tsx, form.tsx and list+form.tsx.
 */
import React, { useState } from "react";

/* =====================================================================================
   FLUSSI SHARED KIT — identical in list.tsx, form.tsx and list+form.tsx.
   Visual reference only: tokens from DESIGN.md, plain HTML + Tailwind arbitrary values.
   ===================================================================================== */

/* Tokens (exact DESIGN.md values). Light mode only: no .dark selector.
   Fonts: Google Fonts @import is for the preview only — the app bundles the IBM Plex woff2 files. */
const FLUSSI_CSS = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap");
:root {
  /* shadcn semantic tokens (DESIGN.md §10) */
  --background: 220 23.1% 97.5%; --foreground: 215 20% 11.8%;
  --card: 0 0% 100%; --card-foreground: 215 20% 11.8%;
  --popover: 0 0% 100%; --popover-foreground: 215 20% 11.8%;
  --primary: 202.2 100% 37.1%; --primary-foreground: 0 0% 100%;
  --secondary: 222 41.7% 95.3%; --secondary-foreground: 221.7 65.5% 21.6%;
  --muted: 216 17.2% 94.3%; --muted-foreground: 216 10.9% 36.1%;
  --accent: 205.7 70% 96.1%; --accent-foreground: 202.6 100% 25.5%;
  --destructive: 4.2 74.4% 41.4%; --destructive-foreground: 0 0% 100%;
  --border: 214.3 14.9% 81.6%; --input: 214.3 9.4% 56.3%; --ring: 202.2 100% 37.1%;
  --radius: 0.375rem;

  /* brand scales */
  --white: #FFFFFF;
  --blue-50: #EEF6FC; --blue-100: #D5E9F7; --blue-200: #AAD2EE; --blue-300: #75B5E0; --blue-500: #0077BD; --blue-600: #00649F; --blue-700: #005182;
  --navy-50: #EEF1F8; --navy-100: #D9E0EF; --navy-200: #B3C0DD; --navy-300: #8698C4; --navy-500: #38528D; --navy-600: #233D77; --navy-700: #13295B; --navy-800: #0E1F46;
  --neutral-50: #F7F8FA; --neutral-100: #EEF0F3; --neutral-200: #E0E4E9; --neutral-300: #C9CFD7; --neutral-400: #858E9A; --neutral-500: #6A7380; --neutral-600: #525A66; --neutral-700: #3D444F; --neutral-900: #181D24;

  /* semantic sets */
  --success-bg: #EBF6EF; --success-border: #93CFA8; --success-text: #18663A; --success-solid: #1C7A44; --success-on-solid: #FFFFFF;
  --warning-bg: #FFF5DD; --warning-border: #EDC26A; --warning-text: #7F4E00; --warning-solid: #E8A317; --warning-on-solid: #181D24;
  --error-bg: #FDEDEC; --error-border: #EDA39E; --error-text: #B0241A; --error-solid: #B8261B; --error-on-solid: #FFFFFF; --error-solid-hover: #96201A;
  --info-bg: #EEF1F8; --info-border: #B3C0DD; --info-text: #233D77; --info-solid: #38528D; --info-on-solid: #FFFFFF;
  --testenv-solid: #6B1F9C; --testenv-stripe: #7A2DAC; --testenv-on-solid: #FFFFFF; --testenv-bg: #F5EEFA; --testenv-border: #C7A6DF; --testenv-text: #5E1C8A;

  /* role tokens */
  --bg-page: #F7F8FA; --bg-surface: #FFFFFF; --bg-subtle: #EEF0F3; --bg-header: #13295B;
  --text-default: #181D24; --text-heading: #13295B; --text-muted: #525A66; --text-label: #3D444F; --text-placeholder: #6A7380; --text-disabled: #858E9A; --text-on-brand: #FFFFFF;
  --border-subtle: #E0E4E9; --border-default: #C9CFD7; --border-control: #858E9A; --border-control-hover: #6A7380;
  --action-primary: #0077BD; --action-primary-hover: #00649F; --action-primary-active: #005182;
  --link: #00649F; --link-hover: #005182; --focus: #0077BD; --focus-on-dark: #75B5E0;
  --selection-bg: #D5E9F7; --selection-border: #0077BD;

  /* typography */
  --font-sans: "IBM Plex Sans", "Segoe UI", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", Consolas, "Courier New", monospace;
  --fs-12: 12px; --fs-13: 13px; --fs-14: 14px; --fs-16: 16px; --fs-18: 18px; --fs-20: 20px; --fs-24: 24px;
  --lh-16: 16px; --lh-18: 18px; --lh-20: 20px; --lh-24: 24px; --lh-28: 28px; --lh-32: 32px;
  --fw-regular: 400; --fw-medium: 500; --fw-semibold: 600;
  --ls-tight: -0.01em; --ls-normal: 0em; --ls-caps: 0.04em;

  /* spacing, radii, shadows */
  --space-half: 2px; --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;
  --radius-none: 0px; --radius-sm: 2px; --radius-md: 4px; --radius-lg: 6px; --radius-full: 9999px;
  --shadow-xs: 0 1px 2px #13295B0F;
  --shadow-sm: 0 1px 2px #13295B0F, 0 1px 3px #13295B14;
  --focus-ring: 0 0 0 2px #FFFFFF, 0 0 0 4px #0077BD;
  --focus-ring-error: 0 0 0 2px #FFFFFF, 0 0 0 4px #B8261B;
  --focus-ring-on-dark: 0 0 0 2px #13295B, 0 0 0 4px #75B5E0;

  /* sizes, layers, motion */
  --control-sm: 28px; --control-md: 32px; --control-lg: 40px;
  --icon-sm: 14px; --icon-md: 16px; --icon-lg: 20px; --check-size: 16px; --switch-width: 32px; --switch-height: 18px;
  --border-width: 1px; --border-width-strong: 2px; --banner-height: 32px; --header-height: 48px;
  --z-sticky: 10; --z-header: 100; --z-banner: 110;
  --duration-fast: 100ms; --duration-base: 150ms; --duration-spin: 800ms; --duration-pulse: 1600ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); --ease-linear: linear;
  --opacity-track: 0.25; --opacity-divider: 0.5;
}
.fl-app { font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-20); color: var(--text-default); -webkit-font-smoothing: antialiased; }
.fl-app *, .fl-app *::before, .fl-app *::after { box-sizing: border-box; }
@keyframes fl-pulse { 0%, 100% { background-color: var(--neutral-200); } 50% { background-color: var(--neutral-100); } }
@keyframes fl-spin { to { transform: rotate(360deg); } }
`;

/* ---------- Icons (Lucide paths, stroke 1.75, currentColor) ---------- */
type IconProps = { size?: "sm" | "md" | "lg"; className?: string };
const ICON_SIZE = { sm: 14, md: 16, lg: 20 } as const; // = icon-sm / icon-md / icon-lg
function makeIcon(paths: React.ReactNode) {
  return function Icon({ size = "md", className = "" }: IconProps) {
    const s = ICON_SIZE[size];
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>{paths}</svg>
    );
  };
}
const CircleAlertIcon = makeIcon(<><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>);
const CircleCheckIcon = makeIcon(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
const FlaskConicalIcon = makeIcon(<><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></>);
const PlusIcon = makeIcon(<><path d="M5 12h14" /><path d="M12 5v14" /></>);
const Trash2Icon = makeIcon(<><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>);
const SearchIcon = makeIcon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const FilterIcon = makeIcon(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>);
const DownloadIcon = makeIcon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>);
const HourglassIcon = makeIcon(<><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></>);
const CalendarCheckIcon = makeIcon(<><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></>);
const ClockIcon = makeIcon(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>);
const SendIcon = makeIcon(<><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></>);
const ArrowLeftIcon = makeIcon(<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>);
const InboxIcon = makeIcon(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>);
const ChevronDownIcon = makeIcon(<><path d="m6 9 6 6 6-6" /></>);
const RefreshCwIcon = makeIcon(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>);
const InfoIcon = makeIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
const CheckIcon = makeIcon(<><path d="M20 6 9 17l-5-5" /></>);
const TriangleAlertIcon = makeIcon(<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
const BTN_BASE =
  "inline-flex items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-none disabled:cursor-not-allowed";
const BTN_SIZE = {
  md: "h-[var(--control-md)] px-[var(--space-4)] text-[length:var(--fs-14)] leading-[var(--lh-20)]",
  lg: "h-[var(--control-lg)] px-[var(--space-5)] text-[length:var(--fs-16)] leading-[var(--lh-24)]",
};
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--action-primary)] text-[var(--text-on-brand)] hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-active)] focus-visible:shadow-[var(--focus-ring)]",
  secondary:
    "border-[color:var(--navy-200)] bg-[var(--navy-50)] text-[var(--navy-700)] hover:bg-[var(--navy-100)] active:bg-[var(--navy-200)] focus-visible:shadow-[var(--focus-ring)]",
  ghost:
    "border-transparent bg-transparent text-[var(--link)] hover:bg-[var(--blue-50)] hover:text-[var(--link-hover)] active:bg-[var(--blue-100)] focus-visible:shadow-[var(--focus-ring)]",
  destructive:
    "border-transparent bg-[var(--error-solid)] text-[var(--error-on-solid)] hover:bg-[var(--error-solid-hover)] active:bg-[var(--error-solid-hover)] focus-visible:shadow-[var(--focus-ring-error)]",
};
const BTN_DISABLED =
  "disabled:border-[color:var(--border-subtle)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-disabled)] disabled:hover:bg-[var(--bg-subtle)]";
const BTN_DISABLED_GHOST = "disabled:bg-transparent disabled:hover:bg-transparent disabled:text-[var(--text-disabled)]";

function Button({
  variant = "secondary", size = "md", icon, loading = false, disabled = false, children, onClick, className = "",
}: {
  variant?: ButtonVariant; size?: "md" | "lg"; icon?: React.ReactNode; loading?: boolean; disabled?: boolean;
  children?: React.ReactNode; onClick?: () => void; className?: string;
}) {
  // Loading keeps the variant colours (busy, not disabled) but blocks clicks.
  const busy = loading
    ? variant === "primary" ? "cursor-progress bg-[var(--action-primary-hover)] hover:bg-[var(--action-primary-hover)]" : "cursor-progress"
    : "";
  return (
    <button type="button" disabled={disabled} aria-busy={loading || undefined} onClick={loading ? undefined : onClick}
      className={`${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${variant === "ghost" ? BTN_DISABLED_GHOST : BTN_DISABLED} ${busy} ${className}`}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/* ---------- Spinner & Skeleton ---------- */
function Spinner({ size = "md", label }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const s = ICON_SIZE[size];
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" role={label ? "status" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      className="shrink-0 animate-[fl-spin_var(--duration-spin)_var(--ease-linear)_infinite] motion-reduce:animate-none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" style={{ opacity: "var(--opacity-track)" }} />
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 44" />
    </svg>
  );
}
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true"
      className={`block rounded-[var(--radius-sm)] bg-[var(--neutral-200)] animate-[fl-pulse_var(--duration-pulse)_var(--ease-standard)_infinite] motion-reduce:animate-none ${className}`} />
  );
}

/* ---------- Badges ---------- */
type Status = "du-jour" | "ancien" | "en-erreur" | "depose" | "valide" | "en-attente";
const STATUS: Record<Status, { label: string; cls: string; Icon: (p: IconProps) => React.ReactElement }> = {
  "du-jour": { label: "Du jour", cls: "bg-[var(--success-bg)] border-[color:var(--success-border)] text-[var(--success-text)]", Icon: CalendarCheckIcon },
  ancien: { label: "Ancien", cls: "bg-[var(--warning-bg)] border-[color:var(--warning-border)] text-[var(--warning-text)]", Icon: ClockIcon },
  "en-erreur": { label: "En erreur", cls: "bg-[var(--error-bg)] border-[color:var(--error-border)] text-[var(--error-text)]", Icon: CircleAlertIcon },
  depose: { label: "Déposé", cls: "bg-[var(--info-bg)] border-[color:var(--info-border)] text-[var(--info-text)]", Icon: SendIcon },
  valide: { label: "Valide", cls: "bg-[var(--success-bg)] border-[color:var(--success-border)] text-[var(--success-text)]", Icon: CircleCheckIcon },
  "en-attente": { label: "En attente", cls: "bg-[var(--bg-subtle)] border-[color:var(--border-default)] text-[var(--text-label)]", Icon: HourglassIcon },
};
const BADGE_BASE =
  "inline-flex items-center gap-[var(--space-1)] whitespace-nowrap rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid px-[var(--space-2)] py-[var(--space-half)] text-[length:var(--fs-12)] leading-[var(--lh-16)] font-medium";
function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return <span className={`${BADGE_BASE} ${s.cls}`}><s.Icon size="sm" />{s.label}</span>;
}
function EnvironmentBadge() {
  return (
    <span className={`${BADGE_BASE} border-[color:var(--testenv-border)] bg-[var(--testenv-bg)] font-semibold uppercase tracking-[var(--ls-caps)] text-[var(--testenv-text)]`}>
      <FlaskConicalIcon size="sm" />Recette
    </span>
  );
}
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-[var(--switch-height)] min-w-[var(--switch-height)] shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--error-solid)] px-[var(--space-1)] text-[length:var(--fs-12)] font-semibold leading-[var(--lh-16)] tabular-nums text-[var(--error-on-solid)]">
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{count > 1 ? `${count} erreurs` : "1 erreur"}</span>
    </span>
  );
}

/* ---------- Alert ---------- */
type Tone = "info" | "success" | "warning" | "error";
const ALERT: Record<Tone, { box: string; accent: string; Icon: (p: IconProps) => React.ReactElement }> = {
  info: { box: "bg-[var(--info-bg)] border-[color:var(--info-border)]", accent: "text-[var(--info-text)]", Icon: InfoIcon },
  success: { box: "bg-[var(--success-bg)] border-[color:var(--success-border)]", accent: "text-[var(--success-text)]", Icon: CircleCheckIcon },
  warning: { box: "bg-[var(--warning-bg)] border-[color:var(--warning-border)]", accent: "text-[var(--warning-text)]", Icon: TriangleAlertIcon },
  error: { box: "bg-[var(--error-bg)] border-[color:var(--error-border)]", accent: "text-[var(--error-text)]", Icon: CircleAlertIcon },
};
function Alert({ tone, title, children, action }: { tone: Tone; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  const a = ALERT[tone];
  return (
    <div role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`flex gap-[var(--space-3)] rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid px-[var(--space-4)] py-[var(--space-3)] ${a.box}`}>
      <span className={`mt-[var(--space-half)] ${a.accent}`}><a.Icon size="lg" /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
        <h5 className={`m-0 text-[length:var(--fs-14)] font-semibold leading-[var(--lh-20)] ${a.accent}`}>{title}</h5>
        {children && <p className="m-0 max-w-[80ch] text-[var(--text-default)]">{children}</p>}
        {action && <div className="mt-[var(--space-2)] flex gap-[var(--space-2)]">{action}</div>}
      </div>
    </div>
  );
}

/* ---------- Card ---------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-solid border-[color:var(--border-default)] bg-[var(--bg-surface)] ${className}`}>
      {children}
    </section>
  );
}
function CardHeader({ title, caption, aside }: { title: React.ReactNode; caption?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-[var(--space-4)] border-b-[length:var(--border-width)] border-solid border-[color:var(--border-subtle)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex min-w-0 flex-col gap-[var(--space-half)]">
        <h4 className="m-0 text-[length:var(--fs-16)] font-semibold leading-[var(--lh-24)] text-[var(--text-heading)]">{title}</h4>
        {caption && <p className="m-0 text-[length:var(--fs-12)] leading-[var(--lh-16)] tracking-[0.01em] text-[var(--text-muted)]">{caption}</p>}
      </div>
      {aside}
    </header>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ title, caption, action, compact = false }: { title: string; caption: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-[var(--space-2)] text-center ${compact ? "px-[var(--space-6)] py-[var(--space-10)]" : "px-[var(--space-6)] py-[var(--space-12)]"}`}>
      <span className="text-[var(--text-muted)]"><InboxIcon size="lg" /></span>
      <h4 className="m-0 text-[length:var(--fs-16)] font-semibold leading-[var(--lh-24)] text-[var(--text-heading)]">{title}</h4>
      <p className="m-0 max-w-[48ch] text-[length:var(--fs-12)] leading-[var(--lh-16)] text-[var(--text-muted)]">{caption}</p>
      {action && <div className="mt-[var(--space-3)]">{action}</div>}
    </div>
  );
}

/* ---------- Form fields ---------- */
const CONTROL_BASE =
  "w-full rounded-[var(--radius-md)] border-[length:var(--border-width)] border-solid bg-[var(--bg-surface)] text-[length:var(--fs-14)] leading-[var(--lh-20)] text-[var(--text-default)] placeholder:text-[var(--text-placeholder)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus:outline-none disabled:cursor-not-allowed disabled:border-[color:var(--border-default)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-disabled)]";
const CONTROL_OK =
  "border-[color:var(--border-control)] hover:border-[color:var(--border-control-hover)] focus:border-[color:var(--focus)] focus:shadow-[var(--focus-ring)] disabled:hover:border-[color:var(--border-default)]";
const CONTROL_ERR = "border-[color:var(--error-solid)] focus:shadow-[var(--focus-ring-error)]";
const MONO = "font-[family-name:var(--font-mono)] text-[length:var(--fs-13)] tabular-nums";

let fieldSeq = 0;
function useId(prefix: string) {
  const [id] = useState(() => `${prefix}-${++fieldSeq}`);
  return id;
}

function FieldFrame({ id, label, hint, error, required, disabled, span2, children }: {
  id: string; label: string; hint?: string; error?: React.ReactNode; required?: boolean; disabled?: boolean; span2?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-[var(--space-1)] ${span2 ? "col-span-2" : ""}`}>
      <label htmlFor={id} className={`text-[length:var(--fs-13)] font-medium leading-[var(--lh-18)] ${disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-label)]"}`}>
        {label}
        {required && (<><span aria-hidden="true" className="ml-[var(--space-half)] text-[var(--error-text)]">*</span><span className="sr-only"> (obligatoire)</span></>)}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="m-0 flex items-start gap-[var(--space-1)] text-[length:var(--fs-13)] font-medium leading-[var(--lh-18)] text-[var(--error-text)]">
          <span className="mt-[var(--space-half)]"><CircleAlertIcon size="sm" /></span><span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="m-0 text-[length:var(--fs-12)] leading-[var(--lh-16)] tracking-[0.01em] text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldBase = { label: string; hint?: string; error?: React.ReactNode; required?: boolean; disabled?: boolean; span2?: boolean };

function TextField({ value, placeholder, mono, readOnly, ...f }: FieldBase & { value?: string; placeholder?: string; mono?: boolean; readOnly?: boolean }) {
  const id = useId("champ");
  const state = readOnly
    ? "border-[color:var(--border-default)] bg-[var(--neutral-50)] focus:border-[color:var(--focus)] focus:shadow-[var(--focus-ring)]"
    : f.error ? CONTROL_ERR : CONTROL_OK;
  return (
    <FieldFrame id={id} {...f}>
      <div className="relative flex items-center">
        <input id={id} defaultValue={value} placeholder={placeholder} readOnly={readOnly} disabled={f.disabled} required={f.required}
          spellCheck={mono ? false : undefined} aria-invalid={f.error ? true : undefined} aria-describedby={f.error || f.hint ? `${id}-msg` : undefined}
          className={`${CONTROL_BASE} ${state} h-[var(--control-md)] px-[var(--space-3)] ${f.error ? "pr-[var(--space-10)]" : ""} ${mono ? MONO : ""}`} />
        {f.error && <span className="pointer-events-none absolute right-[var(--space-3)] text-[var(--error-text)]"><CircleAlertIcon /></span>}
      </div>
    </FieldFrame>
  );
}

function SelectField({ value, options, placeholder, ...f }: FieldBase & { value?: string; options: string[]; placeholder?: string }) {
  const id = useId("champ");
  return (
    <FieldFrame id={id} {...f}>
      <div className="relative flex items-center">
        <select id={id} defaultValue={value ?? ""} disabled={f.disabled} required={f.required}
          aria-invalid={f.error ? true : undefined} aria-describedby={f.error || f.hint ? `${id}-msg` : undefined}
          className={`${CONTROL_BASE} ${f.error ? CONTROL_ERR : CONTROL_OK} h-[var(--control-md)] cursor-pointer appearance-none pl-[var(--space-3)] pr-[var(--space-10)]`}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className={`pointer-events-none absolute right-[var(--space-3)] flex items-center gap-[var(--space-2)] ${f.disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"}`}>
          {f.error && <span className="text-[var(--error-text)]"><CircleAlertIcon /></span>}
          {!f.error && <ChevronDownIcon />}
        </span>
      </div>
    </FieldFrame>
  );
}

function TextareaField({ value, placeholder, ...f }: FieldBase & { value?: string; placeholder?: string }) {
  const id = useId("champ");
  return (
    <FieldFrame id={id} {...f}>
      <textarea id={id} defaultValue={value} placeholder={placeholder} rows={4} disabled={f.disabled}
        aria-invalid={f.error ? true : undefined} aria-describedby={f.error || f.hint ? `${id}-msg` : undefined}
        className={`${CONTROL_BASE} ${f.error ? CONTROL_ERR : CONTROL_OK} block resize-y px-[var(--space-3)] py-[var(--space-2)]`} />
    </FieldFrame>
  );
}

function Checkbox({ label, description, checked, disabled }: { label: string; description?: string; checked?: boolean; disabled?: boolean }) {
  return (
    <label className={`inline-flex items-start gap-[var(--space-2)] ${disabled ? "cursor-not-allowed text-[var(--text-disabled)]" : "cursor-pointer text-[var(--text-default)]"}`}>
      <span className="relative mt-[var(--space-half)] h-[var(--check-size)] w-[var(--check-size)] shrink-0">
        <input type="checkbox" defaultChecked={checked} disabled={disabled}
          className="peer m-0 block h-[var(--check-size)] w-[var(--check-size)] cursor-[inherit] appearance-none rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-solid border-[color:var(--border-control)] bg-[var(--bg-surface)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--border-control-hover)] checked:border-[color:var(--action-primary)] checked:bg-[var(--action-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:border-[color:var(--border-default)] disabled:bg-[var(--bg-subtle)] disabled:checked:border-[color:var(--neutral-300)] disabled:checked:bg-[var(--neutral-300)]" />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[var(--text-on-brand)] peer-checked:flex"><CheckIcon size="sm" /></span>
      </span>
      <span className="flex flex-col">
        <span>{label}</span>
        {description && <span className={`text-[length:var(--fs-12)] leading-[var(--lh-16)] ${disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"}`}>{description}</span>}
      </span>
    </label>
  );
}

function Switch({ label, checked, disabled }: { label: string; checked: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(checked);
  const track = disabled
    ? on ? "bg-[var(--neutral-300)]" : "bg-[var(--neutral-200)]"
    : on ? "bg-[var(--action-primary)] group-hover:bg-[var(--action-primary-hover)]" : "bg-[var(--border-control)] group-hover:bg-[var(--border-control-hover)]";
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => setOn(!on)}
      className={`group inline-flex items-center gap-[var(--space-2)] border-0 bg-transparent p-0 text-left focus-visible:outline-none ${disabled ? "cursor-not-allowed text-[var(--text-disabled)]" : "cursor-pointer text-[var(--text-default)]"}`}>
      <span className={`relative h-[var(--switch-height)] w-[var(--switch-width)] shrink-0 rounded-[var(--radius-full)] transition-colors duration-[var(--duration-base)] group-focus-visible:shadow-[var(--focus-ring)] ${track}`}>
        <span className={`absolute left-[var(--space-half)] top-[var(--space-half)] h-[calc(var(--switch-height)-var(--space-1))] w-[calc(var(--switch-height)-var(--space-1))] rounded-[var(--radius-full)] bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] ${on ? "translate-x-[calc(var(--switch-width)-var(--switch-height))]" : ""}`} />
      </span>
      <span>{label}</span>
      <span aria-hidden="true" className={`min-w-[9ch] text-[length:var(--fs-13)] leading-[var(--lh-18)] ${disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"}`}>{on ? "Activé" : "Désactivé"}</span>
    </button>
  );
}

function RadioGroup({ legend, name, options, value, disabled }: { legend: string; name: string; options: string[]; value?: string; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="m-0 flex min-w-0 flex-col gap-[var(--space-2)] border-0 p-0">
      <legend className={`mb-[var(--space-2)] p-0 text-[length:var(--fs-13)] font-medium leading-[var(--lh-18)] ${disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-label)]"}`}>{legend}</legend>
      <div className="flex flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)]">
        {options.map((o) => (
          <label key={o} className={`inline-flex items-center gap-[var(--space-2)] ${disabled ? "cursor-not-allowed text-[var(--text-disabled)]" : "cursor-pointer"}`}>
            <input type="radio" name={name} defaultChecked={o === value}
              className="m-0 h-[var(--check-size)] w-[var(--check-size)] shrink-0 cursor-[inherit] appearance-none rounded-[var(--radius-full)] border-[length:var(--border-width)] border-solid border-[color:var(--border-control)] bg-[var(--bg-surface)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--border-control-hover)] checked:border-[length:var(--space-1)] checked:border-[color:var(--action-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:border-[color:var(--border-default)] disabled:bg-[var(--bg-subtle)] disabled:checked:border-[color:var(--neutral-300)]" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- Search input (screen / list toolbars) ---------- */
function SearchInput({ disabled, className = "" }: { disabled?: boolean; className?: string }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <span className={`pointer-events-none absolute left-[var(--space-3)] ${disabled ? "text-[var(--text-disabled)]" : "text-[var(--text-muted)]"}`}><SearchIcon /></span>
      <input type="search" placeholder="Rechercher" aria-label="Rechercher" disabled={disabled}
        className={`${CONTROL_BASE} ${CONTROL_OK} h-[var(--control-md)] pl-[var(--space-10)] pr-[var(--space-3)]`} />
    </div>
  );
}

/* ---------- App shell ---------- */
const NAV = ["Section A", "Section B", "Section C", "Section D"];

function RecetteBanner() {
  return (
    <div role="note" aria-label="Environnement de recette"
      className="sticky top-0 z-[var(--z-banner)] flex h-[var(--banner-height)] shrink-0 items-center justify-center gap-[var(--space-2)] bg-[repeating-linear-gradient(-45deg,var(--testenv-solid)_0_var(--space-2),var(--testenv-stripe)_var(--space-2)_var(--space-4))] px-[var(--space-4)] text-[length:var(--fs-13)] leading-[var(--lh-18)] text-[var(--testenv-on-solid)]">
      <FlaskConicalIcon />
      <span className="font-semibold uppercase tracking-[var(--ls-caps)]">Recette</span>
      <span aria-hidden="true" className="h-[var(--space-4)] w-[var(--border-width)] bg-[var(--testenv-on-solid)] opacity-[var(--opacity-divider)]" />
      <span>Les fichiers sont déposés sur le serveur de test du partenaire, pas en production.</span>
    </div>
  );
}

function AppHeader({ env, active = 0 }: { env: "recette" | "production"; active?: number }) {
  return (
    <header className="z-[var(--z-header)] flex h-[var(--header-height)] shrink-0 items-stretch gap-[var(--space-8)] bg-[var(--bg-header)] px-[var(--space-10)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-[var(--space-3)]">
        <span className="text-[length:var(--fs-16)] font-semibold leading-[var(--lh-24)] text-[var(--text-on-brand)]">Flussi</span>
        {env === "recette" && <EnvironmentBadge />}
      </div>
      <nav aria-label="Navigation principale" className="flex items-stretch gap-[var(--space-1)]">
        {NAV.map((item, i) => (
          <a key={item} href="#" onClick={(e) => e.preventDefault()} aria-current={i === active ? "page" : undefined}
            className={`flex items-center border-b-[length:var(--border-width-strong)] border-solid px-[var(--space-4)] pt-[var(--border-width-strong)] text-[length:var(--fs-14)] font-medium no-underline transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-on-dark)] ${
              i === active
                ? "border-[color:var(--blue-300)] bg-[var(--navy-800)] text-[var(--text-on-brand)]"
                : "border-transparent text-[var(--navy-100)] hover:bg-[var(--navy-800)] hover:text-[var(--text-on-brand)]"}`}>
            {item}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center text-[length:var(--fs-13)] leading-[var(--lh-18)] text-[var(--navy-100)]">
        Environnement : {env === "recette" ? "Recette" : "Production"}
      </div>
    </header>
  );
}

/** Full app frame at the minimum supported width (1280px). `height` fixes the window height so sticky bars show. */
function AppFrame({ env, height, children }: { env: "recette" | "production"; height?: number; children: React.ReactNode }) {
  return (
    <div className="fl-app flex w-[1280px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-solid border-[color:var(--border-default)] bg-[var(--bg-page)]"
      style={height ? { height } : undefined}>
      {env === "recette" && <RecetteBanner />}
      <AppHeader env={env} />
      <main className="relative flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}

/** Screen header: (back link) + h1 + caption on the left, actions right-aligned on the same line. */
function ScreenHeader({ title, caption, actions, back }: { title: string; caption?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {back}
      <div className="flex items-end justify-between gap-[var(--space-6)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <h1 className="m-0 text-[length:var(--fs-24)] font-semibold leading-[var(--lh-32)] tracking-[var(--ls-tight)] text-[var(--text-heading)]">{title}</h1>
          {caption && <p className="m-0 text-[length:var(--fs-12)] leading-[var(--lh-16)] tracking-[0.01em] text-[var(--text-muted)]">{caption}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-[var(--space-3)]">{actions}</div>}
      </div>
    </div>
  );
}

/** Screen content column: side padding space-10, sections space-8 apart, max 1600px. */
function Screen({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-[var(--space-8)] px-[var(--space-10)] py-[var(--space-8)]">{children}</div>;
}

/* ---------- Storyboard (outside the app frame) ---------- */
function Storyboard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fl-app min-h-full bg-[var(--neutral-200)] p-[var(--space-10)]">
      <style>{FLUSSI_CSS}</style>
      <p className="m-0 mb-[var(--space-8)] text-[length:var(--fs-20)] font-semibold leading-[var(--lh-28)] text-[var(--text-heading)]">{title}</p>
      <div className="flex flex-col gap-[var(--space-16)] overflow-x-auto">{children}</div>
    </div>
  );
}
function StoryState({ index, title, note, children }: { index: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--space-3)]">
      <div className="flex items-baseline gap-[var(--space-3)]">
        <span className="text-[length:var(--fs-12)] font-semibold uppercase leading-[var(--lh-16)] tracking-[var(--ls-caps)] text-[var(--text-muted)]">État {index}</span>
        <h2 className="m-0 text-[length:var(--fs-18)] font-semibold leading-[var(--lh-24)] text-[var(--text-heading)]">{title}</h2>
        <span className="text-[length:var(--fs-13)] leading-[var(--lh-18)] text-[var(--text-muted)]">{note}</span>
      </div>
      {children}
    </section>
  );
}


/* =====================================================================================
   SHARED FORM CONTENT — identical in form.tsx and list+form.tsx
   ===================================================================================== */

type ElementValues = { champ1: string; champ2: string; champ3: string; champ4: string; champ5: string; champ6: string; champ7: string; champ8: boolean; champ9: boolean };
type ElementErrors = Partial<Record<"champ1" | "champ2" | "champ3" | "champ4" | "champ6", React.ReactNode>>;

const EMPTY_VALUES: ElementValues = { champ1: "", champ2: "", champ3: "", champ4: "", champ5: "Attribué à l’enregistrement", champ6: "", champ7: "Option 1", champ8: false, champ9: true };

const ERR_CODE = (code: string, text: string) => (
  <><span className="font-[family-name:var(--font-mono)] text-[length:var(--fs-13)]">{code}</span> · {text}</>
);

/** The fields of section 1 ("Titre de section"): 2-column grid, stacked at space-5. */
function SectionOneFields({ v, e = {}, disabled, create }: { v: ElementValues; e?: ElementErrors; disabled?: boolean; create?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-[var(--space-6)] gap-y-[var(--space-5)]">
      <TextField label="Champ 1" required value={v.champ1} placeholder={create ? "Ex. : Élément A" : undefined}
        hint="Libellé affiché dans la liste." error={e.champ1} disabled={disabled} />
      <TextField label="Champ 2" required mono value={v.champ2} placeholder={create ? "A-0000" : undefined}
        hint="Code brut, 6 caractères, tel qu’il figure dans le fichier." error={e.champ2} disabled={disabled} />
      <SelectField label="Champ 3" value={v.champ3} placeholder="Choisir une valeur…" options={["Valeur 1", "Valeur 2", "Valeur 3"]}
        hint="Valeur proposée par défaut à la création." error={e.champ3} disabled={disabled} />
      <TextField label="Champ 4" value={v.champ4} placeholder={create ? "JJ/MM/AAAA" : undefined}
        hint="Format attendu : JJ/MM/AAAA." error={e.champ4} disabled={disabled} />
      <TextField label="Champ 5" readOnly mono={!create} value={v.champ5 || "—"}
        hint="Lecture seule : attribué automatiquement." disabled={disabled} />
    </div>
  );
}

/** The fields of section 2: textarea across both columns, radio group, checkbox, switch. */
function SectionTwoFields({ v, e = {}, disabled, create }: { v: ElementValues; e?: ElementErrors; disabled?: boolean; create?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-[var(--space-6)] gap-y-[var(--space-5)]">
      <TextareaField span2 label="Champ 6" value={v.champ6} placeholder={create ? "Saisissez un commentaire (facultatif)." : undefined}
        hint="Visible par toute l’équipe. 500 caractères au maximum." error={e.champ6} disabled={disabled} />
      <RadioGroup legend="Champ 7" name={`champ7-${useId("r")}`} options={["Option 1", "Option 2", "Option 3"]} value={v.champ7} disabled={disabled} />
      <div className="flex flex-col gap-[var(--space-4)]">
        <Checkbox label="Champ 8" description="Inclure l’élément dans les exports." checked={v.champ8} disabled={disabled} />
        <Switch label="Champ 9" checked={v.champ9} disabled={disabled} />
      </div>
    </div>
  );
}

/** Sticky action bar: bg-surface, top border-default, shadow-sm, z-sticky; everything right-aligned. */
function ActionBar({ state, errorCount = 0, inCard = false }: { state: "idle" | "errors" | "saving"; errorCount?: number; inCard?: boolean }) {
  return (
    <div className={`sticky bottom-0 z-[var(--z-sticky)] flex items-center justify-end gap-[var(--space-3)] border-t-[length:var(--border-width)] border-solid border-[color:var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] ${
      inCard ? "rounded-b-[var(--radius-lg)] px-[var(--space-6)] py-[var(--space-4)]" : "px-[var(--space-10)] py-[var(--space-4)]"}`}>
      {state === "errors" && (
        <p className="m-0 mr-[var(--space-2)] flex items-center gap-[var(--space-1)] text-[length:var(--fs-13)] font-medium leading-[var(--lh-18)] text-[var(--error-text)]">
          <CircleAlertIcon size="sm" />Corrigez {errorCount > 1 ? `les ${errorCount} erreurs` : "l’erreur"} pour enregistrer.
        </p>
      )}
      <Button variant="secondary" disabled={state === "saving"}>Annuler</Button>
      <Button variant="primary" loading={state === "saving"} disabled={state === "errors"}>
        {state === "saving" ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}

/** Overline used for field groups inside a single card (list+form). */
function Overline({ children }: { children: React.ReactNode }) {
  return <h6 className="m-0 text-[length:var(--fs-12)] font-semibold uppercase leading-[var(--lh-16)] tracking-[var(--ls-caps)] text-[var(--text-muted)]">{children}</h6>;
}

function SkeletonField({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-[var(--space-1)] ${wide ? "col-span-2" : ""}`}>
      <Skeleton className="h-[var(--fs-13)] w-[var(--space-16)]" />
      <Skeleton className={`${wide ? "h-[calc(var(--space-16)+var(--space-8))]" : "h-[var(--control-md)]"} w-full rounded-[var(--radius-md)]`} />
    </div>
  );
}


/* =====================================================================================
   PATTERN — LIST + FORM (compact CRUD on one screen) — priority pattern
   ===================================================================================== */

type Item = { id: string; label: string; code: string; date: string; status?: Status; modified: string; values: ElementValues; errors?: ElementErrors };

const base = (label: string, code: string, extra: Partial<ElementValues> = {}): ElementValues => ({
  champ1: label, champ2: code, champ3: "Valeur 1", champ4: "02/10/2026", champ5: code.replace("A-", "00"), champ6: "", champ7: "Option 1", champ8: false, champ9: true, ...extra,
});

const ITEMS: Item[] = [
  { id: "a", label: "Élément A", code: "A-0001", date: "02/10/2026", status: "du-jour", modified: "02/10/2026 à 08:12", values: base("Élément A", "A-0001") },
  { id: "b", label: "Élément B", code: "A-0002", date: "02/10/2026", status: "valide", modified: "02/10/2026 à 07:58", values: base("Élément B", "A-0002", { champ3: "Valeur 2", champ6: "Commentaire de démonstration.", champ7: "Option 2", champ8: true }) },
  { id: "c", label: "Élément C", code: "A-0003", date: "01/10/2026", status: "ancien", modified: "01/10/2026 à 18:03", values: base("Élément C", "A-0003", { champ4: "01/10/2026" }) },
  {
    id: "d", label: "Élément D", code: "A-0004", date: "01/10/2026", modified: "01/10/2026 à 17:40",
    values: base("Élément D", "A-0004", { champ2: "A-04", champ4: "31/02/2026" }),
    errors: {
      champ2: ERR_CODE("ERR002", "Code invalide. Format attendu : 6 caractères, par exemple A-0001."),
      champ4: "Date invalide : le 31/02/2026 n’existe pas. Format attendu : JJ/MM/AAAA.",
    },
  },
  { id: "e", label: "Élément E", code: "A-0005", date: "30/09/2026", status: "depose", modified: "30/09/2026 à 18:21", values: base("Élément E", "A-0005") },
  { id: "f", label: "Élément F", code: "A-0006", date: "30/09/2026", modified: "30/09/2026 à 08:05", values: base("Élément F", "A-0006") },
  {
    id: "g", label: "Élément G", code: "A-0007", date: "29/09/2026", modified: "29/09/2026 à 17:47",
    values: base("Élément G", "A-0007", { champ1: "", champ3: "" }),
    errors: { champ1: "Champ obligatoire : saisissez un libellé.", champ3: "Sélectionnez une valeur dans la liste." },
  },
  { id: "h", label: "Élément H", code: "A-0008", date: "28/09/2026", status: "en-attente", modified: "28/09/2026 à 08:30", values: base("Élément H", "A-0008") },
  { id: "i", label: "Élément I", code: "A-0009", date: "27/09/2026", status: "depose", modified: "27/09/2026 à 18:10", values: base("Élément I", "A-0009") },
  { id: "j", label: "Élément J", code: "A-0010", date: "26/09/2026", status: "valide", modified: "26/09/2026 à 08:44", values: base("Élément J", "A-0010") },
];

/* Error variant used by state 3: the selected row carries three errors. */
const ITEMS_WITH_ERRORS: Item[] = ITEMS.map((it) =>
  it.id === "b"
    ? {
        ...it, values: { ...it.values, champ1: "", champ2: "A-02", champ4: "31/02/2026" },
        errors: {
          champ1: "Champ obligatoire : saisissez un libellé.",
          champ2: ERR_CODE("ERR002", "Code invalide. Format attendu : 6 caractères, par exemple A-0001."),
          champ4: "Date invalide : le 31/02/2026 n’existe pas. Format attendu : JJ/MM/AAAA.",
        },
      }
    : it,
);

const errorsOf = (it?: Item) => (it?.errors ? Object.keys(it.errors).length : 0);

function ItemRow({ item, selected, onSelect }: { item: Item; selected: boolean; onSelect: () => void }) {
  const n = errorsOf(item);
  return (
    <li>
      <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined}
        className={`flex w-full items-center gap-[var(--space-3)] border-0 border-t-[length:var(--border-width)] border-solid border-[color:var(--border-subtle)] px-[var(--space-5)] py-[var(--space-3)] text-left transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
          selected ? "bg-[var(--selection-bg)] shadow-[inset_var(--border-width-strong)_0_0_var(--selection-border)]" : "cursor-pointer bg-transparent hover:bg-[var(--blue-50)]"}`}>
        {n > 0 && <span className="text-[var(--error-text)]"><CircleAlertIcon /></span>}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate font-medium ${n > 0 ? "text-[var(--error-text)]" : "text-[var(--text-default)]"}`}>{item.label}</span>
          <span className="text-[length:var(--fs-12)] leading-[var(--lh-16)] text-[var(--text-muted)]">
            <span className="font-[family-name:var(--font-mono)]">{item.code}</span> · {item.date}
          </span>
        </span>
        {n > 0 ? <CountBadge count={n} /> : item.status && <StatusBadge status={item.status} />}
      </button>
    </li>
  );
}

function ListPanel({ items, selectedId, onSelect, loading = false }: { items: Item[]; selectedId: string | null; onSelect: (id: string) => void; loading?: boolean }) {
  const errs = items.filter((i) => errorsOf(i) > 0).length;
  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader title="Éléments"
        caption={loading ? "Chargement…" : items.length === 0 ? "0 élément" : `${items.length} éléments${errs ? ` · ${errs} en erreur` : ""}`} />
      <div className="px-[var(--space-5)] py-[var(--space-4)]"><SearchInput disabled={loading || items.length === 0} /></div>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <ul aria-busy="true" aria-label="Chargement des éléments" className="m-0 list-none p-0">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-[var(--space-3)] border-t-[length:var(--border-width)] border-solid border-[color:var(--border-subtle)] px-[var(--space-5)] py-[var(--space-3)]">
                <span className="flex flex-1 flex-col gap-[var(--space-1)]"><Skeleton className="h-[var(--fs-14)] w-[55%]" /><Skeleton className="h-[var(--fs-12)] w-[40%]" /></span>
                <Skeleton className="h-[var(--lh-20)] w-[var(--space-16)]" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState compact title="Aucun élément" caption="Le premier élément enregistré apparaîtra ici." />
        ) : (
          <ul className="m-0 list-none p-0">
            {items.map((it) => <ItemRow key={it.id} item={it} selected={it.id === selectedId} onSelect={() => onSelect(it.id)} />)}
          </ul>
        )}
      </div>
    </Card>
  );
}

function FormPanel({ item, saving = false }: { item?: Item; saving?: boolean }) {
  const create = !item;
  const v = item?.values ?? EMPTY_VALUES;
  const e = item?.errors ?? {};
  const n = errorsOf(item);
  return (
    <Card className="min-h-0">
      <CardHeader title={create ? "Nouvel élément" : item!.label || "Élément sans libellé"}
        caption={create ? "Les champs marqués d’un astérisque sont obligatoires." : `Dernière modification : ${item!.modified}`}
        aside={!create && (n > 0 ? <StatusBadge status="en-erreur" /> : item!.status && <StatusBadge status={item!.status} />)} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-[var(--space-6)] p-[var(--space-6)]">
          {n > 0 && (
            <Alert tone="error" title={`${n} erreur${n > 1 ? "s empêchent" : " empêche"} l’enregistrement`}>
              Corrigez les champs signalés en rouge : chaque message indique la valeur attendue.
            </Alert>
          )}
          <div className="flex flex-col gap-[var(--space-4)]">
            <Overline>Titre de section</Overline>
            <SectionOneFields v={v} e={e} disabled={saving} create={create} />
          </div>
          <div className="border-t-[length:var(--border-width)] border-solid border-[color:var(--border-subtle)]" />
          <div className="flex flex-col gap-[var(--space-4)]">
            <Overline>Titre de section</Overline>
            <SectionTwoFields v={v} e={e} disabled={saving} create={create} />
          </div>
        </div>
        <ActionBar inCard state={n > 0 ? "errors" : saving ? "saving" : "idle"} errorCount={n} />
      </div>
    </Card>
  );
}

function FormPanelSkeleton() {
  return (
    <Card className="min-h-0" >
      <header className="flex flex-col gap-[var(--space-2)] border-b-[length:var(--border-width)] border-solid border-[color:var(--border-subtle)] px-[var(--space-6)] py-[var(--space-5)]">
        <Skeleton className="h-[var(--fs-16)] w-[calc(var(--space-16)*2)]" />
        <Skeleton className="h-[var(--fs-12)] w-[calc(var(--space-16)*3)]" />
      </header>
      <div aria-busy="true" aria-label="Chargement du formulaire" className="grid grid-cols-2 gap-x-[var(--space-6)] gap-y-[var(--space-5)] p-[var(--space-6)]">
        <SkeletonField /><SkeletonField /><SkeletonField /><SkeletonField /><SkeletonField wide />
      </div>
    </Card>
  );
}

type LFState = "edit" | "empty" | "errors" | "loading";

function ListFormScreen({ state }: { state: LFState }) {
  const source = state === "errors" ? ITEMS_WITH_ERRORS : state === "empty" ? [] : ITEMS;
  const [selectedId, setSelectedId] = useState<string | null>(state === "edit" || state === "errors" ? "b" : null);
  const selected = source.find((i) => i.id === selectedId);
  const loading = state === "loading";
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-[var(--space-8)] px-[var(--space-10)] py-[var(--space-8)]">
      <ScreenHeader
        title="Titre de l’écran"
        caption={loading ? "Chargement des éléments…" : `${source.length} élément${source.length > 1 ? "s" : ""}`}
        actions={
          <>
            {/* "Enregistrer" is the one primary of this view: "Nouvel élément" is secondary here. */}
            <Button variant="secondary" icon={<PlusIcon />} disabled={loading} onClick={() => setSelectedId(null)}>Nouvel élément</Button>
            <Button variant="destructive" icon={<Trash2Icon />} disabled={loading || !selected}>Supprimer l’élément</Button>
          </>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(360px,1fr)_2fr] gap-[var(--space-6)]">
        <ListPanel items={source} selectedId={selectedId} onSelect={setSelectedId} loading={loading} />
        {loading ? <FormPanelSkeleton /> : <FormPanel key={selectedId ?? "new"} item={selected} />}
      </div>
    </div>
  );
}

export default function ListFormPattern() {
  const H = 980; // window height: both panels scroll inside their cards
  return (
    <Storyboard title="Pattern « liste + formulaire » — list+form.tsx">
      <StoryState index={1} title="Liste avec données + formulaire en édition" note="Recette · cliquez une ligne pour remplir le formulaire, « Nouvel élément » pour le mode création">
        <AppFrame env="recette" height={H}><ListFormScreen state="edit" /></AppFrame>
      </StoryState>
      <StoryState index={2} title="Liste vide + formulaire de création" note="Production · état vide compact, formulaire en mode création">
        <AppFrame env="production" height={H}><ListFormScreen state="empty" /></AppFrame>
      </StoryState>
      <StoryState index={3} title="Formulaire avec erreurs de validation" note="Production · chaîne §9.2 dans le formulaire, ligne correspondante signalée dans la liste">
        <AppFrame env="production" height={H}><ListFormScreen state="errors" /></AppFrame>
      </StoryState>
      <StoryState index={4} title="Chargement" note="Production · lignes et champs squelettes, actions d’en-tête désactivées">
        <AppFrame env="production" height={H}><ListFormScreen state="loading" /></AppFrame>
      </StoryState>
    </Storyboard>
  );
}
