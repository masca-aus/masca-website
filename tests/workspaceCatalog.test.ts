import { describe,it,expect } from 'vitest';
import { validateWorkspace, legacyWorkspaces } from '../features/access/workspaces/repository';
describe('workspace catalogue input',()=>{
 it('seeds exact legacy owners without guessing terms',()=>{
  expect(legacyWorkspaces().map(w=>w.id)).toEqual(['National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT']);
  expect(legacyWorkspaces().every(w=>w.termEnd===null && w.areas.includes('events'))).toBe(true);
 });
 it('normalises names while rejecting unknown tools and malformed terms',()=>{
  expect(validateWorkspace({name:' MASA ',kind:'project',areas:['events'],termEnd:null,sponsorId:null}).name).toBe('MASA');
  for(const input of [{name:''},{areas:['secret']},{areas:['events','events']},{termEnd:'tomorrow'},{kind:'admin'}])
   expect(()=>validateWorkspace({name:'MASA',kind:'project',areas:['events'],...input})).toThrow();
 });
});
