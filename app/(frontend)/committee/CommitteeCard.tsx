'use client'

import type { CommitteeMember } from '@/utils/committee'

export default function CommitteeCard({ member, onOpen }: { member: CommitteeMember; onOpen: (member: CommitteeMember) => void }) {
  return <button type="button" className="committee-profile" onClick={() => onOpen(member)} aria-label={`View ${member.name}, ${member.role}`}>
    <span className="committee-portrait"><img src={member.img || '/committee/placeholder.svg'} alt="" loading="lazy" /></span>
    <span className="committee-profile-copy">
      <span className="committee-role">{member.role}</span>
      <span className="committee-name">{member.name}</span>
      <span className="committee-view">View profile <span aria-hidden="true">↗</span></span>
    </span>
  </button>
}
