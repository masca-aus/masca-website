import {mayUseCalendar} from "@/features/mediaCalendar/policy";
import type {CalendarUser} from "@/features/mediaCalendar/types";
import { AdminLink as Link } from './AdminNavigationContext';
import { Suspense, type ReactNode } from 'react';
import { ArrowUpRight, ArrowRight, Building2, Briefcase, CalendarDays, Handshake, ImageIcon, Users, Globe, FilePenLine, ClipboardCheck } from 'lucide-react';
import type { PayloadRequest } from 'payload';
import { mayManagePeople, mayEditArea, contentAreas, isWorkspaceEmail, type ApprovedAccount, type ContentArea, type PermissionArea } from '@/features/access/workspacePolicy';
import { areaScopes, collectionLink, dashboardContext, orderedAreas, type DashboardContext } from '@/features/dashboard/teamDashboard';
import { loadDashboardTasks, type DashboardTask } from '@/features/dashboard/dashboardTasks';
import { DashboardTutorial } from './DashboardTutorial';
import { DashboardBranchPicker } from './DashboardBranchPicker';
import { DashboardTabs } from './DashboardTabs';
import { loadDashboardContent, type DashboardContentCount } from '@/features/dashboard/dashboardContent';
import { loadWebsiteAnalytics } from '@/features/analytics/websiteAnalytics';
import { WebsiteInsights, WebsiteInsightsLoading } from './WebsiteInsights';
import { DashboardContentMetrics } from './DashboardContentMetrics';
import './dashboard.css';

const tools = {
  careers: { name: 'Careers', Icon: Briefcase, description: 'Opportunities and applications', action: 'Add opportunity' },
  events: { name: 'Events', Icon: CalendarDays, description: 'Events and public submissions', action: 'Create event' },
  committee: { name: 'Committee', Icon: Users, description: 'Members, roles and portraits', action: 'Add member' },
  sponsors: { name: 'Sponsors', Icon: Handshake, description: 'Partners and sponsorships', action: 'Add sponsor' },
  organisations: { name: 'Organisations', Icon: Building2, description: 'Student organisation directory', action: 'Add organisation' },
  media: { name: 'Media', Icon: ImageIcon, description: 'Images for the website', action: 'Upload image' },
} satisfies Record<PermissionArea, unknown>;

