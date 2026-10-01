'use client';

import { useEffect, useRef } from 'react';
import { useEventPoster } from './useEventPoster';
import { eventToPublicCard } from '@/features/events/eventCardModel';
import type { Event } from '@/payload-types';

export function PublicEventPreview({ snapshot }: { snapshot: Record<string, unknown> }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const poster = useEventPoster(4);
  useEffect(() => {
    const start = typeof snapshot.startDate === 'string' && Number.isFinite(Date.parse(snapshot.startDate)) ? snapshot.startDate : null;
    if (!start) return;
    const event = eventToPublicCard({ ...snapshot, id: 0, startDate: start, poster: poster || null } as Event);
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'masca-event-preview', event }, window.location.origin);
    const ready = (message: MessageEvent) => {
      if (message.origin === window.location.origin && message.source === frame.current?.contentWindow && message.data?.type === 'masca-preview-ready') send();
    };
    window.addEventListener('message', ready);
    send();
    return () => window.removeEventListener('message', ready);
  }, [snapshot, poster]);
  if (typeof snapshot.startDate !== 'string' || !Number.isFinite(Date.parse(snapshot.startDate))) return <p>Add a start date to preview the public event card.</p>;
  return <iframe ref={frame} className="masca-public-preview-frame" src="/listing-preview" title="Public website event preview" />;
}
