import * as React from 'react';
import { Check, Circle, CircleAlert } from 'lucide-react';
import { cx, ICON, ICON_STROKE } from './utils';

export interface SpinnerProps {
  size?: number;
  /** Accessible label. null when the parent already announces the state (a busy button). */
  label?: string | null;
  /** Brand blue instead of currentColor. */
  brand?: boolean;
}

export function Spinner({ size = ICON.md, label = 'Chargement…', brand }: SpinnerProps) {
  const stroke = size >= ICON.lg ? 2.5 : 2;
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

export interface SkeletonProps { width?: number | string; height?: number | string; variant?: 'text' | 'block' | 'circle'; className?: string }

/** Placeholder while data loads (tables, record forms). Wrap a group in aria-busy="true". */
export function Skeleton({ width = '100%', height, variant = 'text', className }: SkeletonProps) {
  return <span aria-hidden="true" className={cx('fl-skeleton', variant === 'text' && 'fl-skeleton-text', variant === 'circle' && 'fl-skeleton-circle', className)} style={{ width, height }} />;
}

export interface ProgressBarProps { value?: number; /** omit value for indeterminate */ tone?: 'brand' | 'success' | 'error'; label: string }

export function ProgressBar({ value, tone = 'brand', label }: ProgressBarProps) {
  const indeterminate = value === undefined;
  return (
    <div className={cx('fl-progress', indeterminate && 'fl-progress-indeterminate', tone !== 'brand' && `fl-progress-${tone}`)}
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(value!)}>
      <div className="fl-progress-fill" style={indeterminate ? undefined : { width: `${Math.max(0, Math.min(100, value!))}%` }} />
    </div>
  );
}

export type StepState = 'done' | 'current' | 'pending' | 'error';
export interface OperationStep { label: React.ReactNode; state: StepState; detail?: React.ReactNode }

export interface OperationProgressProps {
  /** "Dépôt du fichier en cours" */
  title: React.ReactNode;
  /** 0–100; omit when the duration is unknown (FTP listing, export in the business system). */
  value?: number;
  /** Left meta line: "2,4 Mo sur 5,1 Mo". */
  detail?: React.ReactNode;
  /** Right meta line: "Environ 20 s restantes". */
  remaining?: React.ReactNode;
  steps?: OperationStep[];
  /** e.g. <Button variant="outline" size="sm">Annuler</Button>. Omit once the operation can no longer be cancelled. */
  action?: React.ReactNode;
  tone?: 'brand' | 'success' | 'error';
}

/** A long-running operation (transfer, export, checks). Announces progress politely; never blocks the whole window. */
export function OperationProgress({ title, value, detail, remaining, steps, action, tone = 'brand' }: OperationProgressProps) {
  const pct = value === undefined ? null : `${Math.round(value)} %`;
  return (
    <div className="fl-operation" aria-live="polite" aria-busy={tone === 'brand' || undefined}>
      <div className="fl-operation-head">
        {tone === 'brand' && <Spinner brand label={null} />}
        {tone === 'success' && <Check className="fl-icon fl-operation-icon-success" size={ICON.md} strokeWidth={2} aria-hidden="true" />}
        {tone === 'error' && <CircleAlert className="fl-icon fl-operation-icon-error" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />}
        <p className="fl-operation-title">{title}</p>
        {pct && <span className="fl-operation-pct">{pct.replace(' ', ' ')}</span>}
        {action}
      </div>
      <ProgressBar value={value} tone={tone} label={typeof title === 'string' ? title : 'Progression'} />
      {(detail || remaining) && (<div className="fl-operation-meta"><span>{detail}</span><span>{remaining}</span></div>)}
      {steps && (
        <ol className="fl-steps">
          {steps.map((s, i) => (
            <li key={i} className={cx('fl-step', `fl-step-${s.state}`)}>
              {s.state === 'done' && <Check className="fl-icon" size={ICON.sm} strokeWidth={2.25} aria-hidden="true" />}
              {s.state === 'current' && <Spinner size={ICON.sm} label={null} />}
              {s.state === 'pending' && <Circle className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />}
              {s.state === 'error' && <CircleAlert className="fl-icon" size={ICON.sm} strokeWidth={ICON_STROKE} aria-hidden="true" />}
              <span>{s.label}</span>
              <span className="fl-sr-only">{({ done: ' — terminé', current: ' — en cours', pending: ' — à venir', error: ' — en erreur' } as const)[s.state]}</span>
              {s.detail && <span className="fl-step-status">{s.detail}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
