import { describe, expect, it } from 'vitest';
import { dashboardContext, areaScopes, orderedAreas, collectionLink, defaultCreationScope } from '@/features/dashboard/teamDashboard';
import { mayManage, type ApprovedAccount } from '@/features/access/workspacePolicy';
const editor: ApprovedAccount = { email: 'member@masca.org.au', status: 'active', role: 'editor', grants: [],
  departments: ['careers', 'amplifies'], permissions: {
    careers: { view: true, edit: true, scopes: ['QLD'] }, events: { view: true, edit: true, scopes: ['VIC'] },
    media: { view: true, edit: false, scopes: [] }, sponsors: { view: false, edit: false, scopes: [] },
  } };
describe('team dashboard personalisation', () => {
  it('combines department priorities without duplicates and hides inaccessible tools', () => {
    expect(orderedAreas(editor)).toEqual(['careers', 'media', 'events']);
    expect(orderedAreas({ ...editor, departments: ['amplifies', 'careers', 'amplifies'] })).toEqual(['media', 'events', 'careers']);
  });
  it('keeps the standard order for chairs and existing unassigned accounts', () => {
    expect(orderedAreas({ ...editor, departments: ['chairs', 'amplifies'] })).toEqual(['careers', 'events', 'media']);
    expect(orderedAreas({ ...editor, departments: undefined })).toEqual(['careers', 'events', 'media']);
  });
  it('never grants editing rights because of a department or a branch query', () => {
    const context = dashboardContext(editor, 'QLD');
    expect(context.branches).toEqual(['QLD', 'VIC']);
    expect(areaScopes(editor, 'careers', context.branch)).toEqual(['QLD']);
    expect(areaScopes(editor, 'events', context.branch)).toEqual([]);
    expect(mayManage(editor, 'events', 'QLD')).toBe(false);
    expect(dashboardContext(editor, 'WA').branch).toBe('all');
    expect(dashboardContext(editor, ['QLD', 'VIC']).branch).toBe('all');
  });
  it('offers all branches to administrators and all-content editors, but none to viewers or suspended accounts', () => {
    expect(dashboardContext({ ...editor, role: 'administrator' }, 'WA').branches).toHaveLength(9);
    expect(dashboardContext({ ...editor, allContentAccess: true }, 'WA').branch).toBe('WA');
    expect(dashboardContext({ ...editor, permissions: { careers: { view: true, edit: false, scopes: [] } } }).branches).toEqual([]);
    expect(orderedAreas({ ...editor, status: 'suspended' })).toEqual([]);
    expect(dashboardContext({ ...editor, status: 'suspended' }, 'QLD').branches).toEqual([]);
  });
  it('creates collection filters that preserve all task conditions, including excluded lifecycle records and scope', () => {
    const url = new URL(collectionLink('events', { and: [{ id: { not_in: [4, 5] } }, { owningScope: { in: ['VIC'] } }, { _status: { equals: 'draft' } }] }), 'https://cms.example');
    expect(url.pathname).toBe('/admin/collections/events');
    expect(url.searchParams.get('where[and][0][id][not_in][0]')).toBe('4');
    expect(url.searchParams.get('where[and][1][owningScope][in][0]')).toBe('VIC');
    expect(url.searchParams.get('where[and][2][_status][equals]')).toBe('draft');
  });
  it('prefills creation only with an authorised selected branch and retains the existing fallback', () => {
    expect(defaultCreationScope(editor, 'careers', 'QLD')).toBe('QLD');
    expect(defaultCreationScope(editor, 'events', 'QLD')).toBe('VIC');
    expect(defaultCreationScope({ ...editor, permissions: { events: { view: true, edit: true, scopes: ['VIC', 'QLD'] } } }, 'events', 'all')).toBe('VIC');
    expect(defaultCreationScope({ ...editor, role: 'administrator' }, 'events', 'WA')).toBe('WA');
    expect(defaultCreationScope({ ...editor, status: 'suspended' }, 'events', 'VIC')).toBeUndefined();
  });
});
