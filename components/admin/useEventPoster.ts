'use client';

import { useEffect, useRef, useState } from 'react';
import { useConfig, useFormFields } from '@payloadcms/ui';

export type EventPoster = { id?: number | string; url?: string; alt?: string; filename?: string; sizes?: { 'admin-preview'?: { url?: string } } };

/** Keep a short-lived preview per editor; revisiting the media step always refreshes it. */
export function useEventPoster(step: number): EventPoster | null {
  const { config } = useConfig();
  const value = useFormFields(([fields]) => fields.poster?.value);
  const id = value && typeof value === 'object' && 'id' in value ? value.id : value;
  const key = id ? `${config.routes.api}/media/${encodeURIComponent(String(id))}` : '';
  const cacheRef = useRef<{ key: string; expires: number } | null>(null);
  const [poster, setPoster] = useState<{ key: string; value: EventPoster | null } | null>(null);

  useEffect(() => {
    if (step === 2) cacheRef.current = null;
    if (step !== 4 || !key || (cacheRef.current?.key === key && cacheRef.current.expires > Date.now())) return;
    const controller = new AbortController();
    // Filename is required by the storage plugin when it generates media URLs.
    const select = 'depth=0&select[filename]=true&select[url]=true&select[alt]=true&select[sizes]=true';
    fetch(`${key}?${select}`, { signal: controller.signal, credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(value => {
        if (controller.signal.aborted) return;
        if (value) cacheRef.current = { key, expires: Date.now() + 120_000 };
        setPoster({ key, value });
      })
      .catch(() => { if (!controller.signal.aborted) setPoster({ key, value: null }); });
    return () => controller.abort();
  }, [key, step]);

  return poster?.key === key ? poster.value : null;
}
