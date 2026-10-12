import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { PayloadRequest } from 'payload';
vi.mock('server-only', () => ({}));
vi.mock('@/features/dashboard/dashboardTasks', () => ({loadDashboardTasks:vi.fn().mockResolvedValue([])}));
vi.mock('@/features/dashboard/dashboardContent', () => ({loadDashboardContent:vi.fn().mockResolvedValue([])}));
vi.mock('@/features/analytics/websiteAnalytics', () => ({loadWebsiteAnalytics:vi.fn().mockResolvedValue({status:'setup'})}));
import { MascaDashboard } from '@/components/admin/MascaDashboard';
import { loadDashboardTasks } from '@/features/dashboard/dashboardTasks';
import { loadDashboardContent } from '@/features/dashboard/dashboardContent';
import { loadWebsiteAnalytics } from '@/features/analytics/websiteAnalytics';
const request = (status = 'active') => ({ user: {email:'member@masca.org.au',role:'editor',status,permissions:{},grants:[]}, query:{} }) as unknown as PayloadRequest;
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('WORKSPACE_AUTH_ENABLED','true');});
afterEach(()=>vi.unstubAllEnvs());
it('prepares streamed analytics without blocking the default workspace', async()=>{
 const view = await MascaDashboard({initPageResult:{req:request()}});
 expect(view?.props.view).toBe('workspace');
 expect(view?.props.websiteInsights.props.fallback).toBeTruthy();
 expect(loadDashboardTasks).toHaveBeenCalledOnce();
 expect(loadWebsiteAnalytics).not.toHaveBeenCalled();
});
it('streams analytics separately and prepares both views on Metrics',async()=>{
 const view=await MascaDashboard({initPageResult:{req:request()},searchParams:{view:'metrics'}});
 expect(view?.props.view).toBe('metrics');
 expect(view?.props.websiteInsights.props.fallback).toBeTruthy();
 expect(loadDashboardTasks).toHaveBeenCalledOnce();
 expect(loadDashboardContent).toHaveBeenCalledOnce();
 expect(loadWebsiteAnalytics).not.toHaveBeenCalled();
 // Resolve the deferred server child independently of the workspace shell.
 await view?.props.websiteInsights.props.children.type(view.props.websiteInsights.props.children.props);
 expect(loadWebsiteAnalytics).toHaveBeenCalledOnce();
});
it.each(['invited','suspended'])('does not load dashboard data for %s accounts',async status=>{
 expect(await MascaDashboard({initPageResult:{req:request(status)},searchParams:{view:'metrics'}})).toBeNull();
 expect(loadDashboardContent).not.toHaveBeenCalled();
 expect(loadWebsiteAnalytics).not.toHaveBeenCalled();
});

it('renders usable tools while summary queries are still pending, then shares the resolved totals with Metrics', async () => {
 let finishContent!: (rows: unknown[]) => void;
 let finishTasks!: (rows: unknown[]) => void;
 vi.mocked(loadDashboardContent).mockImplementationOnce(() => new Promise(resolve => { finishContent = resolve as typeof finishContent; }));
 vi.mocked(loadDashboardTasks).mockImplementationOnce(() => new Promise(resolve => { finishTasks = resolve as typeof finishTasks; }));
 const req = request();
 req.user = { ...req.user, role: 'administrator' } as typeof req.user;
 const pending = MascaDashboard({initPageResult:{req}});
 const shell = await Promise.race([pending, new Promise<null>(resolve => setTimeout(() => resolve(null), 60))]);
 expect(shell, 'The workspace shell must not wait for count queries').not.toBeNull();
 const { renderToStaticMarkup } = await import('react-dom/server');
 const html = renderToStaticMarkup(shell!);
 expect(html).toContain('Create event');
 expect(html).toContain('Loading content summary');
 expect(html).not.toContain('<strong>0</strong>');
 finishContent(['events','careers','committee','sponsors'].map(area => ({area,status:'ready',count:area==='events'?8:0,href:`/admin/collections/${area}`})));
 finishTasks([]);
 const summaryChild = shell!.props.summary.props.children;
 const metricsChild = shell!.props.contentMetrics.props.children;
 expect(renderToStaticMarkup(await summaryChild.type(summaryChild.props))).toContain('<strong>8</strong>');
 expect(renderToStaticMarkup(await metricsChild.type(metricsChild.props))).toContain('Published content by section');
 expect(loadDashboardContent).toHaveBeenCalledOnce();
 expect(loadDashboardTasks).toHaveBeenCalledWith(req, expect.anything(), expect.anything(), { summaryOnly: true });
});
