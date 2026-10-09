'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { CommitteeMember } from '@/utils/committee'
import { getPresentationGroups, getReadingSection } from '@/utils/committeePresentation'
import CommitteeCard from './CommitteeCard'
import MemberModal from './MemberModal'
import TermPicker from './TermPicker'
import './committee.css'

export default function CommitteeSection({ members, years }: { members: CommitteeMember[]; years: string[] }) {
  const [year, setYear] = useState(years[0] || '')
  const currentYear = years.includes(year) ? year : years[0] || ''
  const [selected, setSelected] = useState<CommitteeMember | null>(null)
  const groups = useMemo(() => getPresentationGroups(members.filter(m => m.year === currentYear)), [members, currentYear])
  const directory = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLElement>(null)
  const [active, setActive] = useState('')
  const [railVisible, setRailVisible] = useState(false)
  const [inDirectory, setInDirectory] = useState(false)
  useEffect(() => {
    const root = directory.current
    if (!root) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((entry, i) => {
        observer.unobserve(entry.target)
        if (!media.matches && entry.target.animate) {
          const animation = entry.target.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: Math.min(i, 3) * 65, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
        }
      })
    }, { threshold: .08 })
    root.querySelectorAll('.committee-profile').forEach(el => observer.observe(el))
    const stop = () => { if (media.matches) animations.forEach(a => a.finish()) }
    media.addEventListener('change', stop)
    return () => { observer.disconnect(); media.removeEventListener('change', stop); animations.forEach(a => a.cancel()) }
  }, [groups])
  useEffect(() => {
    const root = directory.current
    if (!root) return
    let awake = false, near = false, frame = 0, disposed = false
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      frame = 0
      if (disposed) return
      const bounds = root.getBoundingClientRect()
      const inside = bounds.top < innerHeight * .65 && bounds.bottom > 110
      const focused = !!rail.current?.contains(document.activeElement)
      setInDirectory(inside)
      setRailVisible(inside && (awake || near || focused))
      const sections = groups.map(g => document.getElementById(`committee-${g.id}`)!.getBoundingClientRect())
      if (sections.length) setActive(inside ? groups[getReadingSection(sections, innerHeight)].id : '')
    }
    const wake = () => { awake = true; clearTimeout(timer); timer = setTimeout(() => { awake = false; update() }, 1400) }
    const scroll = () => { wake(); if (!frame) frame = requestAnimationFrame(update) }
    const pointer = (e: PointerEvent) => { const next = e.clientX < 230; if (next !== near) { near = next; wake(); update() } }
    const focus = () => { wake(); if (!frame) frame = requestAnimationFrame(update) }
    const resize = new ResizeObserver(update)
    resize.observe(root)
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('pointermove', pointer, { passive: true })
    window.addEventListener('resize', update)
    window.addEventListener('scrollend', update)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', focus)
    void document.fonts?.ready.then(update)
    wake(); update()
    return () => { disposed = true; clearTimeout(timer); cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('scroll', scroll); window.removeEventListener('pointermove', pointer); window.removeEventListener('resize', update); window.removeEventListener('scrollend', update); document.removeEventListener('focusin', focus); document.removeEventListener('focusout', focus) }
  }, [groups])
  const navigate = (id: string) => {
    const el = document.getElementById(`committee-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#committee-${id}`)
  }
  return <section className="committee-directory">
    <div className="committee-content">
      <TermPicker years={years} value={currentYear} onChange={next => { setYear(next); setSelected(null) }} />
      <nav className="committee-jump" aria-label="Committee teams">{groups.map(g => <a key={g.id} href={`#committee-${g.id}`} aria-current={active === g.id ? 'location' : undefined} onClick={e => { e.preventDefault(); navigate(g.id) }}>{g.title}</a>)}</nav>
      <div ref={directory}>
        {groups.map(g => <section className="committee-team-section" id={`committee-${g.id}`} key={g.id} aria-labelledby={`committee-heading-${g.id}`} style={{ '--team-color': g.color } as CSSProperties}>
          <div className="committee-team-heading"><span aria-hidden="true" /><h2 id={`committee-heading-${g.id}`}>{g.title}</h2><i aria-hidden="true" /></div>
          <div className="committee-member-grid">{g.members.map(member => <CommitteeCard key={member.id} member={member} onOpen={setSelected} />)}</div>
        </section>)}
        {!groups.length && <p>No published profiles for this term yet.</p>}
      </div>
    </div>
    <nav ref={rail} className={`committee-rail${railVisible ? ' is-visible' : ''}`} aria-label="Jump to committee team" inert={!inDirectory} aria-hidden={!inDirectory}>
      {groups.map(g => <a key={g.id} href={`#committee-${g.id}`} aria-label={g.title} aria-current={active === g.id ? 'location' : undefined} style={{ '--team-color': g.color } as CSSProperties} onClick={e => { e.preventDefault(); navigate(g.id) }}><span className="committee-tick" aria-hidden="true" /><span className="committee-rail-label" aria-hidden="true">{g.title}</span></a>)}
    </nav>
    {selected && <MemberModal member={selected} onClose={() => setSelected(null)} />}
  </section>
}
