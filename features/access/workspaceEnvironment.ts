type Environment = { [key: string]: string | undefined; WORKSPACE_AUTH_ENABLED?: string; WORKSPACE_INIT_SCHEMA?: string; WORKSPACE_PREVIEW_SCHEMA?: string; VERCEL_ENV?: string };
/** Production always uses the public schema; non-production may use isolated data. */
export function workspaceSchema(env: Environment = process.env): string {
  if (env.VERCEL_ENV !== 'production' && env.WORKSPACE_PREVIEW_SCHEMA && /^cms_[a-z0-9_]+_preview$/.test(env.WORKSPACE_PREVIEW_SCHEMA)) {
    return env.WORKSPACE_PREVIEW_SCHEMA;
  }
  return env.WORKSPACE_AUTH_ENABLED === 'true' && env.VERCEL_ENV !== 'production' ? 'cms_auth_preview' : 'public';
}
export function workspaceSchemaPush(env: Environment = process.env): boolean {
  return workspaceSchema(env) !== 'public' && env.WORKSPACE_INIT_SCHEMA === 'true';
}
