'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { exportPortrait, portraitCrop } from '@/utils/portraitCrop';

type Ready = { file: File; url: string; width: number; height: number };
export function PortraitAdjuster({ source, filename, initial, onClose, onApply }: { source: File | string; filename?: string; initial?: { zoom: number; x: number; y: number }; onClose: () => void; onApply: (photo: File, original: File, framing: { zoom: number; x: number; y: number }) => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [zoom, setZoom] = useState(initial?.zoom || 1);
  const [pan, setPan] = useState({ x: initial?.x || 0, y: initial?.y || 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current!; const focus = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { mounted.current = false; element.close(); focus?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let url = '';
    const load = async () => {
      let file: File;
      if (source instanceof File) file = source;
      else {
        const response = await fetch(source, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Unable to load the original photo. Replace it with a file from your device to adjust it.');
        const blob = await response.blob(); file = new File([blob], filename || 'portrait.jpg', { type: blob.type });
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Choose a JPEG or PNG photo to adjust.');
      const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const width = image.width, height = image.height; image.close();
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(file); setReady({ file, url, width, height });
    };
    void load().catch(() => { if (!controller.signal.aborted) setError('Unable to open this photo. Replace it with a JPEG or PNG from your device to adjust it.'); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [source, filename]);
  const crop = ready ? portraitCrop(ready.width, ready.height, zoom, pan.x, pan.y) : null;
  const move = (x: number, y: number) => setPan({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  const apply = async () => {
    if (!ready || busy) return;
    setBusy(true); setError('');
    try {
      const result = await exportPortrait(ready.file, zoom, pan.x, pan.y);
      if (!mounted.current) return;
      if (await onApply(result, ready.file, { zoom, ...pan })) { if (mounted.current) onClose(); }
      else if (mounted.current) setError('The adjusted photo could not be saved. Please try again.');
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Unable to adjust this photo.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  return createPortal(<dialog ref={dialog} className="masca-photo-library masca-portrait-adjuster" aria-labelledby="portrait-adjust-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header><div><h2 id="portrait-adjust-title">Adjust photo</h2><p>Drag to position. Zoom in for a closer portrait.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close photo adjustment">Close ×</button></header>
    {!ready && !error && <p role="status">Loading photo…</p>}
    {ready && crop && <>
      <div ref={frame} className="masca-portrait-adjuster__frame" role="group" tabIndex={0} aria-label="Portrait position. Use arrow keys to move the photo." onKeyDown={e => { if (busy || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); move(pan.x + (e.key === 'ArrowRight' ? .05 : e.key === 'ArrowLeft' ? -.05 : 0), pan.y + (e.key === 'ArrowDown' ? .05 : e.key === 'ArrowUp' ? -.05 : 0)); }} onPointerDown={e => { if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }; }} onPointerMove={e => { const start = drag.current; if (!start || start.id !== e.pointerId || busy) return; const bounds = e.currentTarget.getBoundingClientRect(); const overflowX = (ready.width / crop.width - 1) * bounds.width; const overflowY = (ready.height / crop.height - 1) * bounds.height; move(overflowX > 0 ? start.panX + 2 * (e.clientX - start.x) / overflowX : 0, overflowY > 0 ? start.panY + 2 * (e.clientY - start.y) / overflowY : 0); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <img src={ready.url} alt="Portrait crop preview" draggable={false} style={{ width: `${ready.width / crop.width * 100}%`, height: `${ready.height / crop.height * 100}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%` }} />
        <span className="masca-portrait-adjuster__grid" aria-hidden="true" />
      </div>
      <label className="masca-portrait-adjuster__zoom">Zoom <input aria-label="Zoom" type="range" min="1" max="3" step="0.01" value={zoom} disabled={busy} onChange={e => setZoom(Number(e.target.value))} /><output>{zoom.toFixed(1)}×</output></label>
      <p className="masca-portrait-adjuster__hint">4:5 portrait · You can also use the arrow keys to align the photo.</p>
    </>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Saving adjusted photo…</p>}
    <footer><button type="button" disabled={!ready || busy} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setError(''); }}>Reset</button><button type="button" className="masca-photo-primary" disabled={!ready || busy} onClick={() => void apply()}>Apply photo</button></footer>
  </dialog>, document.body);
}
