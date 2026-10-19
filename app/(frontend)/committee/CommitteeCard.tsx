'use client'

import type { CommitteeMember } from '@/utils/committee'
import { getCommitteeDisplayName } from '@/utils/committeeIdentity'
import CommitteePortrait from './CommitteePortrait'

export default function CommitteeCard({ member, onOpen }: { member: CommitteeMember; onOpen: (member: CommitteeMember) => void }) {
  return <button type="button" className="committee-profile" onClick={() => onOpen(member)} aria-label={`View ${member.name}, ${member.role}`}>
    <CommitteePortrait member={member} className="committee-portrait" />
    <span className="committee-profile-copy">
      <span className="committee-name">{getCommitteeDisplayName(member)}</span>
      <span className="committee-role">{member.role}</span>
      <span className="committee-view">View profile <span aria-hidden="true">↗</span></span>
    </span>
  </button>
}
