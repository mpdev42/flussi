import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Check, Circle, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

type ProgressTone = 'brand' | 'success' | 'error';

const progressFill = cva('h-full rounded-full', {
  variants: {
    tone: {
      brand: 'bg-blue-500',
      success: 'bg-success-solid',
      error: 'bg-error-solid',
    },
    indeterminate: {
      // Mouvement de -40 % à 100 % de la piste : le segment (40 % de large) part de left: 100 %
      // et l'animation « enter » de tailwindcss-animate le décale de -350 % de sa largeur, en boucle.
      // Durée en propriété arbitraire : une valeur arbitraire de l'utilitaire « duration » est
      // ambiguë (transition / animation) et Tailwind ne la génère pas.
      true: 'absolute inset-y-0 left-full w-2/5 animate-in slide-in-from-left-[350%] repeat-infinite [animation-duration:1600ms] ease-standard motion-reduce:left-0 motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50',
      false: 'transition-[width] duration-slow ease-standard motion-reduce:transition-none',
    },
  },
});

export interface ProgressBarProps {
  /** 0 à 100 ; absent = progression indéterminée. */
  value?: number;
  tone?: ProgressTone;
  /** Libellé accessible de la barre. */
  label: string;
}

export function ProgressBar({ value, tone = 'brand', label }: ProgressBarProps) {
  const indeterminate = value === undefined;
  const bounded = indeterminate ? undefined : Math.max(0, Math.min(100, value));

  return (
    <div
      className="relative h-2 overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded === undefined ? undefined : Math.round(bounded)}
    >
      <div
        className={progressFill({ tone, indeterminate })}
        style={bounded === undefined ? undefined : { width: `${bounded}%` }}
      />
    </div>
  );
}

export type StepState = 'done' | 'current' | 'pending' | 'error';

export interface OperationStep {
  label: React.ReactNode;
  state: StepState;
  detail?: React.ReactNode;
}

const STEP_CLASSES: Record<StepState, string> = {
  done: 'text-foreground',
  current: 'font-medium text-foreground',
  pending: 'text-muted-foreground',
  error: 'font-medium text-error-text',
};

const STEP_SR_TEXT: Record<StepState, string> = {
  done: ' — terminé',
  current: ' — en cours',
  pending: ' — à venir',
  error: ' — en erreur',
};

function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case 'done':
      return (
        <Check
          className="shrink-0 text-success-text"
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      );
    case 'current':
      return <Spinner size={14} label={null} brand />;
    case 'pending':
      return <Circle className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />;
    case 'error':
      return <CircleAlert className="shrink-0" size={14} strokeWidth={1.75} aria-hidden="true" />;
  }
}

export interface OperationProgressProps {
  /** « Dépôt du fichier en cours » */
  title: React.ReactNode;
  /** 0 à 100 ; absent quand la durée est inconnue (listing FTP, export dans le logiciel métier). */
  value?: number;
  /** Méta à gauche : « 2,4 Mo sur 5,1 Mo ». */
  detail?: React.ReactNode;
  /** Méta à droite : « Environ 20 s restantes ». */
  remaining?: React.ReactNode;
  steps?: OperationStep[];
  /** Action (ex. bouton « Annuler »). À omettre dès que l'opération n'est plus annulable. */
  action?: React.ReactNode;
  tone?: ProgressTone;
}

/** Opération longue (transfert, export, contrôles). Annonce la progression poliment, sans bloquer la fenêtre. */
export function OperationProgress({
  title,
  value,
  detail,
  remaining,
  steps,
  action,
  tone = 'brand',
}: OperationProgressProps) {
  // Espace insécable avant « % » (DESIGN.md §3.3).
  const percent = value === undefined ? null : `${Math.round(value)} %`;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-white px-5 py-4"
      aria-live="polite"
      aria-busy={tone === 'brand' || undefined}
    >
      <div className="flex items-center gap-3">
        {tone === 'brand' && <Spinner label={null} brand />}
        {tone === 'success' && (
          <Check
            className="shrink-0 text-success-text"
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        {tone === 'error' && (
          <CircleAlert
            className="shrink-0 text-error-text"
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        <p className="m-0 flex-1 text-sm font-semibold text-navy-700">{title}</p>
        {percent && (
          <span className="font-mono text-body-sm tabular-nums text-foreground">{percent}</span>
        )}
        {action}
      </div>
      <ProgressBar
        value={value}
        tone={tone}
        label={typeof title === 'string' ? title : 'Progression'}
      />
      {(detail || remaining) && (
        <div className="flex justify-between gap-4 text-xs tabular-nums text-muted-foreground">
          <span>{detail}</span>
          <span>{remaining}</span>
        </div>
      )}
      {steps && (
        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-body-sm leading-5">
          {steps.map((step, index) => (
            <li key={index} className={cn('flex items-center gap-2', STEP_CLASSES[step.state])}>
              <StepIcon state={step.state} />
              <span>{step.label}</span>
              <span className="sr-only">{STEP_SR_TEXT[step.state]}</span>
              {step.detail && (
                <span className="ml-auto text-xs text-muted-foreground">{step.detail}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
