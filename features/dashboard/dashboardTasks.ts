import type { PayloadRequest, Where } from 'payload';
import type { ApprovedAccount } from '../access/workspacePolicy.ts';
import { lifecycleIDs } from '../events/eventLifecycle.ts';
import { careerListFilter } from '../careers/careerLifecycle.ts';
import { areaScopes, collectionLink, type DashboardContext } from './teamDashboard.ts';
export type DashboardDraft = { id: string | number; title: string; updatedAt?: string | null; area: 'events' | 'careers' };
export type DashboardTask = { area: 'events' | 'careers'; status: 'ready' | 'unavailable'; drafts?: number; pending?: number; draftHref: string; reviewHref: string; recentDrafts: DashboardDraft[] };

/** Task queues are editable work, narrower than the CMS's permitted read access. */
export async function loadDashboardTasks(req: PayloadRequest, account: ApprovedAccount | undefined, context: DashboardContext, { summaryOnly = false }: { summaryOnly?: boolean } = {}): Promise<DashboardTask[]> {
  if (!req.user) return [];
  const areas = (['events', 'careers'] as const).filter(area => areaScopes(account, area, context.branch).length > 0);
  return Promise.all(areas.map(async area => {
    const scopes = areaScopes(account, area, context.branch);
    const scope: Where[] = account ? [{ owningScope: { in: scopes } }] : [];
    let base: Where[] = [...scope];
    function filters() {
      return {
        draftWhere: { and: [...base], _status: { equals: 'draft' } } as Where,
        reviewWhere: { and: [...base], submittedForReview: { equals: true }, _status: { equals: 'draft' } } as Where,
      };
    }
    try {
      const lifecycle: Where = area === 'events'
        ? { id: { not_in: (await lifecycleIDs(req.payload, 'archived', req)).concat(-1) } }
        : await careerListFilter({ req: { ...req, query: { ...req.query, careerView: 'active' } } });
      base = [lifecycle, ...scope];
      const { draftWhere, reviewWhere } = filters();
      const shared = { collection: area, req, overrideAccess: false, draft: true } as const;
      // Payload count reads base records, not latest drafts. find.totalDocs matches the admin list.
      const [pending, recent] = await Promise.all([
        req.payload.find({ ...shared, where: reviewWhere, limit: 1, depth: 0, select: { _status: true }, sort: 'id' }),
        req.payload.find({ ...shared, where: draftWhere, sort: summaryOnly ? 'id' : '-updatedAt', limit: summaryOnly ? 1 : 3, depth: 0, select: summaryOnly ? { _status: true } : { title: true, updatedAt: true } }),
      ]);
      return {
        area, status: 'ready' as const, drafts: recent.totalDocs, pending: pending.totalDocs,
        draftHref: collectionLink(area, draftWhere), reviewHref: collectionLink(area, reviewWhere),
        recentDrafts: summaryOnly ? [] : recent.docs.map(doc => ({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt, area })),
      };
    } catch {
      const { draftWhere, reviewWhere } = filters();
      return { area, status: 'unavailable' as const, draftHref: collectionLink(area, draftWhere), reviewHref: collectionLink(area, reviewWhere), recentDrafts: [] };
    }
  }));
}
