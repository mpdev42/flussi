import * as React from 'react';
import { Info, CircleCheck, TriangleAlert, CircleAlert, X } from 'lucide-react';
import { cx, ICON, ICON_STROKE } from './utils';
import { Button } from './Button';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons under the text ("Voir les erreurs"). */
  actions?: React.ReactNode;
  /** Shows a × button. Errors that block the workflow are never dismissible. */
  onDismiss?: () => void;
}

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

export function Alert({ tone = 'info', title, children, actions, onDismiss, className, ...rest }: AlertProps) {
  const Icon = ICONS[tone];
  const live = tone === 'error' || tone === 'warning' ? 'alert' : 'status';
  return (
    <div role={live} className={cx('fl-alert', `fl-alert-${tone}`, className)} {...rest}>
      <Icon className="fl-icon fl-alert-icon" size={title ? ICON.lg : ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <div className="fl-alert-content">
        {title && <p className="fl-alert-title">{title}</p>}
        {children && <div className="fl-alert-desc">{children}</div>}
        {actions && <div className="fl-alert-actions">{actions}</div>}
      </div>
      {onDismiss && (
        <Button variant="ghost" size="sm" iconOnly aria-label="Masquer le message" className="fl-alert-dismiss" onClick={onDismiss}
          icon={<X className="fl-icon" size={ICON.md} strokeWidth={ICON_STROKE} aria-hidden="true" />} />
      )}
    </div>
  );
}
