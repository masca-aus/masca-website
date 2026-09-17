import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from 'next/cache';
import { Events } from '@/collections/Events';

async function changed(args: Record<string, unknown>) {
  for (const hook of Events.hooks?.afterChange ?? []) await hook(args as never);
}
describe('event publication invalidation', () => {
  beforeEach(() => vi.mocked(revalidatePath).mockClear());
  it('does not invalidate live pages for an autosaved draft of a published event', async () => {
    await changed({ doc: { _status: 'draft' }, previousDoc: { _status: 'published' }, req: { query: { draft: 'true', autosave: 'true' } } });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it('invalidates when publishing an event', async () => {
    await changed({ doc: { _status: 'published' }, previousDoc: { _status: 'draft' }, req: { query: {} } });
    expect(revalidatePath).toHaveBeenCalledWith('/events');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
  it('invalidates when explicitly unpublishing', async () => {
    await changed({ doc: { _status: 'draft' }, previousDoc: { _status: 'published' }, req: { query: {} } });
    expect(revalidatePath).toHaveBeenCalledWith('/events');
  });
  it('invalidates unpublish when Payload supplies the latest draft as previousDoc', async () => {
    await changed({ doc: { _status: 'draft' }, previousDoc: { _status: 'draft' }, req: { query: { unpublishAllLocales: 'true' } } });
    expect(revalidatePath).toHaveBeenCalledWith('/events');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
  it('does not invalidate pages when creating an unpublished draft', async () => {
    await changed({ doc: { _status: 'draft' }, req: { query: { draft: 'true' } } });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
