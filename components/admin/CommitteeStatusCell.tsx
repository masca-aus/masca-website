'use client'

import { useState, useTransition } from 'react'
import { useAuth, useConfig } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { mayManage, type ApprovedAccount, type OwnershipScope } from '@/features/access/workspacePolicy'
import type { CommitteePublicationStatus } from '@/features/committee/committeeStatusField'
import { EventActionMenu } from './EventActionMenu'
import './eventStatusCell.css'

type Props = { cellData?: CommitteePublicationStatus; rowData?: { id?: number | string; name?: string; owningScope?: OwnershipScope } }

export function CommitteeStatusCell({ cellData, rowData }: Props) {
  const { config } = useConfig()
  const { user } = useAuth()
  const account = user as unknown as ApprovedAccount | undefined
  const editable = !account?.role || mayManage(account, 'committee', rowData?.owningScope as OwnershipScope)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [refreshing, startTransition] = useTransition()
  const [error, setError] = useState('')
  if (!cellData) return <span>—</span>

  const id = rowData?.id
  const status = cellData.status
  const options = status === 'draft'
    ? [{ value: 'published', label: 'Publish' }]
    : [
        ...(cellData.hasChanges ? [{ value: 'published', label: 'Publish changes' }] : []),
        { value: 'draft', label: 'Move to draft' },
      ]
  if (!editable) return <span className="masca-wizard-badge" title="Read only">{status === 'published' ? 'Published' : 'Draft'}</span>

  async function change(value: string) {
    if (busy || refreshing || id == null) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/committee/${encodeURIComponent(String(id))}/quick-status`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: '_status', value }),
      })
      const result = await response.json()
      if (!response.ok) {
        const details = result.errors?.[0]?.data?.errors
        throw new Error(details?.map((item: { message: string }) => item.message).join(' ') || result.message || result.errors?.[0]?.message || 'Status could not be saved. Try again.')
      }
      startTransition(() => router.refresh())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status could not be saved. Try again.')
    } finally { setBusy(false) }
  }

  return <div className="masca-status-action" onClick={event => event.stopPropagation()}>
    <EventActionMenu label={`Status for ${rowData?.name || `member ${id}`}`} text={status === 'published' ? 'Published' : 'Draft'} tone={status}
      options={options} disabled={busy || refreshing || id == null} busy={busy || refreshing} onChoose={value => void change(value)} />
    {cellData.hasChanges && <small className="masca-status-action__feedback">Unpublished changes</small>}
    {(busy || refreshing) && <small className="masca-status-action__announcement" role="status">Saving…</small>}
    {error && <div className="masca-status-action__error" role="alert">{error} <a href={`${config.routes.admin}/collections/committee/${id}`}>Edit member</a></div>}
  </div>
}
