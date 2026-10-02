import * as React from 'react';
import { cx } from './utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Badge or icon shown right after the title (status of what the card holds). */
  titleAddon?: React.ReactNode;
  /** Buttons at the right of the header. */
  actions?: React.ReactNode;
  /** Buttons in the footer, right-aligned, primary last. */
  footer?: React.ReactNode;
  /** Remove body padding (a table fills the card). */
  flush?: boolean;
  /** Whole card is clickable (opens a detail). Renders as a focusable region with hover border. */
  interactive?: boolean;
  selected?: boolean;
  /** Heading level of the title for document outline (default h3). */
  headingLevel?: 2 | 3 | 4;
}

export function Card({ title, description, titleAddon, actions, footer, flush, interactive, selected, headingLevel = 3, className, children, ...rest }: CardProps) {
  const H = `h${headingLevel}` as 'h3';
  return (
    <section className={cx('fl-card', interactive && 'fl-card-interactive', selected && 'fl-card-selected', className)} tabIndex={interactive ? 0 : undefined} {...rest}>
      {(title || actions) && (
        <header className="fl-card-header">
          <div className="fl-card-titles">
            {title && <H className="fl-card-title">{title}{titleAddon}</H>}
            {description && <p className="fl-card-desc">{description}</p>}
          </div>
          {actions && <div className="fl-card-actions">{actions}</div>}
        </header>
      )}
      <div className={cx('fl-card-body', flush && 'fl-card-body-flush')}>{children}</div>
      {footer && <footer className="fl-card-footer">{footer}</footer>}
    </section>
  );
}

/** Label/value grid for read-only record data. Use `mono` on values that are raw codes. */
export function DataList({ items }: { items: Array<{ label: React.ReactNode; value: React.ReactNode; mono?: boolean }> }) {
  return (
    <dl className="fl-dl">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt>{it.label}</dt>
          <dd className={it.mono ? 'fl-mono' : undefined}>{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
