import { describe,it,expect,vi,afterEach } from 'vitest';
import {listingEmailAction} from '../features/submissions/listingEmailActions';
function request(overrides:Record<string,unknown>={}){return {method:'POST',url:'https://www.masca.org.au/api/events/7/approval-email',headers:new Headers({origin:'https://www.masca.org.au'}),routeParams:{id:'7'},user:{id:1,email:'editor@masca.org.au'},payload:{secret:'test-secret',findByID:async()=>({id:7,title:'Welcome',contactEmail:'organiser@example.com',_status:'published',reviewStatus:'approved',submissionReceivedAt:'2026-10-01T00:00:00Z'}),find:async(options:{collection:string})=>({docs:options.collection==='listing-emails'?[]:[{id:7}]})},json:async()=>({action:'preview'}),...overrides};}
afterEach(()=>vi.unstubAllEnvs());
describe('approval email endpoint',()=>{
 it('denies signed-out callers',async()=>{expect((await listingEmailAction('events')(request({user:null}) as never))?.status).toBe(401);});
 it('denies editors outside their assigned scope',async()=>{
  vi.stubEnv('WORKSPACE_AUTH_ENABLED','true');
  const req=request({user:{id:1,email:'editor@masca.org.au',status:'active',role:'editor',grants:[{area:'events',scope:'QLD'}]}});
  expect((await listingEmailAction('events')(req as never))?.status).toBe(403);
 });
 it('rejects cross-site sending requests',async()=>{const result=await listingEmailAction('events')(request({headers:new Headers({origin:'https://other.example'})}) as never);expect(result?.status).toBe(403);});
 it('returns a preview without sending or changing a listing',async()=>{const result=await listingEmailAction('events')(request() as never);expect(result?.status).toBe(200);expect(await (result as Response).json()).toMatchObject({to:'organiser@example.com',lastSent:null});});
 it('rejects a stale preview',async()=>{const result=await listingEmailAction('events')(request({json:async()=>({action:'send',version:'stale'})}) as never);expect(result?.status).toBe(409);});
 it('blocks announcement of listings hidden by public access',async()=>{
  const req=request();req.payload.find=async()=>({docs:[]});
  expect((await listingEmailAction('events')(req as never))?.status).toBe(409);
 });
});
it('shows a missing receipt even after the submission is published',async()=>{
 const req=request({method:'GET'});
 req.payload.findByID=async()=>({id:7,title:'Welcome',contactEmail:'organiser@example.com',_status:'published',reviewStatus:'approved',submissionReceivedAt:'2026-10-01T00:00:00Z'});
 const result=await listingEmailAction('events')(req as never);
 expect(await (result as Response).json()).toMatchObject({receipt:{sentAt:null}});
});
it('requires explicit non-delivery confirmation before resolving an expired attempt',async()=>{
 const req=request({json:async()=>({action:'reset-pending',pendingID:1})});
 req.payload.find=async options=>({docs:options.collection==='listing-emails'?[{id:1,kind:'approval',createdAt:'2020-01-01'}]:[{id:7}]} as never);
 expect((await listingEmailAction('events')(req as never))?.status).toBe(409);
});
it('rejects email actions for internal listings even when a contact email is present',async()=>{
 const req=request();req.payload.findByID=async()=>({id:7,title:'Internal',contactEmail:'organiser@example.com',_status:'published',reviewStatus:'approved',submissionReceivedAt:''});
 const result=await listingEmailAction('events')(req as never);
 expect(result?.status).toBe(409);
});
it('labels internal listings without exposing an approval-email action',async()=>{
 const req=request({method:'GET'});req.payload.findByID=async()=>({id:7,title:'Internal',contactEmail:'organiser@example.com',_status:'published',reviewStatus:'approved',submissionReceivedAt:''});
 const result=await listingEmailAction('careers')(req as never);
 expect(await (result as Response).json()).toMatchObject({origin:'internal',lastSent:null,receipt:null});
});
it('allows confirmed non-delivery recovery for an expired resolution email',async()=>{
 const req=request({json:async()=>({action:'reset-pending',pendingID:9,confirmedNotSent:true})});
 const update=vi.fn();Object.assign(req.payload,{update});
 req.payload.find=async options=>({docs:options.collection==='listing-emails'?[{id:9,kind:'change-resolution',key:'change-resolution-3-initial',createdAt:'2020-01-01',email:{}}]:[{id:7}]} as never);
 expect((await listingEmailAction('events')(req as never))?.status).toBe(200);
 expect(update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({kind:'cancelled-change-resolution'})}));
});
