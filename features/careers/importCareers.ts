import {
  MAX_TITLE_LENGTH, MAX_COMPANY_LENGTH, cleanCell, deriveJobId, isTruthyCell, looksLikeHeaderRow, mapHeaders,
  parseSheet, parseSheetDate, rowToRecord, sanitiseApplyLink, slugify, squash, toJob,
  type Job, type SheetRow,
} from '../../utils/careers.ts'
import { careerPublicationErrors, validCareerURL } from './careerModel.ts'
import { parseCsv } from '../../utils/csv.ts'
import type { SheetConfig } from '../../utils/careersSource.ts'

export type CareerImportData = {
  title: string; company: string; type: Job['type']; industry?: string
  companyWebsite?: string; logoUrl?: string; country?: string; state?: string; city?: string
  workMode?: Job['workMode']; international: Job['international']; studyLevels: Job['studyLevels']
  eligibility?: string; applyUrl: string; closes?: string; added?: string; pay?: string
  description?: string; tags: string; featured: boolean; slug: string; internalNotes: string
  sourceKey: string; _status: 'draft' | 'published'
}
export type CareerImportRow = { row: number; data: CareerImportData; warnings: string[] }
export type CareerImportPlan = { rows: CareerImportRow[]; summary: { total: number; published: number; drafts: number; warnings: number } }

/** Stricter than the legacy reader: linked words and bare domains require editor review. */
export function validImportApplyLink(raw: string | undefined): string | undefined {
  const value = cleanCell(raw)
  if (!validCareerURL(value, true)) return undefined
  if (/^(?:mailto:)?[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return sanitiseApplyLink(value)?.href
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return undefined
  try {
    const url = new URL(value)
    return url.hostname && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

/** Pure preview. Active public IDs are reserved before allocating IDs to hidden rows. */
export function planCareerImport(csv: string, source: Pick<SheetConfig, 'sheetId' | 'gid'>, today: string): CareerImportPlan {
  const board = parseSheet(csv, today) // Reuse header/size validation and exact legacy ID allocation.
  const publicByRow = new Map(board.jobs.map(job => [job.row, job]))
  const used = new Set(board.jobs.map(job => job.id))
  if (used.size !== board.jobs.length) throw new Error('Existing public IDs collide; resolve explicit IDs in the source before importing.')
  const cells = parseCsv(csv)
  const header = cells.slice(0, 5).findIndex(looksLikeHeaderRow)
  const fields = mapHeaders(cells[header])
  const hasPublished = fields.includes('published')
  const notesIndex = cells[header].findIndex(value => ['notes', 'notesinternal', 'internalnotes'].includes(squash(value)))
  const rows: CareerImportRow[] = []
  cells.slice(header + 1).forEach((values, index) => {
    const row = header + index + 2
    // Keep notes-only and unknown-column-only rows; ignore checkbox template padding.
    const meaningful = values.some((value, column) => cleanCell(value) &&
      (!['published', 'featured'].includes(fields[column] ?? '') || isTruthyCell(value)))
    if (!meaningful) return
    const record = rowToRecord(fields, values)
    const warnings: string[] = []
    const warn = (message: string) => warnings.push(`Row ${row}: ${message}`)
    const applyUrl = validImportApplyLink(record.apply)
    // Let the established normalizer handle vocabulary, clipping, and lists even for drafts/expired rows.
    const surrogate: SheetRow = { ...record, title: record.title || 'Untitled', company: record.company || 'Unknown', apply: applyUrl || 'https://example.invalid', closes: '', added: '' }
    const normalized = toJob(surrogate, { today, rowNumber: row, hasPublishedColumn: false })
    if (!('job' in normalized)) throw new Error(`Could not normalize source row ${row}`)
    warnings.push(...normalized.warnings.filter(message => !/Title is very long|Company is very long/.test(message)))
    const job = normalized.job
    const dates: { closes?: string; added?: string } = {}
    for (const field of ['closes', 'added'] as const) {
      const raw = record[field] ?? ''
      const rollingClose = field === 'closes' && ['allyearround', 'noclose'].includes(squash(raw))
      const parsed = parseSheetDate(rollingClose ? '' : raw)
      dates[field] = parsed.warning ? record[field] : parsed.date
      if (parsed.warning) warn(`${field}: ${parsed.warning}`)
    }
    const active = publicByRow.get(row)
    let slug = active?.id ?? (slugify(record.id ?? '') || deriveJobId(record.company ?? '', record.title ?? ''))
    if (!active) {
      const base = slug
      let suffix = 2
      while (used.has(slug)) slug = `${base}-${suffix++}`
      used.add(slug)
    }
    const internalNotes = notesIndex < 0 ? '' : (values[notesIndex] ?? '').replace(/\r\n?/g, '\n').trim()
    const data: CareerImportData = {
      title: record.title ?? '', company: record.company ?? '', type: job.type,
      industry: job.industry, companyWebsite: job.companyWebsite, logoUrl: job.logoUrl,
      country: job.country?.label, state: job.state?.label, city: job.city?.label,
      workMode: job.workMode, international: job.international, studyLevels: job.studyLevels,
      eligibility: job.eligibility, applyUrl: applyUrl ?? record.apply ?? '', ...dates,
      pay: job.pay, description: job.description, tags: job.tags.join(', '), featured: job.featured,
      slug, internalNotes, sourceKey: `${source.sheetId}/${source.gid}/${row}`,
      _status: 'draft',
    }
    const errors = careerPublicationErrors(data)
    if (data.title.length > MAX_TITLE_LENGTH) errors.title = `Shorten the title to ${MAX_TITLE_LENGTH} characters before publishing.`
    if (data.company.length > MAX_COMPANY_LENGTH) errors.company = `Shorten the company to ${MAX_COMPANY_LENGTH} characters before publishing.`
    for (const [field, message] of Object.entries(errors)) warn(`Kept as draft: ${field}: ${message}`)
    if (!Object.keys(errors).length && (!hasPublished || isTruthyCell(record.published))) data._status = 'published'
    rows.push({ row, warnings, data })
  })
  const published = rows.filter(row => row.data._status === 'published').length
  return { rows, summary: { total: rows.length, published, drafts: rows.length - published, warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0) } }
}

export type CareerImportStore = {
  findBySourceKey: (sourceKey: string) => Promise<boolean>
  create: (data: CareerImportData) => Promise<unknown>
}

/** Sequential, restartable import. Existing records are never updated. */
export async function executeCareerImport(plan: CareerImportPlan, store: CareerImportStore, apply = false) {
  let created = 0
  let skipped = 0
  let pending = 0
  for (const { data } of plan.rows) {
    if (await store.findBySourceKey(data.sourceKey)) { skipped++; continue }
    if (!apply) { pending++; continue }
    await store.create(data)
    created++
  }
  return { created, skipped, pending }
}
