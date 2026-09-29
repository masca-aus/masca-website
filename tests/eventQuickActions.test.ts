import { describe, expect, it, vi } from 'vitest';
import { eventQuickAction, validateQuickPublish } from '@/features/events/eventQuickActions';

const request = (body: unknown, user: unknown = { id: 1 }) => ({
  user, routeParams: { id: '7' }, query: {}, context: {}, json: async () => body,
  payload: { update: vi.fn().mockResolvedValue({ id: 7, _status: 'draft' }) },
});

describe('event list quick actions', () => {
  it('requires a signed-in committee member', async () => {
    const req = request({ field: '_status', value: 'published' }, null);
    expect((await eventQuickAction(req as never)).status).toBe(401);
    expect(req.payload.update).not.toHaveBeenCalled();
  });
  it('rejects unsupported fields and values without writing', async () => {
    const req = request({ field: 'title', value: 'published' });
    expect((await eventQuickAction(req as never)).status).toBe(400);
    expect(req.payload.update).not.toHaveBeenCalled();
  });
  it('approves a draft without publishing its content', async () => {
    const req = request({ field: 'reviewStatus', value: 'approved' });
    expect((await eventQuickAction(req as never)).status).toBe(200);
    expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({ id: '7', draft: true, overrideAccess: false, req, data: expect.objectContaining({ reviewStatus: 'approved', _status: 'draft' }) }));
    expect(req.query).toMatchObject({ draft: 'true' });
  });
  it.each(['pending', 'rejected'])('unpublishes when review changes to %s', async value => {
    const req = request({ field: 'reviewStatus', value });
    await eventQuickAction(req as never);
    expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({ unpublishAllLocales: true, data: expect.objectContaining({ reviewStatus: value, _status: 'draft' }) }));
    expect(req.query).toMatchObject({ unpublishAllLocales: 'true' });
  });
  it('publishes and approves in a single validated save', async () => {
    const req = request({ field: '_status', value: 'published' });
    await eventQuickAction(req as never);
    expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false, context: { eventQuickPublish: true }, data: expect.objectContaining({ reviewStatus: 'approved', _status: 'published' }) }));
  });
  it('unpublishes incomplete records without replacing content', async () => {
    const req = request({ field: '_status', value: 'draft' });
    await eventQuickAction(req as never);
    expect(req.payload.update).toHaveBeenCalledWith(expect.objectContaining({ unpublishAllLocales: true, data: { _status: 'draft' } }));
  });
  it('checks the latest saved record inside the publish operation', () => {
    expect(() => validateQuickPublish({ data: { _status: 'published' }, originalDoc: { title: '' }, context: { eventQuickPublish: true } } as never)).toThrow();
    const data = { _status: 'published' };
    expect(validateQuickPublish({ data, originalDoc: { title: 'Dinner', organisation: 'MASCA', description: 'Welcome', startDate: '2026-12-01T08:00:00Z', venue: 'Hall', state: 'QLD', contactName: 'Alex', contactEmail: 'alex@example.com' }, context: { eventQuickPublish: true } } as never)).toEqual(data);
  });
});
