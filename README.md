## License

The **source code** in this repository is licensed under the [MIT License](./LICENSE).
You're welcome to use it as a starting point for your own project.

The **MASCA name, logo, branding, and written content** are **not** covered by
the MIT License and remain the property of MASCA. Please don't reuse them to
represent or imply affiliation with your own organisation.

## ⚙️ Getting Started

Follow these steps to set up and run the application locally.

### Prerequisites

- Node.js 22 LTS (run `nvm use` if you use nvm)
- npm 11 (the version is pinned in `package.json`)

Enable the pinned package manager once after installing Node:

```bash
corepack enable
corepack install
```

### 1. Clone the Repository

```bash
git clone https://github.com
cd your-repo-name
```

### 2. Install Dependencies

Install the exact dependency versions recorded in the lockfile:

```bash
npm ci
```

### 3. Environment Variables

Create a copy of the template environment file and update the variables with your local secrets. Do **not** commit actual keys to your Git repository.

```bash
cp .env.example .env.local
```

Open `.env.local` and populate the necessary parameters. (ask Jin or the owner for this)

### 4. Run the Development Server

Start the application locally on [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

## Careers board (CMS preview)

`/careers` reads published opportunities from Payload. Manage roles at
`/admin/collections/careers` using the four-step editor: role and company,
location and eligibility, application details, then review and publish.
Drafts, internal notes and change history are private. Close or archive a role
to hide it without losing its content or pending edits. Rolling listings keep
the existing 60-day expiry rule; dated roles remain visible through their closing day.

Publishing invalidates the careers page; a five-minute refresh also updates
calendar-based expiry. Search, filters, job details and stable shared links
retain the existing public interface. `/careers/health` now redirects to the CMS.

Google Sheets is used only by the one-time import utility. See
[the import runbook](./docs/careers-cms.md). Keep the original sheet as a backup;
CMS edits do not sync back. The preview shares the production database, but the
production frontend remains on its deployed code until this branch is merged.

## Event submission preview

The preview Event workflow uses Payload as its single source of truth. The
public entry page is `/submit`; organisers submit an event at `/submit/event`.
Submissions are saved as **pending drafts** and do not appear publicly.

An authorised CMS editor reviews submissions at `/admin/collections/events`:

1. Open the event and check its description, local date and time, venue, state,
   poster, and ticket link. Contact details and internal notes are for editors
   only.
2. To publish, set **Review status** to **Approved** and publish the document.
   Both actions are required. Approved events then appear on `/events` and the
   homepage while they are upcoming.
3. To withhold a pending event, leave it unpublished and set **Review status**
   to **Rejected**. To remove an event that was already published, use Payload's
   **Unpublish** action. A newly saved draft does not necessarily replace the
   last published version, so do not rely on a draft-only status edit to take
   an existing listing down.

The Event migration is `20260916_010000_add_events_submission_workflow`. It
adds only the `events` and `_events_v` tables and their Events-owned enums,
indexes and foreign keys. Both tables enable row-level security and revoke
direct access from the `anon` and `authenticated` database roles. Do not apply
the migration or deploy this preview until the database owner approves the
reviewed SQL. Once approved, use `npm run ci` for a migration-enabled build;
it runs `PAYLOAD_MIGRATING=true payload migrate` before `next build`. Confirm
the Vercel preview's build setting actually uses this command. Payload records
applied migrations, but only point the command at the intended database
environment. Confirm existing collections still respond before testing the
public flow. Rolling the
migration back removes all submitted Event data, so take a database backup
first and prefer unpublishing the preview if a rollback is needed.

This is a preview workflow, not a production-ready public intake. Before
launching publicly, add a durable distributed rate limit, working Turnstile
verification, notification delivery to reviewers, and stakeholder approval.
The current submission limiter is process-local and the form does not send
review notifications.

### National media calendar

The private calendar lives at `/admin/media-calendar`. Enable `MEDIA_CALENDAR_ENABLED=true` with Google Workspace authentication. In People & access, give named National media members separate calendar viewing, editing and approval permissions, with a Member or Chair designation for reviewers. Existing public-media permissions do not grant calendar access. Administrators can manage/preview; approval still requires a designated reviewer who did not create or contribute to the content.

Use a **private** S3-compatible bucket distinct from website `media`: `CALENDAR_PRIVATE_BUCKET` for production and `CALENDAR_PRIVATE_PREVIEW_BUCKET` for preview. Allow JPEG, PNG, WebP, MP4, QuickTime and WebP thumbnails, with a 50 MB object limit. Images are limited to 20 MB and 40 megapixels; videos to 50 MB, with at most ten assets per post. Permit signed browser PUT requests in bucket CORS for the exact deployment origin. There must be no anonymous bucket/object read policies. Run Payload migrations before enabling production. For a dedicated preview, set `WORKSPACE_PREVIEW_SCHEMA=cms_calendar_preview`; its initialization runs from the Vercel build script and uses separate CMS users and calendar records. Never set `CALENDAR_PREVIEW_TESTS` in production.

Caption changes merge through Yjs and authenticated CMS endpoints. The first transport polls the open post every 750 ms while visible (five seconds in background), with room presence every four seconds. Durable writes and presence reads recheck current account permissions; cursor identities are server-derived and presence expires after 15 seconds. This uses more server requests than WebSockets: review actual usage before expanding beyond the National team. Saves batch at 500 ms idle/two seconds maximum, and disconnected caption updates are kept per account/post. The calendar does not require Meta credentials or automatically publish posts.

The workflow is Draft → In review → Approved → Posted. Review freezes content. Date-only changes preserve approval; caption, title, format or media edits invalidate it. Posted content is immutable; Duplicate starts a new draft. Request review requires completed uploads and a caption at or below 2,200 characters. Discussions, mentions and review notifications stay in the CMS.

Incomplete uploads older than 24 hours can be removed with `node --experimental-strip-types scripts/cleanup-calendar-uploads.mts`, using the correct environment. This job never deletes ready media or objects referenced by duplicates. The local browser smoke check is `node scripts/check-media-calendar.mjs` after starting a dedicated local QA sandbox; it deliberately refuses remote/production URLs. Production storage signing and the hosted deployment must be verified with the real preview credentials before rollout.

Calendar verification: `scripts/check-media-calendar.mjs` exercises two authenticated local QA accounts, concurrent captions and metadata, review locks, offline recovery, upload retry, private media integrity, manual posting and permission revocation. `scripts/check-media-calendar-recovery.mjs` covers reload/cancellation, locked recovery, withdrawal/close, concurrent reference links, inactive historical assignments, media-format validation, remote video metadata and browser timezone differences. Both scripts require the dedicated loopback `calendarqa` database and `.env.local`; never point them at live CMS data. The main check resets only that QA calendar unless `CALENDAR_CHECK_PRESERVE=true`.

Preview checks pass on the production build. The full repository suite retains six identical legacy failures from the base branch; all 17 new calendar tests pass. Hosted storage signing and team rollout still require working environment credentials. Parallel uploads currently attach in completion order; use the media arrows to arrange carousel slides before requesting review.
