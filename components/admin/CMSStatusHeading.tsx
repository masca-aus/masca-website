'use client';
import { SortColumn } from '@payloadcms/ui';

/** Native sort controls for our calculated status column. */
export function CMSStatusHeading() {
  return <SortColumn Label={undefined} name="cmsStatus" label="Status" />;
}
