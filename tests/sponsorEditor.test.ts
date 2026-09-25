import { describe,expect,it } from 'vitest';
import { sponsorStepErrors,sponsorFieldStep } from '@/features/sponsors/sponsorEditor';
describe('sponsor editor steps',()=>{
 it('requires a name and valid date before leaving details',()=>{
  expect(sponsorStepErrors({},0)).toEqual(expect.objectContaining({name:expect.any(String),date:expect.any(String)}));
  expect(sponsorStepErrors({name:'Partner',date:'bad'},0)).toHaveProperty('date');
  expect(sponsorStepErrors({name:'Partner',date:'2026-09-17T00:00:00.000Z'},0)).toEqual({});
 });
 it('requires a logo on the logo step',()=>{
  expect(sponsorStepErrors({},1)).toHaveProperty('logo');expect(sponsorStepErrors({logo:3},1)).toEqual({});
  expect(sponsorFieldStep('logo')).toBe(1);expect(sponsorFieldStep('date')).toBe(0);
 });
});
