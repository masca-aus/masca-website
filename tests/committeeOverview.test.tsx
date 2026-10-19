// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import CommitteeOverview from '@/app/(frontend)/committee/CommitteeOverview'
import { getPresentationGroups } from '@/utils/committeePresentation'
import type { CommitteeMember } from '@/utils/committee'

const members: CommitteeMember[] = [
  { id: '3', name: 'Muhammad Shafi Ilham Bin Kamaruddin', role: 'National Chairperson', department: 'chairs', year: '2026/2027', img: '' },
  { id: '18', name: 'Syed Ahmad Fahmi Bin Syed Nizam', role: 'National Digital Director', department: 'amplifies', year: '2026/2027', img: '' },
  { id: '19', name: 'Jin Hong Pang', role: 'Deputy National Digital Director', department: 'amplifies', year: '2026/2027', img: '' },
]
afterEach(cleanup)
it('opens the original full profile from leadership and links a team to its matching details', () => {
  let opened: CommitteeMember | undefined
  let destination: string | undefined
  render(<CommitteeOverview groups={getPresentationGroups(members)} onOpen={member => { opened = member }} onNavigate={id => { destination = id }} />)
  fireEvent.click(screen.getByRole('button', { name: 'View Muhammad Shafi Ilham Bin Kamaruddin, National Chairperson' }))
  expect(opened?.id).toBe('3')
  const team = screen.getByRole('link', { name: 'Explore Amplifies · Digital' })
  expect(team.getAttribute('href')).toBe('#committee-amplifies-digital')
  fireEvent.click(team)
  expect(destination).toBe('amplifies-digital')
})
it('provides one compact team summary rather than listing every executive in the chart', () => {
  render(<CommitteeOverview groups={getPresentationGroups(members)} onOpen={() => {}} onNavigate={() => {}} />)
  expect(screen.getAllByText('2 members').length).toBeGreaterThan(0)
  expect(screen.queryByText('Jin Hong Pang')).toBeNull()
  expect(screen.queryByRole('link', { name: 'Explore Treasury' })).toBeNull()
})
