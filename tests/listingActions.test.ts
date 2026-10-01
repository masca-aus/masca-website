import { describe,it,expect,vi } from 'vitest';
import { duplicateData,listingAction } from '../features/submissions/listingActions';
import { deriveCMSStatus } from '../features/admin/cmsStatus';
describe('listing workflow',()=>{
 it.each(['events','careers'] as const)('copies only reusable %s content into a private draft',collection=>{
 const copy=duplicateData(collection,{title:'Example',owningScope:'QLD',_status:'published',submittedForReview:true,contactEmail:'private@example.com',internalNotes:'private',sourceKey:'import-1',slug:'original',startDate:'2026-01-01',added:'2026-01-01',closes:'2026-02-01',needsChanges:true,reviewNotes:'fix'});
 expect(copy).toMatchObject({_status:'draft',submittedForReview:false,owningScope:'QLD',needsChanges:false,reviewNotes:null});
 expect(copy.internalNotes).toBeUndefined();expect(copy.slug).toBeUndefined();expect(copy.sourceKey).toBeUndefined();expect(copy.contactEmail).toBeNull();
 expect(collection==='events'?copy.startDate:copy.added).toBeNull();
 });
 it('denies anonymous actions',async()=>{const response=await listingAction('events')({user:null} as never);expect(response?.status).toBe(401);});
 it('requires a review note without writing',async()=>{
 const update=vi.fn();const req={user:{id:1},routeParams:{id:'1'},payload:{findByID:vi.fn().mockResolvedValue({submittedForReview:true,_status:'draft'}),update},json:async()=>({action:'needs-changes',note:'  '}),query:{}};
 const result=await listingAction('careers')(req as never);expect(result?.status).toBe(400);expect(update).not.toHaveBeenCalled();
 });
 it('does not mark a live listing as needing changes',async()=>{
 const update=vi.fn();const req={user:{id:1},routeParams:{id:'1'},payload:{findByID:vi.fn().mockResolvedValue({submittedForReview:true,_status:'published'}),update},json:async()=>({action:'needs-changes',note:'Fix date'}),query:{}};
 const result=await listingAction('careers')(req as never);expect(result?.status).toBe(409);expect(update).not.toHaveBeenCalled();
 });
 it('shows needs changes only for an unpublished submission',()=>{
 expect(deriveCMSStatus('careers',{submittedForReview:true,needsChanges:true},{_status:'draft'},'active').status).toBe('changes');
 expect(deriveCMSStatus('careers',{submittedForReview:true,needsChanges:true},{_status:'published'},'active').status).toBe('published');
 });
});
