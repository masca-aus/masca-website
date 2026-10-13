import {it,expect} from 'vitest';
import {newPost} from '../features/mediaCalendar/service';
import {areaScopes,defaultCreationScope,dashboardContext} from '../features/dashboard/teamDashboard';
import {withWorkspaceAuthority} from '../features/access/workspaces/policyContext';
import type {CalendarUser} from '../features/mediaCalendar/types';
const user=withWorkspaceAuthority({id:'1',email:'member@masca.org.au',status:'active',role:'editor',accessModel:'committee',committeeAccessReviewedAt:'2026-01-01',grants:[],committeeMemberships:[{id:'m',committee:'ws-masa',roles:{events:['editor'],mediaCalendar:['editor']},manager:false,expiresAt:'2099-01-01T00:00:00Z'}]} as CalendarUser & {grants:[]},[{id:'ws-masa',status:'active',areas:['events','mediaCalendar']}]);
it('uses custom owners for dashboard counts and creation defaults',()=>{
 expect(areaScopes(user,'events','ws-masa')).toEqual(['ws-masa']);
 expect(defaultCreationScope(user,'events','ws-masa')).toBe('ws-masa');
 expect(dashboardContext(user,'ws-masa').branches).toContain('ws-masa');
});
it('creates a project post only within current authorised tools',()=>{
 expect(newPost(user,{owningScope:'ws-masa',title:'MASA post'}).owningScope).toBe('ws-masa');
 expect(()=>newPost(user,{owningScope:'QLD'})).toThrow();
});
import {mayAccessPost,mayApprove} from '../features/mediaCalendar/policy';
it('legacy broad access never falls back to private project authority',()=>{
 const legacy={...user,accessModel:'legacy' as const,role:'administrator' as const};
 expect(mayAccessPost(legacy,{owningScope:'ws-masa'},'view')).toBe(false);
 expect(mayApprove({...legacy,calendarAccess:{view:true,edit:true,approve:true,designation:'chair'}},{owningScope:'ws-masa',creator:'other',contributors:[]})).toBe(false);
});
