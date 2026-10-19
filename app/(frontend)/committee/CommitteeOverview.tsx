'use client'

import type { CSSProperties } from 'react'
import type { CommitteeMember } from '@/utils/committee'
import type { getPresentationGroups } from '@/utils/committeePresentation'
import { getCommitteeDisplayName } from '@/utils/committeeIdentity'
import CommitteePortrait from './CommitteePortrait'

type Group = ReturnType<typeof getPresentationGroups>[number]
type Props = { groups: Group[]; onOpen: (member: CommitteeMember) => void; onNavigate: (id: string) => void; onViewAll: () => void; selectedTeam?: string }
const descriptions: Record<string, string> = {
  secretariat: 'Council coordination and administration.',
  treasury: 'Finances, budgets and accountability.',
  'amplifies-media': 'Stories, communications and creative content.',
  'amplifies-digital': 'Digital platforms and online experiences.',
  careers: 'Career opportunities and industry connections.',
  cares: 'Student wellbeing and community support.',
  unites: 'Bringing Malaysian students together.',
}

export default function CommitteeOverview({ groups, onOpen, onNavigate, onViewAll, selectedTeam }: Props) {
  const chairs = groups.find(group => group.id === 'chairs')
  const teams = groups.filter(group => group.id !== 'chairs')
  if (!groups.length) return null
  return <section className="committee-overview" aria-labelledby="committee-overview-heading" id="committee-overview">
    <div className="committee-overview-heading">
      <div><span className="committee-org-eyebrow">The organisation</span><h2 id="committee-overview-heading">Your council, at a glance.</h2></div>
      <p>Start with a team. Get to know the people behind it.</p>
    </div>
    {chairs && <div className="committee-org-leadership" aria-label="Council leadership">
      {chairs.members.map(member => <button key={member.id} className="committee-org-chair" onClick={() => onOpen(member)} aria-label={`View ${member.name}, ${member.role}`}>
        <CommitteePortrait member={member} className="committee-org-avatar" />
        <span><small>{member.role}</small><strong>{getCommitteeDisplayName(member)}</strong></span><span className="committee-org-arrow" aria-hidden="true">↗</span>
      </button>)}
    </div>}
    {!!teams.length && <>
      <div className="committee-org-connector" aria-hidden="true"><span /></div>
      <div className="committee-org-teams" aria-label="Council teams">
        {teams.map(group => <button type="button" className="committee-org-team committee-org-select" key={group.id} style={{ '--team-color': group.color } as CSSProperties} aria-label={`Meet ${group.title}`} aria-pressed={selectedTeam === group.id} aria-controls="committee-details" onClick={() => onNavigate(group.id)}>
          <span className="committee-org-team-title"><span>{group.title}</span><span aria-hidden="true">↗</span></span>
          <span className="committee-org-description">{descriptions[group.id] || 'Meet the people behind this team.'}</span>
          <span className="committee-org-leader-row"><CommitteePortrait member={group.members[0]} className="committee-org-avatar" /><span><span className="committee-org-lead-label">Team lead</span><strong>{getCommitteeDisplayName(group.members[0])}</strong></span></span>
          <span className="committee-org-team-footer"><span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span><span>Meet the team <span aria-hidden="true">→</span></span></span>
        </button>)}
      </div>
    </>}
    <button type="button" className="committee-org-browse" aria-controls="committee-details" onClick={onViewAll}>Browse every member <span aria-hidden="true">↓</span></button>
  </section>
}
