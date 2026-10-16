#!/bin/sh
set -eu
if [ "${VERCEL_ENV:-}" = "preview" ] && [ "${WORKSPACE_AUTH_ENABLED:-}" != "true" ]; then
  echo "Preview builds require isolated Workspace settings; refusing production migration history." >&2
  exit 1
fi
if [ "${VERCEL_ENV:-}" != "production" ] && [ "${MEDIA_CALENDAR_ENABLED:-}" = "true" ]; then
  if [ "${MEDIA_CALENDAR_ENABLED:-}" != "true" ] || [ "${WORKSPACE_AUTH_ENABLED:-}" != "true" ]; then
    echo "Calendar preview requires its isolated settings; refusing the default migration step." >&2
    exit 1
  fi
  case "${WORKSPACE_PREVIEW_SCHEMA:-}" in
    cms_calendar_preview|cms_auth_preview) ;;
    *) echo "Calendar preview requires its isolated settings; refusing the default migration step." >&2; exit 1 ;;
  esac
fi
if [ "${MEDIA_CALENDAR_ENABLED:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node --experimental-strip-types scripts/init-calendar-preview.mts
  if [ "${COMMITTEE_ACCESS_ENABLED:-}" = "true" ]; then node --experimental-strip-types scripts/review-committee-access.mts --check; fi
  npm run build
elif [ "${WORKSPACE_MIGRATION_REHEARSAL:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node scripts/check-workspace-migration.mjs
  if [ "${COMMITTEE_ACCESS_ENABLED:-}" = "true" ]; then node --experimental-strip-types scripts/review-committee-access.mts --check; fi
  npm run build
elif [ "${WORKSPACE_AUTH_ENABLED:-}" = "true" ] && [ "${VERCEL_ENV:-}" != "production" ]; then
  node --experimental-strip-types scripts/init-workspace-preview.mts
  if [ "${COMMITTEE_ACCESS_ENABLED:-}" = "true" ]; then node --experimental-strip-types scripts/review-committee-access.mts --check; fi
  npm run build
else
  if [ "${COMMITTEE_ACCESS_ENABLED:-}" = "true" ]; then
    PAYLOAD_MIGRATING=true npm run payload -- migrate
    node --experimental-strip-types scripts/review-committee-access.mts --check
    node --experimental-strip-types scripts/activate-committee-drafts.mts
    npm run build
  else
    npm run ci
  fi
fi
