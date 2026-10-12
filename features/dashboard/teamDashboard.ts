import { contentAreas, ownershipScopes, permissionsFor, mayManage, mayManageSharedContent, mayView, type ApprovedAccount, type ContentArea, type OwnershipScope, type PermissionArea } from '../access/workspacePolicy.ts';
import { COMMITTEE_DEPARTMENTS } from '../../utils/committeeDepartments.js';
import type { Where } from 'payload';

export const standardAreas: PermissionArea[] = ['careers', 'events', 'committee', 'sponsors', 'organisations', 'media'];
const priorities: Record<string, PermissionArea[]> = {
  careers: ['careers'], amplifies: ['media', 'events'], cares: ['events'], unites: ['events'],
  treasury: ['sponsors'], secretariat: ['committee', 'organisations'],
};
export function dashboardContext(account?: ApprovedAccount, requestedBranch?: unknown) {
  const branches = ownershipScopes.filter(scope => !account || contentAreas.some(area => mayManage(account, area, scope)));
  const branch: 'all' | OwnershipScope = typeof requestedBranch === 'string' && branches.includes(requestedBranch as OwnershipScope)
    ? requestedBranch as OwnershipScope : 'all';
  const departments = [...new Set(account?.departments ?? [])].flatMap(value => {
    const department = COMMITTEE_DEPARTMENTS.find(item => item.value === value);
    return department ? [{ label: department.label, value: department.value }] : [];
  });
  return { branches, branch, departments };
}
export type DashboardContext = ReturnType<typeof dashboardContext>;
export function areaScopes(account: ApprovedAccount | undefined, area: ContentArea, branch: 'all' | OwnershipScope): OwnershipScope[] {
  return ownershipScopes.filter(scope => (branch === 'all' || branch === scope) && (!account || mayManage(account, area, scope)));
}
export function orderedAreas(account?: ApprovedAccount): PermissionArea[] {
  const departments = account?.departments ?? [];
  const preferred = departments.includes('chairs') ? [] : departments.flatMap(department => priorities[department] ?? []);
  return [...new Set([...preferred, ...standardAreas])].filter(area => !account || mayView(account, area));
}
/** Encode the exact same Where used for counts, including arrays and nested conjunctions. */
export function collectionLink(area: PermissionArea, where?: Where) {
  const params = new URLSearchParams();
  function append(key: string, value: unknown) {
    if (value !== null && typeof value === 'object') {
      for (const [child, item] of Object.entries(value)) append(`${key}[${child}]`, item);
    } else if (value !== undefined) params.append(key, String(value));
  }
  if (where) append('where', where);
  return `/admin/collections/${area}${params.size ? `?${params}` : ''}`;
}
export function defaultCreationScope(account: ApprovedAccount | null | undefined, area: ContentArea, requestedBranch?: unknown): OwnershipScope | undefined {
  if (typeof requestedBranch === 'string' && ownershipScopes.includes(requestedBranch as OwnershipScope) && mayManage(account, area, requestedBranch as OwnershipScope)) return requestedBranch as OwnershipScope;
  if (mayManageSharedContent(account)) return 'National';
  return permissionsFor(account)[area]?.scopes.find(scope => mayManage(account, area, scope));
}
