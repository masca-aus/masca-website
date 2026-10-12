import {afterEach, expect, it, vi} from 'vitest';
import {up} from '../migrations/20261008_033000_account_departments';
afterEach(() => vi.unstubAllEnvs());
it.each(['cms_auth_preview','cms_calendar_preview'])('keeps department preparation inside %s', async (schema) => {
  vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('WORKSPACE_AUTH_ENABLED','true');vi.stubEnv('WORKSPACE_PREVIEW_SCHEMA',schema);
  const execute=vi.fn();
  await up({db:{execute}} as never);
  const statement=JSON.stringify(execute.mock.calls[0][0]);
  expect(statement).toContain(schema);
  expect(statement).not.toContain('\\"public\\".');
});
it('refuses preview department migration against the live account schema', async () => {
  vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('WORKSPACE_AUTH_ENABLED','false');
  const execute=vi.fn();
  await expect(up({db:{execute}} as never)).rejects.toThrow(/isolated/);
  expect(execute).not.toHaveBeenCalled();
});
it('uses public for production and preserves existing department memberships', async () => {
  vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('WORKSPACE_AUTH_ENABLED','true');
  const execute=vi.fn();await up({db:{execute}} as never);
  const statement=JSON.stringify(execute.mock.calls[0][0]);
  expect(statement).toContain('public');expect(statement).not.toContain('cms_auth_preview');
  expect(statement).toContain('CREATE TABLE IF NOT EXISTS');
  expect(statement).not.toMatch(/DROP TABLE|DELETE FROM/);
});
