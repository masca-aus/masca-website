import { describe, expect, it } from 'vitest';
import { deriveCMSStatus, statusActions } from '@/features/admin/cmsStatus';

describe('one CMS status', () => {
  it('uses the current published record, not historical versions', () => {
    expect(deriveCMSStatus('events', { _status: 'draft' }, { _status: 'draft', reviewStatus: 'approved' }, 'active').status).toBe('draft');
    expect(deriveCMSStatus('events', { _status: 'draft' }, { _status: 'published', reviewStatus: 'approved' }, 'active')).toMatchObject({ status: 'published', hasChanges: true });
    expect(deriveCMSStatus('events', { _status: 'published' }, { _status: 'published', reviewStatus: 'pending' }, 'active').status).toBe('draft');
  });
  it('gives archive and completion precedence over publication', () => {
    expect(deriveCMSStatus('events', {}, { _status: 'published', reviewStatus: 'approved' }, 'completed').status).toBe('completed');
    expect(deriveCMSStatus('careers', {}, { _status: 'published' }, 'closed').status).toBe('closed');
    expect(deriveCMSStatus('careers', {}, { _status: 'published' }, 'archived').status).toBe('archived');
  });
  it('keeps draft edits as a note, not a separate status', () => {
    expect(deriveCMSStatus('careers', { _status: 'draft' }, { _status: 'published' }, 'active')).toMatchObject({ status: 'published', hasChanges: true });
    expect(deriveCMSStatus('careers', { _status: 'published' }, { _status: 'published' }, 'active').hasChanges).toBe(false);
  });
  it('offers only actions relevant to the current stage', () => {
    expect(statusActions('events', { status: 'draft', hasChanges: false }).map(a => a.value)).toEqual(['publish', 'archive']);
    expect(statusActions('careers', { status: 'published', hasChanges: true }).map(a => a.value)).toEqual(['publish', 'unpublish', 'close', 'archive']);
    expect(statusActions('events', { status: 'archived', hasChanges: false }).map(a => a.value)).toEqual(['restore']);
    expect(statusActions('events', { status: 'completed', hasChanges: false }).map(a => a.value)).toEqual(['reopen', 'archive']);
  });
});

it('shows date-expired published careers as closed and routes reopening to details', () => {
 const state = deriveCMSStatus('careers', { _status: 'published' }, { _status: 'published', closes: '2026-09-01' }, 'active', '2026-09-22');
 expect(state).toMatchObject({ status: 'closed', expired: true });
 expect(statusActions('careers', state)[0]).toEqual({ value: 'edit', label: 'Update dates to reopen' });
 expect(deriveCMSStatus('careers', {}, { _status: 'published', added: '2026-01-01' }, 'active', '2026-09-22').status).toBe('closed');
 expect(deriveCMSStatus('careers', {}, { _status: 'draft', closes: '2026-09-01' }, 'active', '2026-09-22').status).toBe('draft');
});

it('keeps date-expired careers in Closed and archived careers out of it', async () => {
 const { careerListFilter } = await import('@/features/careers/careerLifecycle');
 const payload = { find: async ({ collection }: { collection: string }) => collection === 'career-lifecycle'
  ? { docs: [{ career: 2, status: 'closed' }, { career: 3, status: 'archived' }] }
  : { docs: [{ id: 1 }, { id: 3 }] } };
 const filter = (careerView: string) => careerListFilter({ req: { payload, user: { id: 1 }, query: { careerView }, context: {} } as never });
 expect(await filter('active')).toEqual({ id: { not_in: [2, 1, 3] } });
 expect(await filter('closed')).toEqual({ and: [{ id: { in: [2, 1, 3] } }, { id: { not_in: [3] } }] });
 expect(await filter('archived')).toEqual({ id: { in: [3] } });
});
