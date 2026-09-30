import { describe, expect, it } from 'vitest';
import { configureWorkspace } from '../features/access/configureWorkspace';
import { publicEventSubmission, publicCareerSubmission } from '../features/access/publicSubmissionContext';
const collection = configureWorkspace([{slug:'events',fields:[]}])[0];
const hook = collection.hooks!.beforeChange!.at(-1)!;
function run(token: unknown, operation = 'create', status = 'draft') {
 const args = {data:{owningScope:'National',reviewStatus:'pending',_status:status},req:{user:null},context:{publicEventSubmission:token},operation};
 return hook(args as unknown as Parameters<typeof hook>[0]);
}
describe('Public submissions under Workspace authentication', () => {
 it('accepts a trusted pending draft', () => {
  expect(run(publicEventSubmission)).toMatchObject({_status:'draft',owningScope:'National'});
 });
 it('rejects client-forged context', () => {
  expect(()=>run(true)).toThrow('You cannot manage');
  expect(()=>run('publicEventSubmission')).toThrow('You cannot manage');
 });
 it('does not permit updates or publication', () => {
  expect(()=>run(publicEventSubmission,'update')).toThrow('You cannot manage');
  expect(()=>run(publicEventSubmission,'create','published')).toThrow('You cannot manage');
 });
});

it('permits only trusted career drafts in the national review queue', () => {
 const hook=configureWorkspace([{slug:'careers',fields:[]}])[0].hooks!.beforeChange!.at(-1)!;
 const args={data:{owningScope:'National',submittedForReview:true,_status:'draft'},req:{user:null},context:{publicCareerSubmission},operation:'create'};
 expect(hook(args as never)).toEqual(args.data);
 for(const change of [{operation:'update'},{context:{publicCareerSubmission:true}},{data:{...args.data,_status:'published'}},{data:{...args.data,owningScope:'QLD'}}]) expect(()=>hook({...args,...change} as never)).toThrow('You cannot manage');
});
