import { describe, expect, it } from 'vitest';
import { careerToJob, careerPublicationErrors, validCareerDate } from '@/features/careers/careerModel';
import { nextCareerLifecycle } from '@/features/careers/careerLifecycle';

const role = { id: 42, slug: 'wt-cadet', title: 'Cadet Engineer', company: 'WT', type: 'cadet', applyUrl: 'https://example.com/apply', added: '2026-09-16', international: 'yes', studyLevels: ['final'], country: 'Australia', state: 'NSW', city: 'Sydney', workMode: 'hybrid', _status: 'published', internalNotes: 'Private recruitment note', sourceKey: 'private-source' };
describe('CMS careers public adapter', () => {
 it('retains deep links, labels and eligibility without exposing internal fields', () => {
  const job = careerToJob(role, '2026-09-17');
  expect(job).toMatchObject({ id: 'wt-cadet', type: 'cadet', studyLevels: ['final'], international: 'yes', location: 'Sydney, NSW', isNew: true });
  expect(job).not.toHaveProperty('internalNotes');
  expect(job).not.toHaveProperty('sourceKey');
 });
 it('hides drafts, expired and stale rolling roles but includes the closing day', () => {
  expect(careerToJob({ ...role, _status: 'draft' }, '2026-09-17')).toBeNull();
  expect(careerToJob({ ...role, closes: '2026-09-16' }, '2026-09-17')).toBeNull();
  expect(careerToJob({ ...role, closes: '2026-09-17' }, '2026-09-17')).toMatchObject({ daysLeft: 0 });
  expect(careerToJob({ ...role, added: '2026-01-01' }, '2026-09-17')).toBeNull();
 });
 it('rejects missing application details and unsafe URLs before publishing', () => {
  expect(careerPublicationErrors(role)).toEqual({});
  expect(careerPublicationErrors({ ...role, title: ' ', applyUrl: 'Internal Recruiting' })).toHaveProperty('title');
  expect(careerPublicationErrors({ ...role, applyUrl: 'javascript:alert(1)' })).toHaveProperty('applyUrl');
  expect(careerPublicationErrors({ ...role, applyUrl: 'careers@example.com' })).toEqual({});
  expect(careerPublicationErrors({ ...role, companyWebsite: 'javascript:alert(1)' })).toHaveProperty('companyWebsite');
 });
 it('rejects impossible calendar dates', () => {
  expect(validCareerDate('2026-02-29')).toBe(false);
  expect(validCareerDate('2028-02-29')).toBe(true);
  expect(validCareerDate('')).toBe(true);
 });
});
describe('careers lifecycle', () => {
 it('restores the previous closed state and requires reopen explicitly', () => {
  const closed = nextCareerLifecycle(null, 'close', 'now');
  const archived = nextCareerLifecycle(closed, 'archive', 'later');
  expect(nextCareerLifecycle(archived, 'restore', 'later')).toMatchObject({ status: 'closed', closedAt: 'now', archivedAt: null });
  expect(nextCareerLifecycle(closed, 'reopen', 'later')).toMatchObject({ status: 'active', closedAt: null });
 });
 it('rejects illegal actions', () => {
  expect(() => nextCareerLifecycle(null, 'restore', 'now')).toThrow();
  expect(() => nextCareerLifecycle({ status: 'archived' }, 'reopen', 'now')).toThrow();
 });
});
