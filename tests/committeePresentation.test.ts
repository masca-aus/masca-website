import { describe, expect, it } from 'vitest'
import { getPresentationGroups, getReadingSection } from '@/utils/committeePresentation'
import type { CommitteeMember } from '@/utils/committee'
const member = (id: string, role: string): CommitteeMember => ({ id, role, name: id, year: '2026/2027', department: 'amplifies', img: '' })
describe('committee presentation', () => {
  it('splits Media and Digital without losing unmatched roles or changing member order', () => {
    const groups = getPresentationGroups([member('1', 'National Digital Director'), member('2', 'Media Executive'), member('3', 'Communications Officer'), member('4', 'Digital Executive')])
    expect(groups.map(g => [g.id, g.members.map(m => m.id)])).toEqual([['amplifies-media', ['2']], ['amplifies-digital', ['1','4']], ['amplifies', ['3']]])
  })
  it('highlights Cares when it occupies the reading area even before its heading crosses 150px', () => {
    expect(getReadingSection([{ top: -700, bottom: 170 }, { top: 170, bottom: 950 }, { top: 950, bottom: 1600 }], 1000)).toBe(1)
  })
  it('keeps a long section active while reading its middle', () => {
    expect(getReadingSection([{ top: -1100, bottom: 600 }, { top: 600, bottom: 1400 }], 800)).toBe(0)
  })
})
