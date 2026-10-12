# CMS website insights

The CMS homepage includes a Vercel Web Analytics report for the last seven days:
visitors, page views, top pages and referring websites. Existing content queues
remain below it. No database migration or new tracking script is required.

## Connect Vercel

1. Confirm **Web Analytics** is enabled for the production project in Vercel.
2. Create a Vercel access token with access to the project and its owning team.
   Store it as `VERCEL_ANALYTICS_TOKEN` in the project's environment variables.
3. Set `VERCEL_ANALYTICS_PROJECT_ID` to the production project ID. If omitted,
   the server uses `VERCEL_PROJECT_ID`, when Vercel provides it.
4. For a team-owned project, set `VERCEL_ANALYTICS_TEAM_ID` to its team ID.
   Personal projects do not need it. `VERCEL_TEAM_ID` is also supported.
5. Apply these variables to the intended deployment environments and redeploy.
   For local development, use `.env.local` with the same names. Never commit keys
   or prefix them with `NEXT_PUBLIC_`.
6. Sign in to the CMS and check the report against Vercel Web Analytics using
   the same date range and production filter.

The reporting client only runs on the server. With Workspace authentication
enabled, active approved Workspace members receive the site-wide report, including
scoped and viewing-only editors. Invited, suspended and unapproved accounts do not. In legacy password mode, authenticated CMS users can view
the report, matching the existing shared dashboard access.

## Report behaviour

- Uses the official `visits/aggregate` endpoint, production data only, with
  one production-environment bucket for period-wide totals. Visitors are never added across
  pages or sources because those audiences overlap.
- The rolling seven-day window ends at the last complete UTC hour. Vercel rounds
  aggregates to hours; the API request uses an inclusive end one millisecond
  before the boundary to preserve the exact period. The interface
  displays the end time in Brisbane time (AEST). Responses are cached for up to
  five minutes. Request timeouts are eight seconds. Streaming keeps the content
  tools independent of the external report.
- Top pages and traffic sources are ranked by page views. Vercel may include
  an `Others` bucket when more than five distinct values exist. Missing referrers
  are labelled **Direct / unknown**, not attributed to Instagram.
- Missing credentials show a connection prompt. Access, plan, rate-limit and
  network failures show an unavailable state, never zero traffic. A failed
  breakdown does not discard successfully retrieved totals.
- The public site already gates Vercel collection on analytics consent. Figures
  therefore cover consenting visitors and may also be affected by blockers.
- This first version does not send custom events, connect Instagram or count
  completed registrations. Custom event tracking and UTM reports have Vercel
  plan requirements; check the current plan before extending the report.

## Verify

Run `npm test`, `npm run typecheck`, and lint the changed files. With a working
database and reporting credentials, open `/admin` at desktop and mobile widths.
Check both themes, connection failures, an empty report, and a populated report.
Testing against real Vercel data still requires credentials; fixture previews
are for layout inspection only.

Live verification on 8 October 2026 used the existing local Vercel CLI sign-in
in memory. All three report queries returned HTTP 200 with matching query bounds:
1 October 1 pm to 8 October 1 pm AEST (73 visitors, 352 page views at verification).
No credential was copied into source, environment files or preview artifacts.
The 21 focused tests, type checking and changed-file lint passed. The full suite
had 515 passes and 10 failures, all reproduced without these analytics changes
in the existing careers and committee tests. A Preview deployment subsequently built successfully on Vercel with `npm run build`
(no migrations), and `/admin` returned HTTP 200 through authenticated Vercel CLI access.
All three reporting variables are present and scoped to Preview. Sensitive values
were not readable through the environment-list API, so the newly saved reporting
token still needs confirmation in the signed-in CMS. Vercel browser protection
requires the user to sign in before that dashboard check. Production was not deployed.

Preview: https://masca-website-k38nkigkn-masca-au.vercel.app/admin
Deployment: dpl_DCsN6p5YcmsR4sNPRCrYQdHs6HzC
The upload used HEAD plus the analytics changes, excluding unrelated local edits;
the build-command override exists only in the temporary deployment copy.

References:
- https://vercel.com/docs/analytics/web-analytics-api
- https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views
- https://vercel.com/docs/analytics/limits-and-pricing
