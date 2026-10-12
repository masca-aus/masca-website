type Environment = { [key: string]: string | undefined; WORKSPACE_AUTH_ENABLED?: string; WORKSPACE_INIT_SCHEMA?: string; VERCEL_ENV?: string };
/** Production always retains the live data; non-production auth uses isolated data. */
export function workspaceSchema(env: Environment = process.env): 'public' | 'cms_auth_preview' | 'cms_calendar_preview' {
  return env.WORKSPACE_AUTH_ENABLED === 'true' && env.VERCEL_ENV !== 'production' ? (env.WORKSPACE_PREVIEW_SCHEMA === 'cms_calendar_preview' ? 'cms_calendar_preview' : 'cms_auth_preview') : 'public';
}
export function workspaceSchemaPush(env: Environment = process.env): boolean {
  return workspaceSchema(env) !== 'public' && env.WORKSPACE_INIT_SCHEMA === 'true';
}
