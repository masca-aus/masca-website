'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { compressUploadImage, MAX_UPLOAD_IMAGE_BYTES } from '@/utils/imageCompression';

/** Process native selections before Payload queues them, including nested and bulk uploads. */
export function ImageUploadCompression({ children }: { children?: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  useEffect(() => {
    let disposed = false;
    const replayed = new WeakSet<Event>();
    const generations = new WeakMap<Element, number>();
    const intercept = (event: Event) => {
      if (replayed.has(event)) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-masca-inline-upload]')) return;
      const input = target instanceof HTMLInputElement && target.type === 'file' ? target : null;
      const zone = target.closest('.dropzone');
      const transfer = event.type === 'drop' ? (event as DragEvent).dataTransfer : event.type === 'paste' ? (event as ClipboardEvent).clipboardData : null;
      const files = input && event.type === 'change' ? input.files : zone ? transfer?.files : null;
      if (!files?.length) return;
      const owner = zone || input!;
      const replayTarget = input || zone!;
      const generation = (generations.get(owner) || 0) + 1;
      generations.set(owner, generation);
      const selected = Array.from(files);
      if (!selected.some(file => file.type.startsWith('image/') && file.size > MAX_UPLOAD_IMAGE_BYTES)) { setNotice(null); return; }
      // Stop before both React's file handler and Payload's native Dropzone listeners.
      event.preventDefault();
      event.stopImmediatePropagation();
      setNotice({ message: 'Optimising photo…' });
      const prepare = async () => {
        const data = new DataTransfer();
        for (const file of selected) data.items.add(file.type.startsWith('image/') ? await compressUploadImage(file) : file);
        if (disposed || !owner.isConnected || !replayTarget.isConnected || generations.get(owner) !== generation) return;
        let replay: Event;
        if (input) {
          input.files = data.files;
          replay = new Event('change', { bubbles: true });
        } else if (event.type === 'paste') {
          replay = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data });
        } else {
          replay = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data });
        }
        replayed.add(replay);
        replayTarget.dispatchEvent(replay);
        setNotice({ message: 'Photo ready. Large images have been compressed to fit.' });
      };
      void prepare().catch(reason => {
        if (disposed || generations.get(owner) !== generation) return;
        if (input) input.value = '';
        setNotice({ error: true, message: reason instanceof Error ? reason.message : 'Unable to optimise this photo. Please choose a smaller image.' });
      });
    };
    document.addEventListener('change', intercept, true);
    document.addEventListener('drop', intercept, true);
    document.addEventListener('paste', intercept, true);
    return () => {
      disposed = true;
      document.removeEventListener('change', intercept, true);
      document.removeEventListener('drop', intercept, true);
      document.removeEventListener('paste', intercept, true);
    };
  }, []);
  return <>{children}{notice && <div role={notice.error ? 'alert' : 'status'} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, maxWidth: 420, padding: '16px 20px', borderRadius: 12, background: notice.error ? '#fff0ee' : '#fff', color: '#010066', boxShadow: '0 4px 24px #01006626' }}>{notice.message}<button type="button" aria-label="Dismiss photo message" onClick={() => setNotice(null)} style={{ marginLeft: 12 }}>×</button></div>}</>;
}
