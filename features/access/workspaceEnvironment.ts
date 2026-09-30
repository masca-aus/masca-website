type Environment = { [key: string]: string | undefined; WORKSPACE_AUTH_ENABLED?: string; WORKSPACE_INIT_SCHEMA?: string; VERCEL_ENV?: string };
/** Production always retains the live data; non-production auth uses isolated data. */
export function workspaceSchema(env: Environment = process.env): 'public' | 'cms_auth_preview' {
  return env.WORKSPACE_AUTH_ENABLED === 'true' && env.VERCEL_ENV !== 'production' ? 'cms_auth_preview' : 'public';
}
export function workspaceSchemaPush(env: Environment = process.env): boolean {
  return workspaceSchema(env) === 'cms_auth_preview' && env.WORKSPACE_INIT_SCHEMA === 'true';
}
