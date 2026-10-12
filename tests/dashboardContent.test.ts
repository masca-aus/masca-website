import { describe, expect, it, vi } from 'vitest';
import type { PayloadRequest, Where } from 'payload';
import { loadDashboardContent } from '@/features/dashboard/dashboardContent';
import { dashboardContext } from '@/features/dashboard/teamDashboard';
import type { ApprovedAccount } from '@/features/access/workspacePolicy';
vi.mock('@/features/events/eventLifecycle.ts', () => ({ lifecycleIDs: async () => [9] }));
vi.mock('@/features/careers/careerLifecycle.ts', () => ({ careerListFilter: async () => ({ id: { not_in: [8] } }) }));
const account: ApprovedAccount = { email: 'member@masca.org.au', status: 'active', role: 'editor', grants: [], permissions: { events: { view: true, edit: true, scopes: ['QLD'] }, careers: { view: true, edit: true, scopes: ['NSW'] }, committee: { view: true, edit: false, scopes: [] } } };
function request(user = account) {
  const count = vi.fn(async () => ({ totalDocs: 4 }));
  const req = { user, payload: { collections: { events: { config: { versions: { drafts: {} } } }, careers: { config: { versions: { drafts: {} } } }, committee: { config: { versions: { maxPerDoc: 0 } } } }, count } } as unknown as PayloadRequest;
  return { req, count };
}
describe('dashboard live content totals', () => {
  it('uses published base counts and matching branch-filtered list destinations, excluding archived and inactive listings', async () => {
    const { req, count } = request();
    const result = await loadDashboardContent(req, account, dashboardContext(account));
    expect(result.map(row => row.area)).toEqual(['careers', 'events', 'committee']);
    const events = result.find(row => row.area === 'events')!;
    const url = new URL(events.href, 'https://cms.example');
    expect(url.searchParams.get('where[and][0][owningScope][in][0]')).toBe('QLD');
    expect(url.searchParams.get('where[and][1][_status][equals]')).toBe('published');
    expect(url.searchParams.get('where[and][2][id][not_in][0]')).toBe('9');
    expect(new URL(result[0].href, 'https://cms.example').searchParams.get('where[and][2][id][not_in][0]')).toBe('8');
    for (const [options] of count.mock.calls as unknown as [{ req: unknown; overrideAccess: boolean; draft?: boolean; where: Where }][]) {
      expect(options.req).toBe(req); expect(options.overrideAccess).toBe(false); expect(options.draft).toBeUndefined();
    }
  });
  it('filters viewing-only sections by selected branch without adding editing permissions', async () => {
    const { req } = request();
    const result = await loadDashboardContent(req, account, dashboardContext(account, 'QLD'));
    const committee = new URL(result.find(row => row.area === 'committee')!.href, 'https://cms.example');
    expect(committee.searchParams.get('where[and][0][owningScope][equals]')).toBe('QLD');
  });
  it('supports committee publication workflows when drafts are configured, including the older immediate-save Preview', async () => {
    const { req } = request();
    const previous = await loadDashboardContent(req, account, dashboardContext(account));
    expect(previous.find(row => row.area === 'committee')!.href).not.toContain('_status');
    req.payload.collections.committee.config.versions = { drafts: { autosave: false }, maxPerDoc: 0 } as never;
    const current = await loadDashboardContent(req, account, dashboardContext(account));
    expect(decodeURIComponent(current.find(row => row.area === 'committee')!.href)).toContain('[_status][equals]=published');
  });
  it('never loads suspended-account data or turns a failed count into zero', async () => {
    const suspended = { ...account, status: 'suspended' as const };
    const { req, count } = request(suspended);
    expect(await loadDashboardContent(req, suspended, dashboardContext(suspended))).toEqual([]); expect(count).not.toHaveBeenCalled();
    const active = request(); active.count.mockRejectedValue(new Error('offline'));
    const result = await loadDashboardContent(active.req, account, dashboardContext(account));
    expect(result.every(row => row.status === 'unavailable' && row.count === undefined)).toBe(true);
  });
});
