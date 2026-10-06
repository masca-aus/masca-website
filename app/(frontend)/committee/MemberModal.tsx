'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CommitteeMember } from '@/utils/committee'
import { COMMITTEE_DEPARTMENTS } from '@/utils/committeeDepartments'

export default function MemberModal({ member, onClose }: { member: CommitteeMember; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const closing = useRef(false)
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    const animation = !matchMedia('(prefers-reduced-motion: reduce)').matches && dialog.animate?.([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' })
    return () => {
      if (animation) animation.cancel()
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [])
  async function close() {
    if (closing.current) return
    closing.current = true
    try {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && ref.current?.animate) {
        await ref.current.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 160 }).finished
      }
    } catch { /* Unmount or motion preference changes can cancel the animation. */ }
    onClose()
  }
  const department = COMMITTEE_DEPARTMENTS.find(g => g.value === member.department)?.label
  const group = member.department === 'amplifies' ? (/\bmedia\b/i.test(member.role) ? ' · Media' : /\bdigital\b/i.test(member.role) ? ' · Digital' : '') : ''
  // Only expose valid HTTPS links, including when reading older CMS records.
  let linkedin: string | undefined
  try { const url = new URL(member.linkedin_url || ''); if (url.protocol === 'https:' && /(^|\.)linkedin\.com$/i.test(url.hostname)) linkedin = url.href } catch { /* Missing profile. */ }
  return createPortal(<dialog ref={ref} className="committee-dialog" aria-labelledby="committee-profile-name" onCancel={e => { e.preventDefault(); void close() }} onClick={e => {
    if (e.target !== e.currentTarget) return
    const box = e.currentTarget.getBoundingClientRect()
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) void close()
  }}>
    <div className="committee-dialog-header"><span>Meet your committee</span><button type="button" autoFocus onClick={() => void close()} aria-label="Close profile">Close ×</button></div>
    <div className="committee-dialog-body">
      <div className="committee-dialog-photo"><img src={member.img || '/casts/committee-placeholder.svg'} alt={member.name} /></div>
      <div className="committee-person">
        <h2 id="committee-profile-name">{member.name}</h2>
        {(member.university || member.course) && <p className="committee-university">{member.university}{member.university && member.course && <br />}{member.course && <span>{member.course}</span>}</p>}
        {linkedin && <a className="committee-linkedin" href={linkedin} target="_blank" rel="noopener noreferrer"><b aria-hidden="true">in</b> Connect on LinkedIn <span aria-hidden="true">↗</span></a>}
        <p className="committee-position">{member.role}</p>
        {department && <span className="committee-badge">{department}{group}</span>}
        {member.bio && <p className="committee-bio">{member.bio}</p>}
      </div>
    </div>
  </dialog>, document.body)
}
