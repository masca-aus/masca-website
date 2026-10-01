'use client';

import { useEffect, useRef } from 'react';
import { careerToJob } from '@/features/careers/careerModel';
import { melbourneToday } from '@/utils/careers';

export function PublicCareerPreview({ snapshot }: { snapshot: Record<string, unknown> }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Only the public allowlist crosses into the frame. This does not save or publish.
  const job = careerToJob({ ...snapshot, _status: 'published' }, melbourneToday());
  useEffect(() => {
    if (!job) return;
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'masca-career-preview', job }, window.location.origin);
    const ready = (message: MessageEvent) => {
      if (message.origin === window.location.origin && message.source === frame.current?.contentWindow && message.data?.type === 'masca-preview-ready') send();
    };
    window.addEventListener('message', ready);
    send();
    return () => window.removeEventListener('message', ready);
  }, [job]);
  if (!job) return <p>Complete the role title, company and a valid application link or email, and check your dates and URLs to preview this listing.</p>;
  return <iframe ref={frame} className="masca-public-preview-frame" src="/listing-preview" title="Public website careers preview" />;
}
