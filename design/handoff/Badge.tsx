import * as React from 'react';
import { CalendarCheck, Clock, CircleAlert, Send, CircleCheck, Hourglass, FlaskConical } from 'lucide-react';
import { cx, ICON, ICON_STROKE } from './utils';

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'error' | 'testenv';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Strong fill — only for a status that must jump out of a dense table. */
  solid?: boolean;
  icon?: React.ReactNode;
  /** Monospaced content (codes: "ERR002", "300"). */
  mono?: boolean;
}

export function Badge({ tone = 'neutral', solid, icon, mono, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('fl-badge', `fl-badge-${tone}`, solid && 'fl-badge-solid', mono && 'fl-badge-mono', className)} {...rest}>
      {icon}{children}
    </span>
  );
}

export type FileStatus = 'du-jour' | 'ancien' | 'en-erreur' | 'depose' | 'valide' | 'en-attente';

const STATUS: Record<FileStatus, { tone: BadgeTone; label: string; Icon: typeof Clock }> = {
  'du-jour': { tone: 'success', label: 'Du jour', Icon: CalendarCheck },
  'ancien': { tone: 'warning', label: 'Ancien', Icon: Clock },
  'en-erreur': { tone: 'error', label: 'En erreur', Icon: CircleAlert },
  'depose': { tone: 'info', label: 'Déposé', Icon: Send },
  'valide': { tone: 'success', label: 'Valide', Icon: CircleCheck },
  'en-attente': { tone: 'neutral', label: 'En attente', Icon: Hourglass },
};

/** File / run status. Icon + word, so the status never depends on colour. */
export function StatusBadge({ status, label, solid }: { status: FileStatus; label?: string; solid?: boolean }) {
  const s = STATUS[status];
  return <Badge tone={s.tone} solid={solid} icon={<s.Icon className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />}>{label ?? s.label}</Badge>;
}

/** "Recette" marker for the header and Settings. The banner itself is EnvironmentBanner. */
export function EnvironmentBadge() {
  return <Badge tone="testenv" icon={<FlaskConical className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />}>Recette</Badge>;
}

export interface CountBadgeProps { count: number; /** Accessible noun, singular / plural. */ noun?: [string, string]; tone?: 'error' | 'warning' | 'neutral'; max?: number }

/** Error count for tabs and tree nodes. Hidden when count is 0. */
export function CountBadge({ count, noun = ['erreur', 'erreurs'], tone = 'error', max = 99 }: CountBadgeProps) {
  if (count <= 0) return null;
  const text = count > max ? `${max}+` : String(count);
  return (
    <span className={cx('fl-count', tone !== 'error' && `fl-count-${tone}`)}>
      <span aria-hidden="true">{text}</span>
      <span className="fl-sr-only">{`${count} ${count > 1 ? noun[1] : noun[0]}`}</span>
    </span>
  );
}
