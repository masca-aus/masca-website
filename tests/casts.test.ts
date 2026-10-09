import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getCastPeeps } from '@/utils/casts'

describe('walking crowd assets', () => {
  it('includes the cast illustrations without committee photo placeholders', () => {
    const peeps = getCastPeeps()
    expect(peeps.some(peep => peep.src === '/casts/Jin.svg')).toBe(true)
    expect(peeps.some(peep => /placeholder/i.test(peep.name))).toBe(false)
    for (const peep of peeps) {
      expect(existsSync(join(process.cwd(), 'public', decodeURI(peep.src)))).toBe(true)
    }
  })
})
