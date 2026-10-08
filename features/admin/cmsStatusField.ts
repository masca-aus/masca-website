import { transactionRead } from './transactionRead.ts';
import type { Field, FieldHook } from 'payload';
import { deriveCMSStatus, type CMSCollection } from './cmsStatus.ts';

export function cmsStatusField(collection: CMSCollection): Field {
  return {
    name: 'cmsStatus', label: 'Status', type: 'json', virtual: true,
    access: { read: ({ req }) => Boolean(req.user) },
    admin: { disableBulkEdit: true, disableListFilter: true, components: { Label: "/components/admin/CMSStatusHeading#CMSStatusHeading", Field: false, Cell: `/components/admin/CMSStatusCell#${collection === 'events' ? 'Event' : 'Career'}CMSStatusCell` } },
    hooks: { afterRead: [async ({ data, req, context }: Parameters<FieldHook>[0]) => {
      if (!req.user || !data?.id || context.cmsStatusRead) return undefined;
      const readContext = { ...context, cmsStatusRead: true };
      // These reads share req.transactionID during saves, so they must not
      // overlap on the same Postgres client. Preserve req to read uncommitted data.
      const live = await transactionRead(req, () => req.payload.findByID({ collection, id: data.id, draft: false, disableErrors: true, select: collection === 'events' ? { _status: true, reviewStatus: true } : { _status: true, closes: true, added: true }, depth: 0, req: { ...req, context: readContext }, context: readContext, overrideAccess: false }));
      const latest = await transactionRead(req, () => req.payload.findByID({ collection, id: data.id, draft: true, disableErrors: true, select: { _status: true, closes: true, added: true, submittedForReview: true, needsChanges: true }, depth: 0, req: { ...req, context: readContext }, context: readContext, overrideAccess: false }));
      const stages = await transactionRead(req, async () => collection === 'events'
          ? req.payload.find({ collection: 'event-lifecycle', where: { event: { equals: data.id } }, limit: 1, depth: 0, req, overrideAccess: true })
          : req.payload.find({ collection: 'career-lifecycle', where: { career: { equals: data.id } }, limit: 1, depth: 0, req, overrideAccess: true }));
      // Delete responses also run afterRead, after the record and its versions are gone.
      if (!live || !latest) return undefined;
      return deriveCMSStatus(collection, latest, live, stages.docs[0]?.status ?? 'active');
    }] },
  };
}
