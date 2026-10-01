'use client';

import { useEffect, useState } from 'react';
import JobDetails from '../careers/JobDetails';
import type { Job } from '@/utils/careers';
import EventCard from '../events/EventCard';
import type { Event } from '@/utils/events';

export default function ListingPreviewPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  useEffect(() => {
    const receive = (message: MessageEvent) => {
      if (message.origin !== window.location.origin || message.source !== window.parent) return;
      if (message.data?.type === 'masca-event-preview') setEvent(message.data.event);
      if (message.data?.type === 'masca-career-preview') setJob(message.data.job);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'masca-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  return <main className="container py-12">
    <p className="text-center text-body-sm text-gray-500 mb-6">{job ? 'Public job listing' : 'Public event card'} · Preview only</p>
    <div className="flex justify-center" onClickCapture={e => { if ((e.target as HTMLElement).closest('a, button')) { e.preventDefault(); e.stopPropagation(); } }}>
      {job ? <article className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"><JobDetails job={job} headingId="preview-job-title" /></article> : event ? <EventCard event={event} chapter={{ id: event.organizer?.id || '', name: event.organizer?.id || 'MASCA' }} /> : <p>Open Preview from the CMS editor to see your draft.</p>}
    </div>
  </main>;
}
