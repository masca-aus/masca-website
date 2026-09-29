import { describe, expect, it } from 'vitest'
import { executeCareerImport, planCareerImport, validImportApplyLink, type CareerImportData } from '../features/careers/importCareers'
import { parseSheet } from '../utils/careers'
const source = { sheetId: 'test-sheet-id', gid: '123' }
const today = '2026-09-17'
const header = 'Published,Title,Company,Apply link,ID,Notes (internal),Closes,Added,Type,Study level'

describe('careers CSV import', () => {
  it('reserves exact current public IDs before unpublished rows and duplicate suffixes', () => {
    const csv = [header,
      'FALSE,Role,Acme,https://example.com,,,,,,',
      'TRUE,Role,Acme,https://example.com,,,,,,',
      'TRUE,Role,Acme,https://example.com,,,,,,',
      'TRUE,Expired,Acme,https://example.com,expired,,2020-01-01,,,',
    ].join('\n')
    const plan = planCareerImport(csv, source, today)
    for (const job of parseSheet(csv, today).jobs) expect(plan.rows.find(row => row.row === job.row)?.data.slug).toBe(job.id)
    expect(plan.rows[0].data.slug).toBe('acme-role-3')
    expect(new Set(plan.rows.map(row => row.data.slug)).size).toBe(4)
    expect(plan.rows[3].data.closes).toBe('2020-01-01')
  })
  it('keeps incomplete, unpublished and notes-only rows as drafts, but drops checkbox padding', () => {
    const csv = [header,
      'FALSE,Role,Acme,https://example.com,,secret committee note,,,,',
      'TRUE,,Acme,https://example.com,,,,,,',
      'FALSE,,,,,"private\nmultiline note",,,,',
      'FALSE,,,,,,,,,',
    ].join('\n')
    const plan = planCareerImport(csv, source, today)
    expect(plan.summary).toMatchObject({ total: 3, drafts: 3, published: 0 })
    expect(plan.rows[2].data.internalNotes).toBe('private\nmultiline note')
    expect(plan.rows[0].data.internalNotes).toBe('secret committee note')
    expect(plan.rows[1].data.title).toBe('')
    expect(plan.rows[2].data.sourceKey).toBe('test-sheet-id/123/4')
  })
  it('uses established vocabulary and date normalization', () => {
    const plan = planCareerImport([header, 'TRUE,Role,Acme,jobs@example.com,,,30/09/2026,01/09/2026,Graduate program,Final year'].join('\n'), source, today)
    expect(plan.rows[0].data).toMatchObject({ applyUrl: 'mailto:jobs@example.com', closes: '2026-09-30', added: '2026-09-01', type: 'graduate', studyLevels: ['final'], _status: 'published' })
  })
  it.each(['Apply here', 'example.com', 'javascript:alert(1)', 'https://', 'https://example.com/a b', 'http://localhost'])('does not publish an invalid application link: %s', link => {
    expect(validImportApplyLink(link)).toBeUndefined()
    const plan = planCareerImport([header, `TRUE,Role,Acme,${link},,,,,,`].join('\n'), source, today)
    expect(plan.rows[0].data._status).toBe('draft')
    expect(plan.rows[0].warnings.length).toBeGreaterThan(0)
  })
  it.each(['All Year Round', 'No close'])('imports %s as a rolling closing date', closes => {
    const csv = `Published,Title,Company,Apply link,Closes\nTRUE,Role,Acme,https://example.com,${closes}`
    const plan = planCareerImport(csv, source, today)
    expect(plan.rows[0].data.closes).toBeUndefined()
    expect(plan.rows[0].data._status).toBe('published')
  })
  it('retains long source title and company in drafts without truncating', () => {
    const title = 'A'.repeat(121)
    const company = 'B'.repeat(81)
    const plan = planCareerImport(`Published,Title,Company,Apply link\nTRUE,${title},${company},https://example.com`, source, today)
    expect(plan.rows[0].data).toMatchObject({ title, company, _status: 'draft' })
  })
  it.each(['closes', 'added'])('preserves invalid %s dates for correction and keeps the row draft', field => {
    const csv = `Published,Title,Company,Apply link,${field}\nTRUE,Role,Acme,https://example.com,31/02/2026`
    const plan = planCareerImport(csv, source, today)
    expect(plan.rows[0].data).toMatchObject({ [field]: '31/02/2026', _status: 'draft' })
    expect(plan.rows[0].warnings.length).toBeGreaterThan(0)
  })
  it('retains populated unrecognized columns as reviewable draft rows', () => {
    const plan = planCareerImport('Title,Company,Apply link,Custom field\n,,,keep this row', source, today)
    expect(plan.rows).toHaveLength(1)
    expect(plan.rows[0].data._status).toBe('draft')
  })
  it('imports sheets without a Published column using the established default', () => {
    const plan = planCareerImport('Title,Company,Apply link\nRole,Acme,https://example.com', source, today)
    expect(plan.rows[0].data._status).toBe('published')
  })
  it('is read-only by default and skips imported records without overwriting edits', async () => {
    const plan = planCareerImport([header, 'TRUE,Role,Acme,https://example.com,,,,,,'].join('\n'), source, today)
    const stored = new Map<string, CareerImportData>()
    const store = { findBySourceKey: async (key: string) => stored.has(key), create: async (data: CareerImportData) => { stored.set(data.sourceKey, { ...data }) } }
    expect(await executeCareerImport(plan, store)).toEqual({ created: 0, skipped: 0, pending: 1 })
    expect(stored.size).toBe(0)
    expect(await executeCareerImport(plan, store, true)).toEqual({ created: 1, skipped: 0, pending: 0 })
    stored.get(plan.rows[0].data.sourceKey)!.title = 'Edited by an officer'
    expect(await executeCareerImport(plan, store, true)).toEqual({ created: 0, skipped: 1, pending: 0 })
    expect(stored.get(plan.rows[0].data.sourceKey)?.title).toBe('Edited by an officer')
  })
})
