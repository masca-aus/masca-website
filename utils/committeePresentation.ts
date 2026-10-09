import type { CommitteeMember } from './committee'
import { getCommitteeGroups } from './committeeGroups'

const accents: Record<string, string> = { blue: '#010066', slate: '#477080', sky: '#1683c4', green: '#388c55', yellow: '#b38f00', orange: '#d66b35', red: '#cc0001', gray: '#4a4a4a' }
export function getPresentationGroups(members: CommitteeMember[]) {
  return getCommitteeGroups(members).flatMap(group => {
    const base = { ...group, color: accents[group.accent] || accents.blue }
    if (group.department !== 'amplifies') return [{ ...base, id: group.department, title: group.department === 'unassigned' ? 'Committee' : group.label }]
    const media = group.members.filter(m => /\bmedia\b/i.test(m.role))
    const digital = group.members.filter(m => !/\bmedia\b/i.test(m.role) && /\bdigital\b/i.test(m.role))
    const other = group.members.filter(m => !/\b(media|digital)\b/i.test(m.role))
    return [
      { ...base, id: 'amplifies-media', title: 'Amplifies · Media', members: media },
      { ...base, id: 'amplifies-digital', title: 'Amplifies · Digital', members: digital },
      { ...base, id: 'amplifies', title: 'Amplifies', members: other },
    ].filter(g => g.members.length)
  })
}

export function getReadingSection(sections: { top: number; bottom: number }[], height: number) {
  let best = 0
  let largest = -1
  sections.forEach((section, index) => {
    const overlap = Math.max(0, Math.min(section.bottom, height * .8) - Math.max(section.top, Math.min(110, height * .15)))
    if (overlap > largest) { best = index; largest = overlap }
  })
  return best
}
