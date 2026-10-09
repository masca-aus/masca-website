import {describe,it,expect,vi} from 'vitest';
import {createChangeToken,verifyChangeToken,submitChangeRequest} from '../features/submissions/listingChanges';
const doc={id:7,title:'Community night',contactEmail:'organiser@example.com',submissionReceivedAt:'2026-10-01T00:00:00Z'};
const secret='test-secret';
describe('private change links',()=>{
 it('binds a signed link to a listing and recipient, with an expiry',()=>{
  const token=createChangeToken('events',doc,secret,1000);
  expect(verifyChangeToken(token,secret,1001)).toMatchObject({collection:'events',id:'7',emailHash:expect.any(String)});
  expect(verifyChangeToken(token+'x',secret,1001)).toBeNull();
  expect(verifyChangeToken(token,'another-secret',1001)).toBeNull();
  expect(verifyChangeToken(token,secret,1000+91*86400000)).toBeNull();
 });
 it('stores a request separately and deduplicates concurrent submissions',async()=>{
  const create=vi.fn().mockResolvedValue({id:2,message:'Please change the venue.'});
  const payload={secret,findByID:vi.fn().mockResolvedValue(doc),find:vi.fn().mockResolvedValue({docs:[]}),create,update:vi.fn()};
  const token=createChangeToken('events',doc,secret);
  expect(await submitChangeRequest(payload as never,token,'Please change the venue.')).toMatchObject({id:2});
  expect(create.mock.calls[0][0]).toMatchObject({collection:'listing-change-requests',data:{openKey:'events:7',message:'Please change the venue.'}});
  expect(payload.update).not.toHaveBeenCalled();
  payload.find.mockResolvedValue({docs:[{id:2,message:'Please change the venue.'}]});
  await submitChangeRequest(payload as never,token,'Another request');
  expect(create).toHaveBeenCalledTimes(1);
 });
 it('rejects a link after the contact changes or for an internal listing',async()=>{
  const token=createChangeToken('events',doc,secret);
  const payload={secret,findByID:vi.fn().mockResolvedValue({...doc,contactEmail:'new@example.com'})};
  await expect(submitChangeRequest(payload as never,token,'Please update the venue.')).rejects.toThrow('link');
  payload.findByID.mockResolvedValue({...doc,submissionReceivedAt:null});
  await expect(submitChangeRequest(payload as never,token,'Please update the venue.')).rejects.toThrow('link');
 });
 it('limits request text and rejects invalid links before looking up listings',async()=>{
  const payload={secret,findByID:vi.fn()};
  await expect(submitChangeRequest(payload as never,'bad','A real request')).rejects.toThrow('link');
  expect(payload.findByID).not.toHaveBeenCalled();
  await expect(submitChangeRequest(payload as never,createChangeToken('events',doc,secret),'x')).rejects.toThrow('10');
 });
});
