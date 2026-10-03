import { describe, expect, it, vi } from 'vitest';
import type { FieldHook } from 'payload';
import { Careers } from '@/collections/Careers';
import { Events } from '@/collections/Events';
import { cmsStatusField } from '@/features/admin/cmsStatusField';

describe('CMS status reads within a save transaction', () => {
  it.each(['careers', 'events'] as const)('serializes %s reads and preserves status', async (collection) => {
    let active = 0;
    let peak = 0;
    const read = async <T>(value: T) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--;
      return value;
    };
    const findByID = vi.fn(({ draft }) => read(draft
      ? { _status: 'draft' }
      : { _status: 'published', reviewStatus: 'approved' }));
    const find = vi.fn(() => read({ docs: [{ status: 'active' }] }));
    const req = { user: { id: 1 }, transactionID: 'save-transaction', payload: { findByID, find } };
    const field = cmsStatusField(collection);
    const hook = ('hooks' in field ? field.hooks?.afterRead?.[0] : undefined)!;
    const args = { data: { id: 155 }, req, context: {} } as unknown as Parameters<FieldHook>[0];
    const config = collection === 'events' ? Events : Careers;
    const lifecycle = config.fields.find(field => 'name' in field && field.name === 'lifecycle')!;
    const lifecycleHook = ('hooks' in lifecycle ? lifecycle.hooks?.afterRead?.[0] : undefined)!;
    const [result, stage] = await Promise.all([hook(args), lifecycleHook(args)]);
    expect(stage).toBe('active');

    expect(peak).toBe(1);
    expect(result).toMatchObject({ status: 'published', hasChanges: true });
    expect(findByID).toHaveBeenCalledTimes(2);
    for (const [args] of findByID.mock.calls) {
      expect(args).toMatchObject({ req: { transactionID: 'save-transaction', context: { cmsStatusRead: true } }, overrideAccess: false });
    }
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: `${collection === 'events' ? 'event' : 'career'}-lifecycle`, req }));
  });
});

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
