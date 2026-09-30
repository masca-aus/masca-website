import { describe, expect, it } from 'vitest';
import { configureWorkspace } from '../features/access/configureWorkspace';
import { publicEventSubmission } from '../features/access/publicSubmissionContext';
const collection = configureWorkspace([{slug:'events',fields:[]}])[0];
const hook = collection.hooks!.beforeChange!.at(-1)!;
function run(token: unknown, operation = 'create', status = 'draft') {
 const args = {data:{owningScope:'National',reviewStatus:'pending',_status:status},req:{user:null},context:{publicEventSubmission:token},operation};
 return hook(args as Parameters<typeof hook>[0]);
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
