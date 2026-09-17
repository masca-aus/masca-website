'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './eventStatusCell.css';

type Option = { value: string; label: string };
export function EventActionMenu({ label, text, tone, options, current, disabled, busy, onChoose }: {
  label: string; text: string; tone?: string; options: Option[]; current?: string; disabled?: boolean; busy?: boolean; onChoose: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const last = useRef(false);
  const open = Boolean(position) && !disabled;
  function close(restore = false) { setPosition(null); if (restore) trigger.current?.focus(); }
  function show(fromEnd = false) {
    if (disabled) return;
    last.current = fromEnd;
    const rect = trigger.current!.getBoundingClientRect();
    const height = options.length * 40 + 12;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const maxHeight = Math.max(40, Math.min(height, Math.max(below, above)));
    setPosition({ left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)), top: below >= height || below >= above ? rect.bottom + 6 : Math.max(8, rect.top - maxHeight - 6), maxHeight });
  }
  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]');
    items?.[last.current ? items.length - 1 : 0]?.focus();
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null); };
    const reposition = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setPosition(null); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open]);
  return <>
    <div className="masca-status-action__control" data-tone={tone}>
      <span className="masca-status-action__dot" aria-hidden="true" />
      <button ref={trigger} className="masca-status-action__trigger" type="button" aria-label={`${label}: ${text}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled}
        onClick={event => { event.stopPropagation(); if (open) close(); else show(); }}
        onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(event.key === 'ArrowUp'); } }}>{text}</button>
      <span aria-hidden="true" className={busy ? 'masca-status-action__spinner' : 'masca-status-action__chevron'}>{busy ? '' : '⌄'}</span>
    </div>
    {open && createPortal(<div ref={menu} id={id} role="menu" aria-label={label} className="masca-event-menu" style={position!} onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key === 'Tab') close(true);
        else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
          const match = [...items.slice(index + 1), ...items.slice(0, index + 1)].find(item => item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()));
          if (match) { event.preventDefault(); match.focus(); }
        }
      }}>
      {options.map(option => <button key={option.value} type="button" role={current === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={current === undefined ? undefined : current === option.value}
        onClick={() => { close(true); onChoose(option.value); }}><span>{option.label}</span>{current === option.value && <span aria-hidden="true">✓</span>}</button>)}
    </div>, document.body)}
  </>;
}
