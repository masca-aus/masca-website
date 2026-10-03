import { type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
import { nationalCouncil2026_2027 } from './data/20261003_national_council_2026_2027'

const year = '2026/2027'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const existing = await payload.find({
    collection: 'committee',
    where: { year: { equals: year }, name: { in: nationalCouncil2026_2027.map(({ name }) => name) } },
    limit: 100,
    draft: true,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const existingNames = new Set(existing.docs.map(({ name }) => name))

  for (const [index, member] of nationalCouncil2026_2027.entries()) {
    if (existingNames.has(member.name)) continue
    await payload.create({
      collection: 'committee',
      data: {
        ...member,
        year,
        _order: `council-${String(index + 1).padStart(2, '0')}`,
        _status: 'draft',
      } as never,
      draft: true,
      overrideAccess: true,
      req,
    })
  }
}

// The imported profiles are kept as CMS records if this seed is rolled back;
// they may have been edited since import.
export async function down(_args: MigrateDownArgs): Promise<void> {}
