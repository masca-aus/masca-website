import { describe, it, expect } from 'vitest';
import { buildListingEmail, sendOnce, approvalProblem, type SendRecord, type SendStore, type EmailContent } from '../features/submissions/listingEmail';
const doc = { id: 7, title: '<Science night>', contactName: 'Ali', contactEmail: 'ali@example.com', organisation: 'Students', _status: 'published', reviewStatus: 'approved', startDate: '2026-10-20T08:00:00Z', state: 'QLD', venue: 'Hall' };
describe('listing emails', () => {
 it('escapes submitted content and uses the public event link', () => {
  const email = buildListingEmail('events', doc, 'approval');
  expect(email.html).toContain('&lt;Science night&gt;');
  expect(email.html).not.toContain('<Science night>');
  expect(email.text).toContain('https://www.masca.org.au/events');
  expect(email.to).toBe('ali@example.com');
 });
 it('links career approvals to the stable listing slug', () => {
  expect(buildListingEmail('careers', {...doc, slug:'graduate-audit'}, 'approval').text).toContain('https://www.masca.org.au/careers?job=graduate-audit');
 });
 it('keeps receipts pending and describes what happens next', () => {
  const email=buildListingEmail('careers', doc, 'receipt');
  expect(email.text).toContain('awaiting review');
  expect(email.html).toContain('What’s next?');
 });
 it.each(['events','careers'] as const)('uses neutral panels and contrasting image tiles without inversion workarounds for %s', collection => {
  for (const kind of ['receipt','approval'] as const) {
   const { html } = buildListingEmail(collection, doc, kind);
   expect(html).not.toContain('mix-blend-mode');
   expect(html).not.toContain('linear-gradient');
   expect(html).not.toContain('background:#010066');
   expect(html).toContain('background:#f2f2f2;color:#242424');
   if(kind==='receipt') expect(html).toContain('/email/review-tile.png');
   expect(html).toContain('https://www.masca.org.au/logo/logo.png');
  }
 });
 it('refuses approval of drafts, archived records and missing contacts', () => {
  expect(approvalProblem('events', {...doc,_status:'draft'},true)).toBeTruthy();
  expect(approvalProblem('events',doc,false)).toBeTruthy();
  expect(approvalProblem('careers',{...doc,contactEmail:''},true)).toBeTruthy();
  expect(approvalProblem('events',doc,true)).toBeNull();
 });
 it('records acceptance and prevents a second send for the same operation', async () => {
  let record: SendRecord | undefined; let sends=0;
  const store={ get:async()=>record, create:async(value:Parameters<SendStore['create']>[0])=>record={id:1,createdAt:new Date().toISOString(),...value}, markSent:async(_id:number,values:{sentAt:string;providerID:string})=>{record={...record!,...values};} };
  const deliver=async()=>{sends++;return 'provider-1';};
  const email=buildListingEmail('events',doc,'approval');
  await sendOnce(store,deliver,'approval-events-7-initial',email,'editor@masca.org.au');
  await sendOnce(store,deliver,'approval-events-7-initial',email,'editor@masca.org.au');
  expect(sends).toBe(1);expect(record!.sentAt).toBeTruthy();expect(record!.sentBy).toBe('editor@masca.org.au');
 });
 it('retries a failed attempt with its original payload and key', async () => {
  let record:SendRecord | undefined;const deliveries:{payload:EmailContent;key:string}[]=[];
  const store={get:async()=>record,create:async(value:Parameters<SendStore['create']>[0])=>record={id:1,createdAt:new Date().toISOString(),...value},markSent:async(_id:number,values:{sentAt:string;providerID:string})=>{record={...record!,...values};}};
  const email=buildListingEmail('events',doc,'approval');
  await expect(sendOnce(store,async()=>{throw Error('timeout');},'same-key',email,'editor')).rejects.toThrow();
  expect(record!.sentAt).toBeUndefined();
  await sendOnce(store,async(payload,key)=>{deliveries.push({payload,key});return 'id';},'same-key',{...email,to:'changed@example.com'},'editor');
  expect(deliveries[0].payload.to).toBe('ali@example.com');expect(deliveries[0].key).toBe('same-key');
 });
 it('does not retry uncertain attempts after provider deduplication expires', async()=>{
  const store={get:async()=>({id:1,createdAt:'2020-01-01',email:buildListingEmail('events',doc,'approval')}),create:async()=>{throw Error();},markSent:async()=>{}};
  await expect(sendOnce(store,async()=>{throw Error('must not send');},'old',buildListingEmail('events',doc,'approval'),'editor')).rejects.toThrow('check Resend');
 });
});

describe('concurrent sends and uncertain delivery',()=>{
 it('reuses the stored key after an accepted email could not be recorded',async()=>{
  let record:SendRecord | undefined;let writes=0;const keys:string[]=[];
  const store={get:async()=>record,create:async(value:Parameters<SendStore['create']>[0])=>record={id:1,createdAt:new Date().toISOString(),...value},markSent:async(_id:number,values:{sentAt:string;providerID:string})=>{writes++;if(writes===1)throw Error('database');record={...record!,...values};}};
  const deliver=async(_email:EmailContent,key:string)=>{keys.push(key);return 'accepted-id';};
  const email=buildListingEmail('events',doc,'approval');
  await expect(sendOnce(store,deliver,'stable',email,'editor')).rejects.toThrow('database');
  await sendOnce(store,deliver,'stable',email,'editor');
  expect(keys).toEqual(['stable','stable']);expect(record!.providerID).toBe('accepted-id');
 });
});
