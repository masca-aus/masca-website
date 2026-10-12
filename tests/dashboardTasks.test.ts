import { describe, expect, it, vi } from 'vitest';
import type { PayloadRequest, Where } from 'payload';
import { loadDashboardTasks } from '@/features/dashboard/dashboardTasks';
import { dashboardContext } from '@/features/dashboard/teamDashboard';
import type { ApprovedAccount } from '@/features/access/workspacePolicy';
const account: ApprovedAccount = { email: 'member@masca.org.au', role: 'editor', status: 'active', grants: [], departments: ['careers'], permissions: {
  careers: { view: true, edit: true, scopes: ['QLD'] }, events: { view: true, edit: true, scopes: ['VIC'] },
} };
const records: Record<string, Record<string, unknown>[]> = {
  events: [{ id: 1, title: 'Victorian event', owningScope: 'VIC', _status: 'draft', submittedForReview: true, updatedAt: '2026-10-07' }, { id: 2, title: 'Queensland event', owningScope: 'QLD', _status: 'draft' }],
  careers: [
    { id: 3, title: 'Queensland role', owningScope: 'QLD', _status: 'draft', submittedForReview: true, updatedAt: '2026-10-08' },
    { id: 4, title: 'National role', owningScope: 'National', _status: 'draft', submittedForReview: true },
    { id: 6, title: 'Expired published role with draft edits', owningScope: 'QLD', _status: 'draft', submittedForReview: true },
    { id: 5, title: 'Archived role', owningScope: 'QLD', _status: 'draft', submittedForReview: true },
  ],
  'event-lifecycle': [], 'career-lifecycle': [{ career: 5, status: 'archived' }],
};
function matches(record: Record<string, unknown>, where: Where = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'or') return (value as Where[]).some(part => matches(record, part));
    if (key === 'and') return (value as Where[]).every(part => matches(record, part));
    const filter = value as { equals?: unknown; in?: unknown[]; not_in?: unknown[]; exists?: boolean; not_equals?: unknown; less_than?: string };
    return (filter.exists === undefined || (record[key] != null) === filter.exists) && (!('not_equals' in filter) || record[key] !== filter.not_equals) && (!filter.less_than || String(record[key] ?? '') < filter.less_than) && (!('equals' in filter) || record[key] === filter.equals) && (!filter.in || filter.in.includes(record[key])) && (!filter.not_in || !filter.not_in.includes(record[key]));
  });
}
function request(user: ApprovedAccount | null = account) {
  const queries: { collection: string; where?: Where; overrideAccess?: boolean; req?: unknown }[] = [];
  function rows(options: { collection: string; where?: Where; draft?: boolean }) {
    const source = options.collection === 'careers' && options.draft === false ? [{ id: 6, title: 'Expired role', _status: 'published', closes: '2000-01-01' }] : records[options.collection];
    return source.filter(row => matches(row, options.where)); }
  const req = { user, payload: {
    count: async (options: { collection: string; where?: Where }) => { queries.push(options); return { totalDocs: rows(options).length }; },
    find: async (options: { collection: string; where?: Where; limit?: number }) => { queries.push(options); const result = rows(options); return { totalDocs: result.length, docs: result.slice(0, options.limit ?? result.length) }; },
  } } as unknown as PayloadRequest;
  return { req, queries };
}
describe('dashboard editable work queues', () => {
  it('filters counts and recent drafts by paired area/branch grants, excluding archived work', async () => {
    const { req, queries } = request();
    const tasks = await loadDashboardTasks(req, account, dashboardContext(account));
    expect(tasks).toHaveLength(2);
    expect(tasks.find(task => task.area === 'events')).toMatchObject({ drafts: 1, pending: 1, recentDrafts: [{ title: 'Victorian event' }] });
    expect(tasks.find(task => task.area === 'careers')).toMatchObject({ drafts: 1, pending: 1, recentDrafts: [{ title: 'Queensland role' }] });
    for (const query of queries.filter(query => ['events', 'careers'].includes(query.collection))) {
      expect(query.overrideAccess).toBe(false); expect((query.req as PayloadRequest).user).toBe(req.user);
    }
    const url = new URL(tasks[1].reviewHref, 'https://cms.example');
    expect(url.searchParams.get('where[and][1][owningScope][in][0]')).toBe('QLD');
    expect(url.searchParams.getAll('where[and][0][id][not_in][0]')).toEqual(['6']);
    expect(url.searchParams.get('where[and][0][id][not_in][1]')).toBe('5');
    expect(url.searchParams.get('where[submittedForReview][equals]')).toBe('true');
  });
  it('omits tools with no editing access in the selected branch', async () => {
    const { req } = request();
    const tasks = await loadDashboardTasks(req, account, dashboardContext(account, 'QLD'));
    expect(tasks.map(task => task.area)).toEqual(['careers']);
    expect(tasks[0].recentDrafts.map(draft => draft.title)).toEqual(['Queensland role']);
  });
  it('does not load editing tasks for viewing-only, suspended or anonymous members', async () => {
    for (const member of [null, { ...account, status: 'suspended' as const }, { ...account, permissions: { careers: { view: true, edit: false, scopes: [] } } }]) {
      const { req, queries } = request(member);
      expect(await loadDashboardTasks(req, member ?? undefined, dashboardContext(member ?? undefined))).toEqual([]);
      expect(queries).toEqual([]);
    }
  });
  it('keeps content tools available when one task collection fails, without reporting zero work', async () => {
    const { req } = request(); const original = req.payload.find;
    req.payload.find = vi.fn(async options => { if (options.collection === 'events') throw new Error('offline'); return original(options as never); }) as never;
    const tasks = await loadDashboardTasks(req, account, dashboardContext(account));
    expect(tasks.find(task => task.area === 'events')).toMatchObject({ status: 'unavailable', recentDrafts: [] });
    expect(tasks.find(task => task.area === 'careers')).toMatchObject({ status: 'ready', drafts: 1 });
  });
});

it('counts latest draft versions even when the published base records have no drafts', async () => {
  const { req } = request();
  req.payload.count = vi.fn(async () => ({ totalDocs: 0 }));
  const tasks = await loadDashboardTasks(req, account, dashboardContext(account));
  expect(tasks.map(task => [task.area, task.drafts, task.pending])).toEqual([['events', 1, 1], ['careers', 1, 1]]);
});

it('loads summary totals without fetching recent draft titles or sorting by update time', async () => {
 const { req, queries } = request();
 const tasks = await loadDashboardTasks(req, account, dashboardContext(account), { summaryOnly: true });
 expect(tasks.map(task => [task.drafts, task.pending, task.recentDrafts])).toEqual([[1,1,[]],[1,1,[]]]);
 const contentQueries = queries.filter(query => ['events','careers'].includes(query.collection) && (query as {draft?:boolean}).draft === true);
 expect(contentQueries).toHaveLength(4);
 for (const query of contentQueries) expect(query).toMatchObject({limit:1,depth:0,select:{_status:true},sort:'id',overrideAccess:false,draft:true});
});
