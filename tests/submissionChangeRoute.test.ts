import {NextRequest} from 'next/server';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createChangeToken} from '../features/submissions/listingChanges';
const mocks=vi.hoisted(()=>({getPayload:vi.fn(),send:vi.fn().mockResolvedValue('provider-id')}));
vi.mock('server-only',()=>({}));
vi.mock('payload',()=>({getPayload:mocks.getPayload}));
vi.mock('@payload-config',()=>({default:{}}));
vi.mock('../features/submissions/listingEmailActions',async importOriginal=>({...await importOriginal<typeof import('../features/submissions/listingEmailActions')>(),deliver:mocks.send}));
import {POST} from '../app/(frontend)/api/submission-change/route';
const doc={id:7,title:'Welcome',contactEmail:'organiser@example.com',submissionReceivedAt:'2026-10-01'};
const secret='test-secret';
let outbox:Record<string,unknown>|undefined;
const payload={secret,findByID:vi.fn(),find:vi.fn(),create:vi.fn(),update:vi.fn(),logger:{warn:vi.fn()}};
function request(body:unknown,origin='https://masca.org.au'){return new NextRequest('https://masca.org.au/api/submission-change',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{outbox=undefined;vi.clearAllMocks();mocks.getPayload.mockResolvedValue(payload);payload.findByID.mockResolvedValue(doc);payload.find.mockImplementation(async({collection})=>({docs:collection==='listing-emails'&&outbox?[outbox]:[]}));payload.create.mockImplementation(async({data})=>{outbox={id:4,createdAt:new Date().toISOString(),...data};return outbox;});payload.update.mockImplementation(async({data})=>{outbox={...outbox,...data};});});
describe('public change request route',()=>{
 it('rejects cross-site calls and invalid tokens without revealing listing details',async()=>{
  expect((await POST(request({action:'inspect',token:'bad'},'https://attacker.example'))).status).toBe(403);
  const result=await POST(request({action:'inspect',token:'bad'}));expect(result.status).toBe(410);expect(await result.text()).not.toContain(doc.title);expect(payload.findByID).not.toHaveBeenCalled();
 });
 it('shows only the title and open request, not contact details or the unpublished listing',async()=>{
  const result=await POST(request({action:'inspect',token:createChangeToken('events',doc,secret)}));
  expect(await result.json()).toEqual({title:'Welcome',open:null});expect(result.headers.get('Cache-Control')).toBe('no-store');
 });
 it('renews an expired link only to the recorded contact and deduplicates repeated requests',async()=>{
  const token=createChangeToken('events',doc,secret,Date.now()-91*86400000);
  expect((await POST(request({action:'inspect',token}))).status).toBe(410);
  const body={action:'renew',token,email:'attacker@example.com'};
  expect((await POST(request(body))).status).toBe(200);expect((await POST(request(body))).status).toBe(200);
  expect(mocks.send).toHaveBeenCalledOnce();expect(mocks.send.mock.calls[0][0].to).toBe(doc.contactEmail);
 });
});
