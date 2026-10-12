#!/bin/sh
set -eu
if [ -n "${WORKSPACE_PREVIEW_SCHEMA:-}" ] && [ "${VERCEL_ENV:-}" = "preview" ]; then
  node --experimental-strip-types scripts/init-isolated-preview.mts
  npm run build
elif [ "${WORKSPACE_MIGRATION_REHEARSAL:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node scripts/check-workspace-migration.mjs
  npm run build
elif [ "${WORKSPACE_AUTH_ENABLED:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node --experimental-strip-types scripts/init-workspace-preview.mts
  npm run build
else
  npm run ci
fi
