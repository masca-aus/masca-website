import {describe,it,expect,vi,afterEach} from 'vitest';
import {changeRequestAction} from '../features/submissions/changeRequestActions';
const mocks=vi.hoisted(()=>({send:vi.fn().mockResolvedValue('provider-id')}));
vi.mock('../features/submissions/listingEmailActions',async importOriginal=>({...await importOriginal<typeof import('../features/submissions/listingEmailActions')>(),deliver:mocks.send}));
const doc={id:7,title:'Welcome',contactEmail:'organiser@example.com',submissionReceivedAt:'2026-10-01',owningScope:'QLD',_status:'draft'};
const open={id:3,status:'open',message:'Please change the venue.',createdAt:'2026-10-08T00:00:00Z'};
function request(){return {method:'POST',url:'https://masca.org.au/api/events/7/change-requests',headers:new Headers({origin:'https://masca.org.au'}),routeParams:{id:'7'},user:{id:1,email:'editor@masca.org.au'},payload:{secret:'test-secret',findByID:vi.fn().mockResolvedValue(doc),find:vi.fn(async({collection}:{collection:string})=>({docs:collection==='listing-change-requests'?[open]:[]})),create:vi.fn(async({data}:{data:unknown})=>({id:10,createdAt:new Date().toISOString(),...data as object})),update:vi.fn()},json:vi.fn().mockResolvedValue({action:'preview',requestID:3,resolution:'We have corrected the venue as requested.'})};}
afterEach(()=>{vi.unstubAllEnvs();mocks.send.mockClear();});
describe('staff change request actions',()=>{
 it('requires authentication and the listing editing scope',async()=>{
  const req=request();expect((await changeRequestAction('events')({...req,user:null} as never))?.status).toBe(401);
  vi.stubEnv('WORKSPACE_AUTH_ENABLED','true');
  expect((await changeRequestAction('events')({...req,user:{id:1,email:'editor@masca.org.au',status:'active',role:'editor',grants:[{area:'events',scope:'NSW'}]}} as never))?.status).toBe(403);
 });
 it('previews the actual outcome without changing a listing or sending',async()=>{
  const req=request();const response=await changeRequestAction('events')(req as never);
  expect(await (response as Response).json()).toMatchObject({to:doc.contactEmail,subject:expect.stringContaining('Update on your event'),text:expect.stringContaining('corrected the venue')});
  expect(req.payload.update).not.toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
 });
 it('rejects cross-site resolution and stale previews',async()=>{
  const req=request();req.headers.set('origin','https://attacker.example');expect((await changeRequestAction('events')(req as never))?.status).toBe(403);
  req.headers.set('origin','https://masca.org.au');req.json.mockResolvedValue({action:'resolve',requestID:3,resolution:'We corrected the venue.',confirmedReviewed:true,version:'stale'});
  expect((await changeRequestAction('events')(req as never))?.status).toBe(409);expect(mocks.send).not.toHaveBeenCalled();
 });
 it('sends only after confirmation and resolves the request without updating the listing',async()=>{
  const req=request();const preview=await (await changeRequestAction('events')(req as never) as Response).json();
  req.json.mockResolvedValue({action:'resolve',requestID:3,resolution:'We have corrected the venue as requested.',confirmedReviewed:true,version:preview.version});
  const response=await changeRequestAction('events')(req as never);expect(response?.status).toBe(200);
  expect(mocks.send).toHaveBeenCalledOnce();expect(req.payload.update.mock.calls.map(call=>call[0].collection)).toEqual(['listing-emails','listing-change-requests']);
  expect(req.payload.update.mock.calls[1][0]).toMatchObject({data:{status:'resolved',openKey:'resolved:3',resolvedBy:'editor@masca.org.au'}});
 });
 it('does not overwrite a competing outcome when the outbox already accepted different content',async()=>{
  const req=request();const preview=await (await changeRequestAction('events')(req as never) as Response).json();
  req.payload.create.mockImplementationOnce(async({data})=>({id:10,createdAt:new Date().toISOString(),...data as object,email:{to:doc.contactEmail,subject:'Other editor outcome',html:'Other outcome',text:'Other outcome'}}));
  req.json.mockResolvedValue({action:'resolve',requestID:3,resolution:'We have corrected the venue as requested.',confirmedReviewed:true,version:preview.version});
  expect((await changeRequestAction('events')(req as never))?.status).toBe(409);
  expect(req.payload.update.mock.calls.some(call=>call[0].collection==='listing-change-requests')).toBe(false);
 });
 it('keeps the request open when email delivery fails',async()=>{
  const req=request();const preview=await (await changeRequestAction('events')(req as never) as Response).json();
  mocks.send.mockRejectedValueOnce(Error('Delivery unavailable'));
  req.json.mockResolvedValue({action:'resolve',requestID:3,resolution:'We have corrected the venue as requested.',confirmedReviewed:true,version:preview.version});
  expect((await changeRequestAction('events')(req as never))?.status).toBe(503);expect(req.payload.update).not.toHaveBeenCalled();
 });
});
it('gives an old request a fresh private link when its outcome is prepared',async()=>{
 const req=request();req.payload.find.mockImplementation(async({collection})=>({docs:collection==='listing-change-requests'?[{...open,createdAt:'2020-01-01'}]:[]}));
 const result=await (await changeRequestAction('events')(req as never) as Response).json();
 const token=result.html.match(/#token=([^"<]+)/)[1];
 const claims=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString());
 expect(claims.expires).toBeGreaterThan(Date.now()+89*86400000);
});
it('finalizes a confirmed send using its original outcome even after listing details change',async()=>{
 const req=request();const preview=await (await changeRequestAction('events')(req as never) as Response).json();
 const record={id:10,key:'change-resolution-3-initial',kind:'change-resolution',createdAt:new Date().toISOString(),sentAt:new Date().toISOString(),sentBy:'first-editor@masca.org.au',email:{to:preview.to,subject:preview.subject,html:preview.html,text:preview.text,outcome:preview.outcome}};
 req.payload.findByID.mockResolvedValue({...doc,title:'Changed after delivery'});
 req.payload.find.mockImplementation(async({collection})=>({docs:collection==='listing-change-requests'?[open]:[record]} as never));
 const recordedPreview=await (await changeRequestAction('events')(req as never) as Response).json();
 expect(recordedPreview.subject).toBe(preview.subject);
 req.json.mockResolvedValue({action:'resolve',requestID:3,resolution:'A different note that must not overwrite the sent outcome.',confirmedReviewed:true,version:recordedPreview.version});
 expect((await changeRequestAction('events')(req as never))?.status).toBe(200);expect(mocks.send).not.toHaveBeenCalled();
 expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({resolution:preview.outcome,resolvedBy:'first-editor@masca.org.au'})}));
});
