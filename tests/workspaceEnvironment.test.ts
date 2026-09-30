import { describe, expect, it } from 'vitest';
import { workspaceSchema, workspaceSchemaPush } from '../features/access/workspaceEnvironment';
describe('Workspace database isolation', () => {
  it('uses public for production regardless of preview flags', () => {
    const env = { WORKSPACE_AUTH_ENABLED: 'true', WORKSPACE_INIT_SCHEMA: 'true', VERCEL_ENV: 'production' };
    expect(workspaceSchema(env)).toBe('public');
    expect(workspaceSchemaPush(env)).toBe(false);
  });
  it('keeps auth previews isolated', () => {
    expect(workspaceSchema({WORKSPACE_AUTH_ENABLED: 'true', VERCEL_ENV: 'preview'})).toBe('cms_auth_preview');
    expect(workspaceSchemaPush({WORKSPACE_AUTH_ENABLED: 'true', WORKSPACE_INIT_SCHEMA: 'true', VERCEL_ENV: 'preview'})).toBe(true);
  });
  it('keeps legacy deployments on public', () => {
    expect(workspaceSchema({})).toBe('public');
    expect(workspaceSchemaPush({WORKSPACE_INIT_SCHEMA: 'true'})).toBe(false);
  });
});
