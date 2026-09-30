import { expect, it } from 'vitest';
import { deriveCMSStatus, statusActions } from '../features/admin/cmsStatus';
it('distinguishes public submissions from internal drafts in both collections', () => {
 for(const collection of ['events','careers'] as const) {
  const submitted = {_status:'draft',submittedForReview:true};
  const state=deriveCMSStatus(collection,submitted,submitted,'active');
  expect(state.status).toBe('review');
  expect(statusActions(collection,state)).toContainEqual({value:'publish',label:'Approve & publish'});
  expect(deriveCMSStatus(collection,{_status:'draft'},{_status:'draft'},'active').status).toBe('draft');
  expect(deriveCMSStatus(collection,submitted,submitted,'archived').status).toBe('archived');
 }
});
