import { ValidationError, type CollectionBeforeChangeHook, type PayloadHandler } from 'payload';
import { validateEventStep } from './eventEditor.ts';

/** Validate inside the write, against Payload's latest draft rather than list data. */
export const validateQuickPublish: CollectionBeforeChangeHook = ({ data, originalDoc, context, req }) => {
  if (context.eventQuickPublish) {
    const errors = validateEventStep({ ...originalDoc, ...data }, 4);
    if (Object.keys(errors).length) {
      throw new ValidationError({ collection: 'events', req, errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
    }
  }
  return data;
};

export const eventQuickAction: PayloadHandler = async req => {
  if (!req.user) return Response.json({ message: 'Sign in to change event status.' }, { status: 401 });
  const id = req.routeParams?.id;
  if (typeof id !== 'string' && typeof id !== 'number') return Response.json({ message: 'Event not found.' }, { status: 400 });
  let body;
  try { body = await req.json?.(); } catch { /* handled as an invalid request below */ }
  const { field, value } = body ?? {};
  const review = field === 'reviewStatus' && ['pending', 'approved', 'rejected'].includes(value);
  const publication = field === '_status' && ['draft', 'published'].includes(value);
  if (!review && !publication) return Response.json({ message: 'Choose a valid event status.' }, { status: 400 });
  const publish = publication && value === 'published';
  const draft = review && value === 'approved';
  const unpublish = !publish && !draft;
  // The existing cache hook distinguishes draft-only writes from live changes.
  req.query = { ...req.query, draft: draft ? 'true' : 'false', unpublishAllLocales: unpublish ? 'true' : 'false' };
  const doc = await req.payload.update({
    collection: 'events', id, req, overrideAccess: false, overrideLock: false, depth: 0,
    draft, unpublishAllLocales: unpublish,
    context: { eventQuickPublish: publish },
    data: {
      _status: publish ? 'published' : 'draft',
      ...(review || publish ? { reviewStatus: publish ? 'approved' : value, reviewedAt: new Date().toISOString() } : {}),
    },
  });
  return Response.json({ doc: { id: doc.id, reviewStatus: doc.reviewStatus, _status: doc._status } });
};
