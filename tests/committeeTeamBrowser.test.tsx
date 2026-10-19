// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CommitteeSection from '@/app/(frontend)/committee/CommitteeSection'
import type { CommitteeMember } from '@/utils/committee'

const members: CommitteeMember[] = [
  { id: '3', name: 'Muhammad Shafi Ilham Bin Kamaruddin', role: 'National Chairperson', department: 'chairs', year: '2026/2027', img: '' },
  { id: '18', name: 'Syed Ahmad Fahmi Bin Syed Nizam', role: 'National Digital Director', department: 'amplifies', year: '2026/2027', img: '/syed.jpg' },
  { id: '19', name: 'Jin Hong Pang', role: 'Deputy National Digital Director', department: 'amplifies', year: '2026/2027', img: '' },
]
beforeEach(() => {
  history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value() {} })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('shows one team, switches via the chart, and restores all members on request', () => {
  render(<CommitteeSection members={members} years={['2026/2027']} overview />)
  const details = screen.getByRole('region', { name: 'Team members' })
  expect(within(details).getByRole('heading', { name: 'Chairs' })).toBeTruthy()
  expect(within(details).queryByRole('heading', { name: 'Amplifies · Digital' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Meet Amplifies · Digital' }))
  expect(within(details).getByRole('heading', { name: 'Amplifies · Digital' })).toBeTruthy()
  expect(within(details).queryByRole('heading', { name: 'Chairs' })).toBeNull()
  expect(within(details).getAllByRole('button', { name: /^View / })).toHaveLength(2)
  expect(document.activeElement).toBe(within(details).getByRole('heading', { name: 'Amplifies · Digital' }))
  fireEvent.click(screen.getByRole('button', { name: 'View all members' }))
  expect(within(details).getAllByRole('button', { name: /^View / })).toHaveLength(3)
})
it('opens a linked team directly rather than leaving its target hidden', () => {
  history.replaceState(null, '', '/#committee-amplifies-digital')
  render(<CommitteeSection members={members} years={['2026/2027']} overview />)
  const details = screen.getByRole('region', { name: 'Team members' })
  expect(within(details).getByRole('heading', { name: 'Amplifies · Digital' })).toBeTruthy()
  expect(within(details).queryByRole('heading', { name: 'Chairs' })).toBeNull()
})
