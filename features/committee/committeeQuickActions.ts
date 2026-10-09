import type { PayloadHandler } from 'payload'

export const committeeQuickAction: PayloadHandler = async req => {
  if (!req.user) return Response.json({ message: 'Sign in to change committee status.' }, { status: 401 })
  const id = req.routeParams?.id
  if (typeof id !== 'string' && typeof id !== 'number') return Response.json({ message: 'Committee member not found.' }, { status: 400 })

  let body
  try { body = await req.json?.() } catch { /* handled as an invalid request below */ }
  const { field, value } = body ?? {}
  if (field !== '_status' || !['draft', 'published'].includes(value)) {
    return Response.json({ message: 'Choose a valid committee status.' }, { status: 400 })
  }

  const unpublish = value === 'draft'
  req.query = { ...req.query, draft: 'false', unpublishAllLocales: unpublish ? 'true' : 'false' }
  const doc = await req.payload.update({
    collection: 'committee', id, req, overrideAccess: false, overrideLock: false, depth: 0,
    draft: false, unpublishAllLocales: unpublish, data: { _status: value },
  })
  return Response.json({ doc: { id: doc.id, _status: doc._status } })
}
