import type { CollectionConfig } from 'payload';

/** A CMS-only directory. Events retain their existing organiser text when a name changes. */
export const Organisations: CollectionConfig = {
  slug: 'organisations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'abbreviation', 'state', 'university', 'listed'],
    description: 'Malaysian student organisations. Source listings are a starting point, not confirmation of current activity. Check and update names before use.',
    hideAPIURL: true,
    components: {
      beforeList: ['/components/admin/DocumentBackLink#CollectionBackLink'],
      edit: { beforeDocumentControls: ['/components/admin/DocumentBackLink#DocumentBackLink'] },
    },
  },
  lockDocuments: false,
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'abbreviation', type: 'text' },
    { name: 'university', type: 'text' },
    { name: 'state', type: 'text', admin: { description: 'State or territory abbreviation, or National.' } },
    { name: 'aliases', type: 'textarea', admin: { description: 'Other names or abbreviations that should match a search.' } },
    { name: 'listed', type: 'checkbox', defaultValue: true, admin: { description: 'Show in event organisation search. Turn off outdated entries.' } },
    { name: 'sourceURL', label: 'Source link', type: 'text' },
    { name: 'sourceCheckedAt', type: 'date' },
    { name: 'verificationNotes', type: 'textarea' },
    { name: 'directoryKey', type: 'text', unique: true, admin: { hidden: true } },
  ],
};
