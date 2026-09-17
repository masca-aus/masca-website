import type { CollectionConfig } from 'payload';
export const EventLifecycle: CollectionConfig = {
  slug: 'event-lifecycle',
  admin: { hidden: true, useAsTitle: 'event' },
  lockDocuments: false,
  versions: { maxPerDoc: 0 },
  access: { read: ({ req }) => Boolean(req.user), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, unique: true },
    { name: 'status', type: 'text', required: true, validate: (value: unknown) => ['active', 'completed', 'archived'].includes(String(value)) || 'Invalid lifecycle status.' },
    { name: 'completedAt', type: 'date' },
    { name: 'archivedAt', type: 'date' },
    { name: 'changedBy', type: 'relationship', relationTo: 'users', required: true },
  ],
};
