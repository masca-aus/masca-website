import type { CollectionConfig } from 'payload';
export const CareerLifecycle: CollectionConfig = {
  slug: 'career-lifecycle', admin: { hidden: true, useAsTitle: 'career' }, lockDocuments: false,
  versions: { maxPerDoc: 0 },
  access: { read: ({ req }) => Boolean(req.user), readVersions: ({ req }) => Boolean(req.user), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'career', type: 'relationship', relationTo: 'careers', required: true, unique: true },
    { name: 'status', type: 'text', required: true, validate: (value: unknown) => ['active', 'closed', 'archived'].includes(String(value)) || 'Invalid lifecycle status.' },
    { name: 'closedAt', type: 'date' }, { name: 'archivedAt', type: 'date' },
    { name: 'changedBy', type: 'relationship', relationTo: 'users', required: true },
  ],
};
