import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { DashboardContent } from '@/components/admin/MascaDashboard';
import { dashboardContext } from '@/features/dashboard/teamDashboard';
import type { ApprovedAccount } from '@/features/access/workspacePolicy';
import type { DashboardTask } from '@/features/dashboard/dashboardTasks';
const account: ApprovedAccount = { email: 'member@masca.org.au', role: 'editor', status: 'active', grants: [], departments: ['careers'], permissions: { careers: { view: true, edit: true, scopes: ['QLD'] }, events: { view: true, edit: false, scopes: [] }, media: { view: true, edit: false, scopes: [] } } };
const task: DashboardTask = { area: 'careers', status: 'ready', drafts: 2, pending: 1, draftHref: '/admin/collections/careers?drafts=QLD', reviewHref: '/admin/collections/careers?review=QLD', recentDrafts: [{ id: 7, title: 'Graduate programme', area: 'careers' }] };
describe('original workspace with summary cards', () => {
  it('keeps original content tools with branch-safe editing and linked summary destinations', () => {
    const html = renderToStaticMarkup(<DashboardContent account={account} context={dashboardContext(account, 'QLD')} tasks={[task]} content={[{ area: 'careers', status: 'ready', count: 4, href: '/admin/collections/careers?live=QLD' }, { area: 'events', status: 'ready', count: 3, href: '/admin/collections/events?live=QLD' }]} />);
    expect(html).toContain('Your workspace'); expect(html).toContain('name="branch" value="QLD"');
    expect(html).toContain('href="/admin/collections/careers?live=QLD"'); expect(html).toContain('href="/admin/collections/careers?review=QLD"');
    expect(html).toContain('href="/admin/collections/careers/create?branch=QLD"'); expect(html).toContain('Opportunities and applications'); expect(html).toContain('Manage');
    expect(html).not.toContain('/events/create'); expect(html).not.toContain('/media/create');
    expect(html).toContain('aria-label="Published"'); expect(html).toContain('<strong>7</strong>');
    expect(html).toContain('aria-label="Drafts"'); expect(html).toContain('aria-label="To review"');
    expect(html.indexOf('Content summary')).toBeLessThan(html.indexOf('aria-label="Content"'));
    expect(html).not.toContain('Recent drafts'); expect(html).not.toContain('Website traffic');
  });
  it('shows honest zero totals when no work is outstanding', () => {
    const html = renderToStaticMarkup(<DashboardContent account={account} tasks={[{ ...task, drafts: 0, pending: 0, recentDrafts: [] }]} />);
    expect(html.match(/<strong>0<\/strong>/g)).toHaveLength(2);
    expect(html).toContain('href="/admin/collections/careers?drafts=QLD"');
  });
  it('shows viewing-only members browsing tools and live totals without editing cards or actions', () => {
    const viewer = { ...account, permissions: { careers: { view: true, edit: false, scopes: [] } } };
    const html = renderToStaticMarkup(<DashboardContent account={viewer} />);
    expect(html).toContain('Browse'); expect(html).toContain('aria-label="Published"');
    expect(html).not.toContain('name="branch"'); expect(html).not.toContain('/create'); expect(html).not.toContain('aria-label="Drafts"'); expect(html).not.toContain('aria-label="To review"');
  });
  it('does not display unpermitted totals supplied to the presentation', () => {
    const html = renderToStaticMarkup(<DashboardContent account={account} content={[{ area: 'sponsors', status: 'ready', count: 999, href: '/admin/collections/sponsors' }]} />);
    expect(html).not.toContain('999'); expect(html).not.toContain('/collections/sponsors');
  });
  it('does not turn a failed queue into a zero summary', () => {
    const html = renderToStaticMarkup(<DashboardContent account={account} tasks={[{ ...task, status: 'unavailable', drafts: undefined, pending: undefined, recentDrafts: [] }]} />);
    expect(html).toContain('Some counts are unavailable.'); expect(html).not.toContain('<strong>0</strong>');
  });
});

it('keeps the chosen branch across workspace and metrics navigation', () => {
  const html = renderToStaticMarkup(<DashboardContent account={account} context={dashboardContext(account, 'QLD')} view="metrics" tasks={[task]} content={[{ area: 'careers', status: 'ready', count: 4, href: '/admin/collections/careers?live=QLD' }]} websiteInsights={<p>Website report</p>} />);
  expect(html).toContain('role="tab"');
  expect(html).toContain('masca-dashboard__workspace" hidden=""');
  expect(html).not.toContain('Workspace info');
  expect(html).toContain('>Tutorial</button>');
  expect(html).toContain('View website');
  expect(html).toContain('name="view" value="metrics"');
  expect(html).toContain('Website report');
  expect(html).toContain('Published content by section');
  expect(html).toContain('Add opportunity');
  expect(html).toContain('aria-label="To review"');
  expect(html).not.toContain('Sponsors');
});
