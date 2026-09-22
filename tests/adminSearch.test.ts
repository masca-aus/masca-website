import { describe, expect, it } from 'vitest';
import { searchWhere, searchTerms, rankMatches } from '@/features/admin/adminSearch';
describe('CMS search', () => {
 it('combines words across fields rather than requiring a phrase in one field', () => {
  expect(searchWhere('careers', ' engineering   Melbourne ')).toEqual({ and: [
   { or: expect.arrayContaining([{ title: { contains: 'engineering' } }, { industry: { contains: 'engineering' } }]) },
   { or: expect.arrayContaining([{ title: { contains: 'Melbourne' } }, { city: { contains: 'Melbourne' } }]) },
  ] });
 });
 it('ignores whitespace and duplicate words', () => {
  expect(searchTerms('  Data DATA science ')).toEqual(['Data','science']);
  expect(searchWhere('events','   ')).toEqual({});
 });
 it('matches department labels without applying substring operators to enums', () => {
  expect(searchWhere('committee','treas')).toEqual({ and: [{ or: expect.arrayContaining([{ department: { in: ['treasury'] } }]) }] });
 });
 it('ranks title matches globally, keeping ties in their original order', () => {
  const docs=[{id:1,title:'Developer'},{id:2,title:'Engineering Melbourne'},{id:3,title:'Engineering internship'},{id:4,title:'Engineering placement'}];
  expect(rankMatches(docs,'title',['engineering','Melbourne']).map(d=>d.id)).toEqual([2,3,4,1]);
 });
 it('searches only configured public-facing fields', () => {
  const query=JSON.stringify(searchWhere('events','secret'));
  expect(query).not.toContain('internalNotes');expect(query).not.toContain('contactEmail');
  expect(searchWhere('sponsors','CPA')).toEqual({and:[{or:[{name:{contains:'CPA'}}]}]});
 });
});

it('preserves list boundaries and custom sorting', async () => {
 const { withAdminSearch, adminSearchHooks } = await import('@/features/admin/adminSearch');
 const config={slug:'careers',defaultSort:'-added'};
 const req={user:{id:1},query:{search:'engineer Melbourne',sort:'company'},payload:{collections:{careers:{config}}}};
 const filter=withAdminSearch('careers',async()=>({id:{not_in:[99]}}));
 const where=await filter({req,limit:10,page:1,sort:'company'} as never);
 expect(where).toMatchObject({and:[{id:{not_in:[99]}},expect.any(Object)]});
 const args={collection:{config},req,limit:10,page:1,select:{title:true},where};
 await adminSearchHooks.beforeOperation[0]({args,operation:'read',req} as never);
 expect(args.limit).toBe(10);
});
it('ranks before pagination and hydrates only the requested page', async () => {
 const { withAdminSearch, adminSearchHooks } = await import('@/features/admin/adminSearch');
 const config={slug:'careers',defaultSort:'-added'};
 const calls:unknown[]=[];
 const req={user:{id:1},query:{search:'engineering',sort:'-added'},payload:{collections:{careers:{config}},find:async(options:unknown)=>{calls.push(options);return {docs:[{id:2,title:'Engineering',cmsStatus:{status:'draft'}}]};}}};
 const where=await withAdminSearch('careers')({req,limit:1,page:1,sort:'-added'} as never);
 const args={collection:{config},req,limit:1,page:1,select:{title:true,cmsStatus:true},where};
 await adminSearchHooks.beforeOperation[0]({args,operation:'read',req} as never);
 expect(args.limit).toBe(0);expect(args.select).toEqual({title:true});
 const result=await adminSearchHooks.afterOperation[0]({args,operation:'find',req,result:{docs:[{id:1,title:'Developer'},{id:2,title:'Engineering'}]}} as never);
 expect(result).toMatchObject({docs:[{id:2}],totalDocs:2,totalPages:2,hasNextPage:true,nextPage:2});
 expect(calls[0]).toMatchObject({select:{title:true,cmsStatus:true},where:{and:[where,{id:{in:[2]}}]}});
});
it('removes only the appended native phrase and preserves existing filters', async () => {
 const { removeNativePhrase, adminSearchFields } = await import('@/features/admin/adminSearch');
 const filter={company:{equals:'MASCA'}};
 const native={or:adminSearchFields.careers.map(field=>({[field]:{like:'engineer melb'}}))};
 expect(removeNativePhrase({and:[filter,native]},'careers','engineer melb')).toEqual({and:[filter]});
 expect(removeNativePhrase({and:[filter]},'careers','engineer melb')).toEqual({and:[filter]});
});
