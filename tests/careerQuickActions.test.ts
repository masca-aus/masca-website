import { describe, expect, it, vi } from 'vitest';
import { careerQuickAction } from '@/features/careers/careerQuickActions';
const request = (body: unknown, user: unknown = {id: 1}) => ({user, routeParams: {id:'7'}, query: {}, json: async () => body, payload:{update:vi.fn().mockResolvedValue({id:7,_status:'published'})}});
describe('career publication dropdown', () => {
 it('requires authentication', async () => {
  const req=request({field:'_status',value:'published'},null);
  expect((await careerQuickAction(req as never)).status).toBe(401); expect(req.payload.update).not.toHaveBeenCalled();
 });
 it.each([{field:'title',value:'published'},{field:'_status',value:'anything'}])('rejects invalid actions',async body=>{
  const req=request(body); expect((await careerQuickAction(req as never)).status).toBe(400);expect(req.payload.update).not.toHaveBeenCalled();
 });
 it('publishes with access, lock and collection validation enabled',async()=>{
  const req=request({field:'_status',value:'published'}); await careerQuickAction(req as never);
  expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({collection:'careers',id:'7',req,overrideAccess:false,overrideLock:false,draft:false,data:{_status:'published'}}));
  expect(req.query).toMatchObject({draft:'false'});
 });
 it('unpublishes without replacing content',async()=>{
  const req=request({field:'_status',value:'draft'});await careerQuickAction(req as never);
  expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({unpublishAllLocales:true,data:{_status:'draft'}}));
 });
});