export async function MascaDashboard({ initPageResult, searchParams }: {
  initPageResult: { req: PayloadRequest }; searchParams?: Record<string, unknown>;
}) {
  const { req } = initPageResult;
  if (!req.user) return null;
  const account = process.env.WORKSPACE_AUTH_ENABLED === 'true' ? req.user as unknown as ApprovedAccount : undefined;
  if (account && (account.status !== 'active' || !isWorkspaceEmail(account.email))) return null;
  const view = (searchParams?.view ?? req.query?.view) === 'metrics' ? 'metrics' : 'workspace';
  const context = dashboardContext(account, searchParams?.branch ?? req.query?.branch);
  const tasks = loadDashboardTasks(req, account, context, { summaryOnly: true });
  const content = loadDashboardContent(req, account, context);
  return <DashboardContent account={account} context={context} view={view}
    summary={<Suspense fallback={<DashboardSummaryLoading account={account} context={context} />}><StreamedSummary account={account} context={context} tasks={tasks} content={content} /></Suspense>}
    contentMetrics={<Suspense fallback={<p role="status">Loading published content…</p>}><StreamedContentMetrics account={account} context={context} content={content} /></Suspense>}
    websiteInsights={<Suspense fallback={<WebsiteInsightsLoading />}><WebsiteReport req={req} /></Suspense>} />;
}
async function WebsiteReport({ req }: { req: PayloadRequest }) {
  return <WebsiteInsights report={await loadWebsiteAnalytics(req)} expanded />;
}
type SummaryRow = { area: PermissionArea; count?: number; href: string };
function SummaryCard({ title, caption, rows, kind }: { title: string; caption: string; rows: SummaryRow[]; kind: 'published' | 'drafts' | 'review' }) {
  const complete = rows.length > 0 && rows.every(row => typeof row.count === 'number');
  const Icon = { published: Globe, drafts: FilePenLine, review: ClipboardCheck }[kind];
  return <article className="masca-dashboard__stat" data-status={kind} aria-label={title}>
    <div className="masca-dashboard__stat-top">
      <h2>{title}</h2>
      <span className="masca-dashboard__stat-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
    </div>
    <div className="masca-dashboard__stat-value"><strong>{complete ? rows.reduce((sum, row) => sum + (row.count ?? 0), 0) : '—'}</strong></div>
    <p>{complete ? caption : 'Some counts are unavailable.'}</p>
    <div className="masca-dashboard__stat-links">
      {rows.map(row => <Link key={row.area} href={row.href}>
        <span className="masca-dashboard__stat-area">{tools[row.area].name}</span>
        <span className="masca-dashboard__stat-count">{row.count ?? '—'}</span>
        <ArrowRight size={13} aria-hidden="true" />
      </Link>)}
    </div>
  </article>;
}
function ContentRow({ area, account, context }: { area: PermissionArea; account?: ApprovedAccount; context: DashboardContext }) {
  const { name, Icon, description, action } = tools[area];
  const scoped = contentAreas.includes(area as ContentArea);
  const editable = !account || (scoped ? areaScopes(account, area as ContentArea, context.branch).length > 0 : mayEditArea(account, area));
  const href = collectionLink(area, scoped && context.branch !== 'all' ? { owningScope: { equals: context.branch } } : undefined);
  const createHref = `/admin/collections/${area}/create${scoped && context.branch !== 'all' ? `?branch=${context.branch}` : ''}`;
  return <div className="masca-dashboard__content-row"><span className="masca-dashboard__content-icon" data-area={area}><Icon size={21} aria-hidden="true" /></span><div className="masca-dashboard__content-label"><h3><Link href={href}>{name}</Link></h3><p>{description}</p></div><div className="masca-dashboard__row-actions"><Link className="masca-dashboard__manage" href={href}>{editable ? 'Manage' : 'Browse'}</Link>{editable && <Link className="masca-dashboard__add" href={createHref}>{action}</Link>}</div></div>;
}

export function DashboardContent({ account, context = dashboardContext(account), tasks = [], content = [], view = 'workspace', websiteInsights, summary, contentMetrics }: {
  account?: ApprovedAccount; context?: DashboardContext; tasks?: DashboardTask[]; content?: DashboardContentCount[]; websiteInsights?: ReactNode; summary?: ReactNode; contentMetrics?: ReactNode; view?: 'workspace' | 'metrics';
}) {
  const areas = orderedAreas(account);
  const isAdmin = !account || mayManagePeople(account);
  const published = publishedRows(account, content);
  const calendarVisible = mayUseCalendar(account as CalendarUser, "view");
  const sections = [{ title: 'Content', areas: areas.filter(area => contentAreas.includes(area as ContentArea)) }, { title: 'Resources', areas: areas.filter(area => !contentAreas.includes(area as ContentArea)) }];
  return <DashboardTabs key={`${context.branch}:${view}`} initialView={view} branch={context.branch}
    metrics={<>{websiteInsights}{contentMetrics ?? <DashboardContentMetrics rows={published} branch={context.branch} />}</>}
    workspace={<>
    {summary ?? <DashboardSummary account={account} context={context} tasks={tasks} content={content} />}
    {sections.filter(section => section.areas.length > 0 || (section.title === 'Content' && calendarVisible)).map(section => <section key={section.title} className="masca-dashboard__section" aria-label={section.title}><h2>{section.title}</h2><div className="masca-dashboard__content">{section.areas.map(area => <ContentRow key={area} area={area} account={account} context={context} />)}{section.title === 'Content' && calendarVisible && <div className="masca-dashboard__content-row"><span className="masca-dashboard__content-icon" data-area="media-calendar"><CalendarDays size={21} aria-hidden="true" /></span><div className="masca-dashboard__content-label"><h3><Link href="/admin/media-calendar">Media calendar</Link></h3><p>Posts, captions and team reviews.</p></div><div className="masca-dashboard__row-actions"><Link className="masca-dashboard__add" href="/admin/media-calendar">Open calendar</Link></div></div>}</div></section>)}
    {areas.length === 0 && !calendarVisible && <p>No content sections are assigned to this account. Contact your administrator.</p>}
    </>}>
    <header className="masca-dashboard__heading">
      <div><h1>Your workspace</h1><p>Manage your content and keep the website up to date.</p></div>
      <div className="masca-dashboard__header-controls">
        {context.branches.length > 0 && <DashboardBranchPicker branches={context.branches} value={context.branch} view={view} />}
        <div className="masca-dashboard__actions">
          <DashboardTutorial areas={areas} showEvents={(['events', 'careers'] as const).some(area => areaScopes(account, area, context.branch).length > 0)} isAdmin={isAdmin} />
          <Link href="/" className="masca-action masca-action--secondary masca-dashboard__website-link" target="_blank" rel="noopener noreferrer">View website<ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </header>
  </DashboardTabs>;
}

