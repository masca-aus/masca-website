'use client'
import { useEffect, useRef, useState } from 'react'

export default function TermPicker({ years, value, onChange }: { years: string[]; value: string; onChange: (year: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    if (!open) return
    options.current[Math.max(0, years.indexOf(value))]?.focus()
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, value, years])
  return <div className="committee-term" ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <span id="committee-term-label">Committee term</span>
    <button ref={trigger} type="button" className="committee-term-trigger" aria-labelledby="committee-term-label committee-term-value" aria-haspopup="listbox" aria-expanded={open} aria-controls="committee-terms" onClick={() => setOpen(!open)} onKeyDown={e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setOpen(true) } }}>
      <span id="committee-term-value">{value}</span><span className="committee-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div id="committee-terms" role="listbox" aria-labelledby="committee-term-label" className="committee-term-options">
      {years.map((year, index) => <button key={year} ref={el => { options.current[index] = el }} role="option" aria-selected={year === value} tabIndex={-1} type="button" onClick={() => { onChange(year); setOpen(false); trigger.current?.focus() }} onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus(); return }
        let next = index
        if (e.key === 'ArrowDown') next = (index + 1) % years.length
        else if (e.key === 'ArrowUp') next = (index - 1 + years.length) % years.length
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = years.length - 1
        else return
        e.preventDefault(); options.current[next]?.focus()
      }}><span><strong>{year}</strong>{index === 0 && <small>Current committee</small>}</span>{year === value && <span aria-hidden="true">✓</span>}</button>)}
    </div>}
  </div>
}
