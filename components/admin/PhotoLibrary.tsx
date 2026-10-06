'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PhotoMedia } from '@/utils/uploadCommitteePhoto';

export function PhotoLibrary({ api, onClose, onSelect }: { api: string; onClose: () => void; onSelect: (photo: PhotoMedia) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ page: number; docs: PhotoMedia[]; totalPages: number; error?: string } | null>(null);
  useEffect(() => {
    const element = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); focus?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}/media?depth=0&limit=12&page=${page}&sort=-createdAt`, { credentials: 'same-origin', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Unable to load photos. Please try again.'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setResult({ page, docs: data.docs || [], totalPages: data.totalPages || 1 }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ page, docs: [], totalPages: 1, error: 'Unable to load photos. Please try again.' }); });
    return () => controller.abort();
  }, [api, page, retry]);
  const ready = result?.page === page;
  return createPortal(<dialog ref={dialog} className="masca-photo-library" aria-labelledby="masca-photo-library-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <header><div><h2 id="masca-photo-library-title">Choose a photo</h2><p>Select an image from your media library.</p></div><button type="button" aria-label="Close photo library" onClick={onClose}>Close ×</button></header>
    {!ready ? <p role="status">Loading photos…</p> : result.error ? <div role="alert"><p>{result.error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : <>
      {!result.docs.length && <p>No photos yet. Close this window and upload your first photo.</p>}
      <div className="masca-photo-library__grid">{result.docs.map(doc => <button type="button" key={doc.id} onClick={() => onSelect(doc)}><img src={doc.sizes?.['admin-preview']?.url || doc.url} alt="" loading="lazy" /><span>{doc.filename || 'Photo'}</span></button>)}</div>
      {result.totalPages > 1 && <nav aria-label="Photo pages"><button type="button" disabled={page === 1} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page} of {result.totalPages}</span><button type="button" disabled={page >= result.totalPages} onClick={() => setPage(n => n + 1)}>Next</button></nav>}
    </>}
  </dialog>, document.body);
}
