'use client';

import { useEffect, useState } from 'react';
import EventCard from '../events/EventCard';
import type { Event } from '@/utils/events';

export default function ListingPreviewPage() {
  const [event, setEvent] = useState<Event | null>(null);
  useEffect(() => {
    const receive = (message: MessageEvent) => {
      if (message.origin !== window.location.origin || message.source !== window.parent || message.data?.type !== 'masca-event-preview') return;
      setEvent(message.data.event);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'masca-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  return <main className="container py-12">
    <p className="text-center text-body-sm text-gray-500 mb-6">Public event card · Preview only</p>
    <div className="flex justify-center" onClickCapture={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}>
      {event ? <EventCard event={event} chapter={{ id: event.organizer?.id || '', name: event.organizer?.id || 'MASCA' }} /> : <p>Open Preview from the Events editor to see your draft.</p>}
    </div>
  </main>;
}
