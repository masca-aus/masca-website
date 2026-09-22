'use client';
import { useDocumentInfo } from '@payloadcms/ui';
import { statusLabels, type CMSStatus } from '@/features/admin/cmsStatus';
export function CMSStatusBadge() {
  const { data, id } = useDocumentInfo();
  const state = data?.cmsStatus as CMSStatus | undefined;
  const status = state?.status ?? (id ? undefined : 'draft');
  return <span className="masca-wizard-badge" data-live={status === 'published'}>{status ? statusLabels[status] : 'Saved'}</span>;
}
