import { describe, expect, it } from 'vitest';
import { committeeStepErrors, committeeFieldStep } from '@/features/committee/committeeEditor';
import { adminBackTarget } from '@/components/admin/adminBackTarget';

describe('CMS return navigation', () => {
  it('returns each collection list to the dashboard and each record to its collection', () => {
    for (const slug of ['events', 'committee', 'media', 'sponsors', 'users']) {
      expect(adminBackTarget(`/admin/collections/${slug}`)).toEqual({ href: '/admin', label: 'Back to dashboard' });
      expect(adminBackTarget(`/admin/collections/${slug}/create`)?.href).toBe(`/admin/collections/${slug}`);
      expect(adminBackTarget(`/admin/collections/${slug}/12`)?.href).toBe(`/admin/collections/${slug}`);
    }
    expect(adminBackTarget('/admin/account')).toEqual({ href: '/admin', label: 'Back to dashboard' });
    expect(adminBackTarget('/admin')).toBeNull();
    expect(adminBackTarget('/admin/login')).toBeNull();
  });
});
describe('committee steps', () => {
  it('validates only the current step before continuing', () => {
    expect(committeeStepErrors({}, 0)).toHaveProperty('name');
    expect(committeeStepErrors({name: 'Aisha'}, 0)).toEqual({});
    expect(committeeStepErrors({role: 'President', department: 'unassigned', year: '2026'}, 1)).toHaveProperty('year');
    expect(committeeStepErrors({role: 'President', department: 'unassigned', year: '2026/2027'}, 1)).toEqual({});
  });
  it('requires a portrait and accepts only valid HTTPS profile URLs', () => {
    expect(committeeStepErrors({}, 2)).toHaveProperty('portrait');
    expect(committeeStepErrors({portrait: 4, linkedin_url: 'javascript:alert(1)'}, 2)).toHaveProperty('linkedin_url');
    expect(committeeStepErrors({portrait: 4, linkedin_url: 'https://linkedin.com/in/aisha'}, 2)).toEqual({});
    expect(committeeFieldStep('year')).toBe(1);
    expect(committeeFieldStep('portrait')).toBe(2);
  });
});
