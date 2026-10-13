import {it,expect} from 'vitest';
import {mayAccessResource,mayDelegateMemberships,validMemberships,type CommitteeAccount} from '../features/access/committeePolicy';
import {withWorkspaceAuthority} from '../features/access/workspaces/policyContext';
const catalog=[{id:'ws-masa',status:'active' as const,areas:['events' as const]},{id:'QLD',status:'active' as const,areas:['events' as const]}];
const member={id:'m',committee:'ws-masa',roles:{events:['editor' as const]},expiresAt:'2099-01-01T00:00:00Z',manager:false};
const person:CommitteeAccount={id:'1',email:'person@masca.org.au',role:'editor',status:'active',accessModel:'committee',committeeAccessReviewedAt:'2026-01-01',committeeMemberships:[member]};
it('grants only the enabled owned project area',()=>{
 const a=withWorkspaceAuthority(person,catalog);
 expect(mayAccessResource(a,{area:'events',owningScope:'ws-masa'},'edit')).toBe(true);
 expect(mayAccessResource(a,{area:'events',owningScope:'QLD'},'edit')).toBe(false);
 expect(mayAccessResource(a,{area:'careers',owningScope:'ws-masa'},'edit')).toBe(false);
 expect(mayAccessResource(person,{area:'events',owningScope:'ws-masa'},'edit')).toBe(false);
});
it('archive revokes membership and explicit shared-record rights',()=>{
 const a=withWorkspaceAuthority(person,catalog.map(w=>({...w,status:'archived' as const})));
 expect(mayAccessResource(a,{area:'events',owningScope:'ws-masa',sharedWith:[{userId:'1',role:'editor'}]},'view')).toBe(false);
 expect(validMemberships([member],catalog)).toBe(true);
 expect(validMemberships([{...member,committee:'unknown'}],catalog)).toBe(false);
});
it('platform management grants no content rights',()=>{
 expect(mayAccessResource(withWorkspaceAuthority({...person,role:'administrator',committeeMemberships:[]},catalog),{area:'events',owningScope:'ws-masa'},'edit')).toBe(false);
});
it('rejects a foreign project edit hidden in an array',()=>{
 const actor=withWorkspaceAuthority({...person,committeeMemberships:[{...member,committee:'QLD',manager:true}]},catalog);
 expect(mayDelegateMemberships(actor,[member],[{...member,roles:{events:['approver']}}],'2')).toBe(false);
});
