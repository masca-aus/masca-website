import { describe, expect, it } from 'vitest';
import type { FieldHook } from 'payload';
import { cmsStatusField } from '../features/admin/cmsStatusField';

describe('status on deleted records', () => {
  for (const collection of ['events', 'careers'] as const) {
    it(`does not fail the ${collection} delete response when afterRead runs`, async () => {
      const field = cmsStatusField(collection);
      if (!('hooks' in field)) throw new Error('Missing status hooks');
      const hook = field.hooks!.afterRead![0];
      const result = await hook({
        data: { id: 1 }, context: {}, req: { user: { id: 1 }, payload: {
          // Payload's findByID returns null only with disableErrors; otherwise it throws.
          findByID: async ({ disableErrors }: { disableErrors?: boolean }) => {
            if (!disableErrors) throw new Error('Not Found');
            return null;
          },
          find: async () => ({ docs: [] }),
        } },
      } as unknown as Parameters<FieldHook>[0]);
      expect(result).toBeUndefined();
    });
  }
});
