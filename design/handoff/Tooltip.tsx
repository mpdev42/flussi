import * as React from 'react';
import { cx, useFieldId } from './utils';

export interface TooltipProps {
  /** Short text (one sentence). Never put essential information only in a tooltip. */
  content: React.ReactNode;
  /** Keyboard shortcut shown after the text, e.g. "Ctrl+S". */
  shortcut?: string;
  placement?: 'top' | 'bottom';
  /** 'start' aligns the tooltip with the trigger's left edge (triggers near the window's left edge). */
  align?: 'center' | 'start';
  /** The trigger: ONE focusable element (button, link, icon button). */
  children: React.ReactElement;
  /** Documentation only. */
  defaultOpen?: boolean;
}

const HOVER_DELAY = 400; // = delay-tooltip token

export function Tooltip({ content, shortcut, placement = 'top', align = 'center', children, defaultOpen = false }: TooltipProps) {
  const id = useFieldId();
  const [open, setOpen] = React.useState(defaultOpen);
  const timer = React.useRef<number>();
  const show = (delay: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), delay); };
  const hide = () => { window.clearTimeout(timer.current); if (!defaultOpen) setOpen(false); };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const trigger = React.cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: () => show(HOVER_DELAY),
    onMouseLeave: hide,
    onFocus: () => show(0),
    onBlur: hide,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Escape') hide(); children.props.onKeyDown?.(e); },
  });
  return (
    <span className="fl-tooltip-anchor">
      {trigger}
      {open && (
        <span role="tooltip" id={id} className={cx('fl-tooltip', `fl-tooltip-${placement}`, align === 'start' && 'fl-tooltip-start')}>
          {content}{shortcut && <span className="fl-tooltip-kbd">{shortcut}</span>}
        </span>
      )}
    </span>
  );
}
