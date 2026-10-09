#!/bin/sh
set -eu
if [ "${VERCEL_ENV:-}" != "production" ] && [ "${VERCEL_GIT_COMMIT_REF:-}" = "codex/media-calendar" ]; then
  if [ "${MEDIA_CALENDAR_ENABLED:-}" != "true" ] || [ "${WORKSPACE_AUTH_ENABLED:-}" != "true" ] || [ "${WORKSPACE_PREVIEW_SCHEMA:-}" != "cms_calendar_preview" ]; then
    echo "Calendar preview requires its isolated settings; refusing the default migration step." >&2
    exit 1
  fi
fi
if [ "${MEDIA_CALENDAR_ENABLED:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node --experimental-strip-types scripts/init-calendar-preview.mts
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
