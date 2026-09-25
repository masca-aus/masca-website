/** Run with `npm run payload -- run scripts/import-careers.mts [-- --apply]`. Default: read-only preview. */
import { getPayload } from 'payload'
import config from '../payload.config.ts'
import { melbourneToday } from '../utils/careers.ts'
import { fetchSheetCsv, resolveSheetConfig } from '../utils/careersSource.ts'
import { executeCareerImport, planCareerImport } from '../features/careers/importCareers.ts'

let stage = 'source configuration'
async function main() {
  const apply = process.argv.includes('--apply')
  const source = resolveSheetConfig()
  if (!source) throw new Error('Configure CAREERS_SHEET_ID and CAREERS_SHEET_GID before importing.')
  stage = 'source download'
  const fetched = await fetchSheetCsv(source, { fresh: true })
  if (!fetched.ok) { stage = `source download (${fetched.status})`; throw new Error('Source could not be read.') }
  stage = 'source normalization'
  const plan = planCareerImport(fetched.csv, source, melbourneToday())
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...plan.summary }))
  // Warnings are reduced to row/count: cell content may contain private information.
  for (const row of plan.rows) if (row.warnings.length) console.log(`Row ${row.row}: ${row.warnings.length} warnings; ${row.data._status}.`)
  stage = 'database connection'
  // Payload's CLI can load this config through CommonJS interop. Unwrap its default export.
  const resolvedConfig = await config
  const payloadConfig = 'default' in resolvedConfig ? await (resolvedConfig.default as typeof config) : resolvedConfig
  const payload = await getPayload({ config: payloadConfig })
  try {
    stage = 'database import'
    const result = await executeCareerImport(plan, {
      findBySourceKey: async sourceKey => (await payload.find({ collection: 'careers', where: { sourceKey: { equals: sourceKey } }, limit: 1, depth: 0, draft: true, overrideAccess: true })).docs.length > 0,
      create: data => payload.create({ collection: 'careers', data, draft: data._status === 'draft', overrideAccess: true }),
    }, apply)
    console.log(JSON.stringify(result))
  } finally { await payload.destroy() }
}

await main().catch(() => { throw new Error(`Careers import stopped during ${stage}. Check configuration and source rows; existing CMS records were not overwritten.`) })
