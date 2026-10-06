'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, useConfig, useField, useForm } from '@payloadcms/ui';
import type { UploadFieldClientProps } from 'payload';
import { uploadCommitteePhoto, type PhotoMedia } from '@/utils/uploadCommitteePhoto';
import { PhotoLibrary } from './PhotoLibrary';
import { PortraitAdjuster } from './PortraitAdjuster';
import './committeePhoto.css';

export function CommitteePhotoField({ path, field, readOnly }: UploadFieldClientProps) {
  const { value, setValue, disabled, showError, errorMessage } = useField<number | string | PhotoMedia | null>({ path });
  const { config } = useConfig();
  const { permissions } = useAuth();
  const { setProcessing } = useForm();
  const api = config.routes.api;
  const id = value && typeof value === 'object' ? value.id : value;
  const [photo, setPhoto] = useState<PhotoMedia | null>(null);
  const [pending, setPending] = useState<{ url: string; name: string } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [library, setLibrary] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [original, setOriginal] = useState<{ id: number | string; file: File; framing?: { zoom: number; x: number; y: number } } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const locked = !!(readOnly || disabled || pending);
  const canUpload = permissions?.collections?.media?.create === true;
  const current = photo?.id === id ? photo : value && typeof value === 'object' ? value : null;
  const source = pending?.url || current?.sizes?.['admin-preview']?.url || current?.url;
  useEffect(() => {
    if (!id || photo?.id === id) return;
    const controller = new AbortController();
    fetch(`${api}/media/${encodeURIComponent(String(id))}?depth=0`, { credentials: 'same-origin', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(doc => { if (!controller.signal.aborted && doc) setPhoto(doc); })
      .catch(() => {});
    return () => controller.abort();
  }, [api, id, photo?.id]);
  useEffect(() => () => { if (request.current) { request.current.abort(); setProcessing(false); } }, [setProcessing]);
  const upload = async (file?: File, originalFile?: File, framing?: { zoom: number; x: number; y: number }): Promise<boolean> => {
    if (!file || locked || !canUpload || request.current) return false;
    const controller = new AbortController();
    request.current = controller;
    const url = URL.createObjectURL(file);
    setPending({ url, name: file.name }); setError(''); setProcessing(true);
    try {
      const doc = await uploadCommitteePhoto(file, api, controller.signal, setStatus);
      if (controller.signal.aborted) return false;
      setPhoto(doc); setValue(doc.id); setOriginal({ id: doc.id, file: originalFile || file, framing });
      setStatus('Photo added. Save the member to keep your changes.');
      return true;
    } catch (reason) {
      if (!controller.signal.aborted) { setStatus(''); setError(reason instanceof Error ? reason.message : 'Upload failed. Please try again.'); }
      return false;
    } finally {
      URL.revokeObjectURL(url);
      if (!controller.signal.aborted) { setPending(null); setProcessing(false); }
      if (request.current === controller) request.current = null;
    }
  };
  return <div className={`field-type masca-photo-field ${field.admin?.className || ''}`} data-masca-inline-upload onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files[0]); }}>
    <div className="masca-photo-field__heading"><label>Portrait</label><span>Optional</span></div>
    <div className="masca-photo-field__body" aria-busy={!!pending}>
      <div className="masca-photo-field__preview">{source ?  <img src={source} alt="Portrait preview" /> : <span aria-hidden="true">＋</span>}</div>
      <div className="masca-photo-field__content">
        <h3>{pending ? 'Adding your photo' : id ? 'Your committee portrait' : 'Add a face to the name'}</h3>
        <p>Choose a photo or drop it here. Large photos are automatically compressed.</p>
        <input ref={input} type="file" accept="image/*" hidden disabled={locked || !canUpload} aria-label="Choose portrait file" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void upload(file); }} />
        <div className="masca-photo-field__actions">
          {canUpload && <button type="button" className="masca-photo-primary" disabled={locked} onClick={() => input.current?.click()}>{id ? 'Replace photo' : 'Upload photo'}</button>}
          {canUpload && !!id && <button type="button" disabled={locked || !current?.url} onClick={() => setAdjusting(true)}>Adjust photo</button>}
          <button type="button" disabled={locked} onClick={() => setLibrary(true)}>Choose existing</button>
          {!!id && <button type="button" disabled={locked} onClick={() => { setValue(null); setPhoto(null); setStatus('Photo removed from this member. Save to keep your changes.'); setError(''); }}>Remove</button>}
        </div>
        {!canUpload && !readOnly && <p>You can choose an existing photo. Ask an administrator to upload a new one.</p>}
        {status && <p className="masca-photo-field__status" role="status">{status}</p>}
        {(error || showError) && <p className="masca-photo-field__error" role="alert">{error || errorMessage}</p>}
      </div>
    </div>
    {adjusting && current?.url && <PortraitAdjuster source={original?.id === id ? original.file : current.url} filename={current.filename} initial={original?.id === id ? original.framing : undefined} onClose={() => setAdjusting(false)} onApply={upload} />}
    {library && <PhotoLibrary api={api} onClose={() => setLibrary(false)} onSelect={doc => { setPhoto(doc); setValue(doc.id); setStatus('Photo selected. Save the member to keep your changes.'); setError(''); setLibrary(false); }} />}
  </div>;
}
