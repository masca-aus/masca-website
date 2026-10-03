import type { Field, FieldHook } from 'payload'

export type CommitteePublicationStatus = { status: 'draft' | 'published'; hasChanges: boolean }

/** The live document determines visibility; a newer draft may contain unpublished edits. */
export const committeeStatusField: Field = {
  name: 'committeePublicationStatus',
  label: 'Status',
  type: 'json',
  virtual: true,
  access: { read: ({ req }) => Boolean(req.user) },
  admin: {
    disableBulkEdit: true,
    disableListFilter: true,
    components: {
      Field: false,
      Cell: '/components/admin/CommitteeStatusCell#CommitteeStatusCell',
    },
  },
  hooks: {
    afterRead: [async ({ data, req, context }: Parameters<FieldHook>[0]) => {
      if (!req.user || !data?.id || context.committeeStatusRead) return undefined
      const readContext = { ...context, committeeStatusRead: true }
      const [live, latest] = await Promise.all([
        req.payload.findByID({ collection: 'committee', id: data.id, draft: false, disableErrors: true, select: { _status: true }, depth: 0, req: { ...req, context: readContext }, context: readContext, overrideAccess: false }),
        req.payload.findByID({ collection: 'committee', id: data.id, draft: true, disableErrors: true, select: { _status: true }, depth: 0, req: { ...req, context: readContext }, context: readContext, overrideAccess: false }),
      ])
      if (!live || !latest) return undefined
      const published = live._status === 'published'
      return { status: published ? 'published' : 'draft', hasChanges: published && latest._status === 'draft' } satisfies CommitteePublicationStatus
    }],
  },
}
