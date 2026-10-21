import type { PayloadRequest, Where } from 'payload';
import { contentAreas, type ApprovedAccount, type ContentArea, type PermissionArea } from '../access/workspacePolicy.ts';
import { careerListFilter } from '../careers/careerLifecycle.ts';
import { lifecycleIDs } from '../events/eventLifecycle.ts';
import { areaScopes, collectionLink, orderedAreas, type DashboardContext } from './teamDashboard.ts';
import {committeeMode} from '../access/committeePolicy.ts';

export type DashboardContentCount = { area: PermissionArea; count?: number; status: 'ready' | 'unavailable'; href: string };

/** Count live base documents, never their unpublished draft versions. */
export async function loadDashboardContent(req: PayloadRequest, account: ApprovedAccount | undefined, context: DashboardContext): Promise<DashboardContentCount[]> {
  if (!req.user) return [];
  return Promise.all(orderedAreas(account,context.branch).filter(area => committeeMode(account)||contentAreas.includes(area as ContentArea)).map(async area => {
    const clauses: Where[] = [];
    if (contentAreas.includes(area as ContentArea)) {
      const scopes = areaScopes(account, area as ContentArea, context.branch);
      if (account && scopes.length) clauses.push({ owningScope: { in: scopes } });
      else if (context.branch !== 'all') clauses.push({ owningScope: { equals: context.branch } });
    }
    if(committeeMode(account) && !contentAreas.includes(area as ContentArea) && context.branch!=='all') clauses.push({owningScope:{equals:context.branch}});
    const drafts = req.payload.collections[area]?.config.versions;
    if (area === 'events' || area === 'careers' || (drafts && drafts.drafts)) clauses.push({ _status: { equals: 'published' } });
    else if(committeeMode(account)) clauses.push({accessPublished:{equals:true}});
    let where: Where = { and: clauses };
    try {
      if (area === 'events') clauses.push({ id: { not_in: (await lifecycleIDs(req.payload, 'archived', req)).concat(-1) } });
      if (area === 'careers') clauses.push(await careerListFilter({ req: { ...req, query: { ...req.query, careerView: 'active' } } }));
      where = clauses.length ? { and: clauses } : {};
      const result = await req.payload.count({ collection: area, where, req, overrideAccess: false });
      return { area, status: 'ready' as const, count: result.totalDocs, href: collectionLink(area, where) };
    } catch {
      return { area, status: 'unavailable' as const, href: collectionLink(area, clauses.length ? { and: clauses } : undefined) };
    }
  }));
}
