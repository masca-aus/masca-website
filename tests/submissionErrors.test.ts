import {expect,it} from 'vitest';
import {reconcileSubmissionErrors} from '../components/forms/submissionErrors';
it('removes corrected errors while retaining unresolved errors',()=>{
 const response={ok:false,message:'Check fields',fieldErrors:{title:['Missing'],poster:['Too big']}};
 expect(reconcileSubmissionErrors(response,{poster:['Too big'],contactEmail:['Missing']})).toEqual({...response,fieldErrors:{poster:['Too big']}});
 expect(reconcileSubmissionErrors(response,{})).toBeNull();
});
it('clears stale request errors after editing and leaves success alone',()=>{
 expect(reconcileSubmissionErrors({ok:false,message:'Failed'},{})).toBeNull();
 const success={ok:true,message:'Received'};expect(reconcileSubmissionErrors(success,{})).toBe(success);
});
