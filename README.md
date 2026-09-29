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
