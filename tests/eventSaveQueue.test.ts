import { describe, expect, it } from 'vitest';
import { createEventSaveQueue } from '@/features/events/eventSaveQueue';

describe('event save queue', () => {
  it('serializes autosave before publishing and reads the latest values when publishing begins', async () => {
    const queue = createEventSaveQueue();
    const actions: string[] = [];
    let release!: () => void;
    let value = 'old';
    const draft = queue.run(async () => { actions.push('draft'); await new Promise<void>(r => { release = r; }); return true; });
    const publish = queue.run(async () => { actions.push(`publish:${value}`); return true; });
    await Promise.resolve();
    expect(actions).toEqual(['draft']);
    value = 'latest';
    release();
    await Promise.all([draft, publish]);
    expect(actions).toEqual(['draft', 'publish:latest']);
  });
  it('allows retry after a failed request', async () => {
    const queue = createEventSaveQueue();
    await expect(queue.run(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    await expect(queue.run(async () => true)).resolves.toBe(true);
  });
});
