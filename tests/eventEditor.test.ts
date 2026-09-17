import { describe, expect, it } from 'vitest';
import { eventDraftFingerprint, eventFieldStep, firstIncompleteEventStep, validateEventStep } from '@/features/events/eventEditor';

const complete = {
  title: 'A', organisation: 'B', description: 'C',
  startDate: '2026-09-20T10:00:00.000Z', venue: 'D', state: 'QLD',
  contactName: 'E', contactEmail: 'person@example.com', reviewStatus: 'pending',
};

describe('event editor validation', () => {
  it('requires trimmed basics without imposing public submission minimum lengths', () => {
    expect(validateEventStep(complete, 0)).toEqual({});
    expect(Object.keys(validateEventStep({ title: ' ', organisation: null }, 0))).toEqual(['title', 'organisation', 'description']);
  });
  it('validates only the current step until the final review', () => {
    expect(validateEventStep({}, 2)).toEqual({});
    expect(Object.keys(validateEventStep({}, 4))).toEqual(expect.arrayContaining(['title', 'startDate', 'venue', 'state', 'contactName', 'contactEmail']));
  });
  it('accepts valid dates with an optional end date and rejects invalid chronology', () => {
    expect(validateEventStep(complete, 1)).toEqual({});
    expect(validateEventStep({ ...complete, endDate: complete.startDate }, 1)).toEqual({});
    expect(validateEventStep({ ...complete, endDate: '2026-09-19T10:00:00Z' }, 1)).toHaveProperty('endDate');
    expect(validateEventStep({ ...complete, startDate: 'nonsense', endDate: 'bad' }, 1)).toHaveProperty('startDate');
    expect(validateEventStep({ ...complete, startDate: '2026-02-30T10:00:00Z' }, 1)).toHaveProperty('startDate');
  });
  it('requires a recognised state and a nonblank venue', () => {
    expect(validateEventStep({ ...complete, state: 'XX', venue: ' ' }, 1)).toEqual({ state: expect.any(String), venue: expect.any(String) });
  });
  it('accepts optional secure links and rejects nonsecure or malformed links', () => {
    expect(validateEventStep({ ticketURL: ' https://example.com/tickets ' }, 2)).toEqual({});
    expect(validateEventStep({ ticketURL: '  ' }, 2)).toEqual({});
    for (const ticketURL of ['http://example.com', 'javascript:alert(1)', 'bad']) {
      expect(validateEventStep({ ticketURL }, 2)).toHaveProperty('ticketURL');
    }
  });
  it('requires contact details and a valid trimmed email', () => {
    expect(validateEventStep({ ...complete, contactEmail: ' person@example.com ' }, 3)).toEqual({});
    expect(validateEventStep({ contactName: ' ', contactEmail: 'invalid' }, 3)).toEqual({ contactName: expect.any(String), contactEmail: expect.any(String) });
  });
  it('resumes at the earliest incomplete step, including invalid optional links', () => {
    expect(firstIncompleteEventStep({})).toBe(0);
    expect(firstIncompleteEventStep({ ...complete, startDate: '' })).toBe(1);
    expect(firstIncompleteEventStep({ ...complete, ticketURL: 'http://example.com' })).toBe(2);
    expect(firstIncompleteEventStep({ ...complete, contactName: '' })).toBe(3);
    expect(firstIncompleteEventStep(complete)).toBe(4);
  });
  it('routes nested field errors to their visible step', () => {
    expect(eventFieldStep('poster.id')).toBe(2);
    expect(eventFieldStep('contactEmail')).toBe(3);
    expect(eventFieldStep('reviewStatus')).toBe(4);
    expect(eventFieldStep('unknown')).toBe(4);
  });
});

describe('event draft fingerprint', () => {
  it('ignores save metadata and UI fields but tracks content changes', () => {
    const before = eventDraftFingerprint(complete);
    expect(eventDraftFingerprint({ ...complete, id: 4, createdAt: 'now', updatedAt: 'later', reviewedAt: 'later', _status: 'published', editorStep: 3 })).toBe(before);
    expect(eventDraftFingerprint({ ...complete, title: 'Changed' })).not.toBe(before);
    expect(eventDraftFingerprint({ ...complete, internalNotes: 'Follow up' })).not.toBe(before);
    expect(eventDraftFingerprint({ ...complete, reviewStatus: 'approved' })).not.toBe(before);
  });
  it('treats populated posters as the same saved relationship and detects replacement', () => {
    const before = eventDraftFingerprint({ ...complete, poster: 7 });
    expect(eventDraftFingerprint({ ...complete, poster: { id: 7, url: '/poster.png', updatedAt: 'later' } })).toBe(before);
    expect(eventDraftFingerprint({ ...complete, poster: 8 })).not.toBe(before);
  });
  it('treats absent and cleared optional inputs consistently regardless of property order', () => {
    expect(eventDraftFingerprint({ ...complete, poster: null, endDate: '', internalNotes: null })).toBe(eventDraftFingerprint(Object.fromEntries(Object.entries(complete).reverse())));
  });
});
