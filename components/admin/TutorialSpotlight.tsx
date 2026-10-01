'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SpotlightStep = { title: string; body: string; tip?: string; target: string; editorStep?: number; action?: 'create' | 'review' };
type Box = { top: number; left: number; width: number; height: number };
export function TutorialSpotlight({ steps, label, onClose, onPreviewStep, onNavigate }: {
  steps: SpotlightStep[]; label: string; onClose: () => void;
  onPreviewStep?: (step: number) => void; onNavigate: (href: string, action: 'create' | 'review') => void;
}) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); }, []);
  function changeStep(next: number) {
    if (fading) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setIndex(next); return; }
    setFading(true);
    transitionTimer.current = setTimeout(() => {
      setIndex(next);

    }, 140);
  }
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const id = useId();
  const step = steps[index];
  useLayoutEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useLayoutEffect(() => {
    if (step.editorStep !== undefined) onPreviewStep?.(step.editorStep);
    let frame = 0;
    let disposed = false;
    const find = () => step.target.split(',').flatMap(selector => Array.from(document.querySelectorAll<HTMLElement>(selector.trim()))).find(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && !el.closest('dialog')) ?? null;
    function measure() {
      if (disposed) return;
      target.current = find();
      const rect = target.current?.getBoundingClientRect();
      const w = window.innerWidth, h = window.innerHeight;
      const next = rect ? { top: Math.max(8, rect.top - 6), left: Math.max(8, rect.left - 6), width: Math.min(rect.width + 12, w - Math.max(8, rect.left - 6) - 8), height: Math.min(rect.height + 12, h - Math.max(8, rect.top - 6) - 8) } : null;
      setBox(next && next.width > 0 && next.height > 0 ? next : null);
      setReady(true);
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    target.current = find();
    target.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    measure();
    const initialFrame = requestAnimationFrame(() => {
      target.current = find();
      target.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      title.current?.focus({ preventScroll: true });
      measure();
      setFading(false);
    });
    const observer = new ResizeObserver(schedule);
    if (card.current) observer.observe(card.current);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => { disposed = true; cancelAnimationFrame(initialFrame); cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); };
  }, [step, onPreviewStep]);
  function navigate() {
    const el = target.current;
    if (step.action && el instanceof HTMLAnchorElement) onNavigate(el.href, step.action);
  }
  return createPortal(<dialog ref={dialog} className="masca-spotlight" data-fading={fading} data-ready={ready} aria-labelledby={id} onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => e.stopPropagation()}>
    <svg className="masca-spotlight__shade" aria-hidden="true" width="100%" height="100%"><defs><mask id={`${id}-mask`}><rect width="100%" height="100%" fill="white" />{box && !fading && <rect {...box} x={box.left} y={box.top} rx="10" fill="black" />}</mask></defs><rect width="100%" height="100%" fill="rgba(8,8,25,.65)" mask={`url(#${id}-mask)`} /></svg>
    {box && !fading && <div className="masca-spotlight__ring" style={box}>{step.action && <button type="button" aria-label={step.action === 'create' ? 'Open creation form and continue tutorial' : 'Open submissions to review'} onClick={navigate} />}</div>}
    <div ref={card} className="masca-listing-tutorial masca-spotlight__card">
      <header><span>{label} · Guided tour</span><button type="button" aria-label="Close tutorial" onClick={onClose}>×</button></header>
      <div className="masca-spotlight__instructions">
      <p className="masca-listing-tutorial__count" aria-live="polite">Step {index + 1} of {steps.length}</p>
      <h2 id={id} ref={title} tabIndex={-1}>{step.title}</h2><p>{step.body}</p>
      {!box && <aside>This control is not available in the current view or with your account’s access. You can continue the tour.</aside>}
      {step.tip && <aside>{step.tip}</aside>}
      {step.action && box && <p className="masca-spotlight__hint">Click the highlighted control to {step.action === 'create' ? 'open the form and continue the tour' : 'open the review queue'}.</p>}
      </div>
      <footer><button type="button" className="masca-action masca-action--secondary" onClick={onClose}>Skip tutorial</button><div><button type="button" className="masca-action masca-action--secondary" disabled={index === 0 || fading} onClick={() => changeStep(index - 1)}>Back</button><button type="button" className="masca-action masca-action--primary" disabled={fading} onClick={() => index === steps.length - 1 ? onClose() : changeStep(index + 1)}>{index === steps.length - 1 ? 'Done' : 'Next'}</button></div></footer>
    </div>
  </dialog>, document.body);
}
