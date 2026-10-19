// @vitest-environment jsdom

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CommitteeCard from '@/app/(frontend)/committee/CommitteeCard'
import type { CommitteeMember } from '@/utils/committee'

const member: CommitteeMember = { id: '18', name: 'Syed Ahmad Fahmi Bin Syed Nizam', role: 'National Digital Director', department: 'amplifies', img: 'https://example.org/media/committee-placeholder.png', year: '2026/2027' }
afterEach(cleanup)

describe('committee cards', () => {
  it('shows a concise name without losing the full identity when opening a profile', () => {
    let opened: CommitteeMember | undefined
    render(<CommitteeCard member={member} onOpen={value => { opened = value }} />)
    expect(screen.getByText('Syed Fahmi')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `View ${member.name}, ${member.role}` }))
    expect(opened).toBe(member)
  })
  it('replaces shared uploaded placeholders with initials, including signed query strings', () => {
    const { container } = render(<CommitteeCard member={{ ...member, img: `${member.img}?v=2` }} onOpen={() => {}} />)
    expect(screen.getByText('SF')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })
  it('keeps unrecognised names intact and replaces broken real photos with initials', () => {
    const { container } = render(<CommitteeCard member={{ ...member, name: 'Aisha Nur Rahman', img: '/real-photo.jpg' }} onOpen={() => {}} />)
    expect(screen.getByText('Aisha Nur Rahman')).toBeTruthy()
    fireEvent.error(container.querySelector('img')!)
    expect(screen.getByText('AR')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })
})