function publishedRows(account: ApprovedAccount | undefined, content: DashboardContentCount[]): SummaryRow[] {
  return orderedAreas(account).filter(area => contentAreas.includes(area as ContentArea)).map(area => {
    const row = content.find(item => item.area === area);
    return { area, count: row?.status === 'ready' ? row.count : undefined, href: row?.href ?? collectionLink(area) };
  });
}
export function DashboardSummary({ account, context, tasks, content }: { account?: ApprovedAccount; context: DashboardContext; tasks: DashboardTask[]; content: DashboardContentCount[] }) {
  const areas = orderedAreas(account);
  const published = publishedRows(account, content);
  const work = tasks.filter(task => areas.includes(task.area) && areaScopes(account, task.area, context.branch).length > 0);
  return (
    <section className="masca-dashboard__stats" aria-label="Content summary">
      {published.length > 0 && <SummaryCard kind="published" title="Published" caption="Live website content" rows={published} />}
      {work.length > 0 && <><SummaryCard kind="drafts" title="Drafts" caption="Includes items awaiting review" rows={work.map(task => ({ area: task.area, count: task.status === 'ready' ? task.drafts : undefined, href: task.draftHref }))} /><SummaryCard kind="review" title="To review" caption="Submissions needing attention" rows={work.map(task => ({ area: task.area, count: task.status === 'ready' ? task.pending : undefined, href: task.reviewHref }))} /></>}
    </section>
  );
}
export function DashboardSummaryLoading({ account, context }: { account?: ApprovedAccount; context: DashboardContext }) {
  const titles = [
    ...(orderedAreas(account).some(area => contentAreas.includes(area as ContentArea)) ? ['Published'] : []),
    ...((['events','careers'] as const).some(area => areaScopes(account, area, context.branch).length > 0) ? ['Drafts','To review'] : []),
  ];
  if (!titles.length) return null;
  return <section className="masca-dashboard__stats" aria-label="Loading content summary" aria-busy="true">
    {titles.map(title => <article key={title} className="masca-dashboard__stat masca-dashboard__stat--loading"><div className="masca-dashboard__stat-top"><h2>{title}</h2></div><span className="masca-dashboard__count-placeholder" aria-hidden="true" /><p>Loading count…</p><div className="masca-dashboard__links-placeholder" aria-hidden="true" /></article>)}
  </section>;
}
async function StreamedSummary({ tasks, content, ...props }: { account?: ApprovedAccount; context: DashboardContext; tasks: Promise<DashboardTask[]>; content: Promise<DashboardContentCount[]> }) {
  const [resolvedTasks, resolvedContent] = await Promise.all([tasks, content]);
  return <DashboardSummary {...props} tasks={resolvedTasks} content={resolvedContent} />;
}
async function StreamedContentMetrics({ account, context, content }: { account?: ApprovedAccount; context: DashboardContext; content: Promise<DashboardContentCount[]> }) {
  return <DashboardContentMetrics rows={publishedRows(account, await content)} branch={context.branch} />;
}
