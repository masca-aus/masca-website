'use client'

import type { CSSProperties, MouseEvent } from 'react'
import type { CommitteeMember } from '@/utils/committee'
import type { getPresentationGroups } from '@/utils/committeePresentation'
import { getCommitteeDisplayName } from '@/utils/committeeIdentity'
import CommitteePortrait from './CommitteePortrait'

type Group = ReturnType<typeof getPresentationGroups>[number]
type Props = { groups: Group[]; onOpen: (member: CommitteeMember) => void; onNavigate: (id: string) => void }
const descriptions: Record<string, string> = {
  secretariat: 'Council coordination and administration.',
  treasury: 'Finances, budgets and accountability.',
  'amplifies-media': 'Stories, communications and creative content.',
  'amplifies-digital': 'Digital platforms and online experiences.',
  careers: 'Career opportunities and industry connections.',
  cares: 'Student wellbeing and community support.',
  unites: 'Bringing Malaysian students together.',
}

export default function CommitteeOverview({ groups, onOpen, onNavigate }: Props) {
  const chairs = groups.find(group => group.id === 'chairs')
  const teams = groups.filter(group => group.id !== 'chairs')
  if (!groups.length) return null
  const navigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => { event.preventDefault(); onNavigate(id) }
  const leader = (group: Group) => {
    const member = group.members[0]
    return <button className="committee-org-lead" onClick={() => onOpen(member)} aria-label={`View ${member.name}, ${member.role}`}><span className="committee-org-lead-label">Team lead</span><span>{getCommitteeDisplayName(member)} <span aria-hidden="true">↗</span></span></button>
  }
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
        {teams.map(group => <div className="committee-org-team" key={group.id} style={{ '--team-color': group.color } as CSSProperties}>
          <div className="committee-org-desktop">
            <a className="committee-org-team-title" href={`#committee-${group.id}`} aria-label={`Explore ${group.title}`} onClick={event => navigate(event, group.id)}><span>{group.title.replace(' · ', ' / ')}</span><span aria-hidden="true">↗</span></a>
            <p>{descriptions[group.id] || 'Meet the people behind this team.'}</p>
            {leader(group)}
            <span className="committee-org-count">{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
          </div>
          <details className="committee-org-mobile">
            <summary><span><strong>{group.title}</strong><small>{group.members.length} {group.members.length === 1 ? 'member' : 'members'} · {getCommitteeDisplayName(group.members[0])}</small></span><span className="committee-org-expand" aria-hidden="true">+</span></summary>
            <div className="committee-org-mobile-body"><p>{descriptions[group.id] || 'Meet the people behind this team.'}</p>{leader(group)}<a href={`#committee-${group.id}`} onClick={event => navigate(event, group.id)}>Meet the team <span aria-hidden="true">↓</span></a></div>
          </details>
        </div>)}
      </div>
    </>}
    <a className="committee-org-browse" href={`#committee-${groups[0].id}`} onClick={event => navigate(event, groups[0].id)}>Meet the full council <span aria-hidden="true">↓</span></a>
  </section>
}
