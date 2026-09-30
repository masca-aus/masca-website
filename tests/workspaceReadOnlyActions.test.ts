import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventLifecycleAction } from '../features/events/eventLifecycle';
import { careerLifecycleAction } from '../features/careers/careerLifecycle';

afterEach(() => vi.unstubAllEnvs());
describe('Read-only lifecycle routes', () => {
  for (const [name, handler] of [['events', eventLifecycleAction], ['careers', careerLifecycleAction]] as const) {
    it(`blocks ${name} archiving before starting a write`, async () => {
      vi.stubEnv('WORKSPACE_AUTH_ENABLED', 'true');
      const findByID = vi.fn().mockResolvedValue({ id: 1, owningScope: 'QLD' });
      const req = {
        user: { id: 3, email: 'viewer@masca.org.au', role: 'editor', status: 'active', grants: [], permissions: { [name]: { view: true, edit: false, scopes: [] } } },
        routeParams: { id: '1' }, json: async () => ({ action: 'archive' }), payload: { findByID },
      };
      const response = await handler(req as never);
      expect(response.status).toBe(403);
    });
  }
});
