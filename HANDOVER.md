# MASCA Website — Handover

This document is the single source of truth for running and maintaining the MASCA
website. If you are a new committee member taking over the site, **read this first.**

> **How to use this file:** Keep this document updated whenever something changes
> (a new host, a renewed domain, a new service). A handover doc that's out of date
> is worse than none.

**Last updated:** 16/6/2026 by Jin Hong Pang

---

## 1. Quick reference

The "if you only read one section" section.

| Thing | Value |
|---|---|
| Live site | https://masca.org.au |
| GitHub repo | `masca-aus/masca` (owner: `jin-ramen`) |
| Hosting | Vercel, under the `admin@masca.org.au` Google Workspace account |
| Domain registrar | GoDaddy (renewals only) |
| DNS | Cloudflare (records → Vercel) |
| Domain renews | **13/10/2029** — do not let this lapse |
| Shared credentials | Notion (in the `admin@masca.org.au` Google Workspace) — see §3 |
| Logging in | Every service uses "Continue with Google" via `admin@masca.org.au` |
| Current tech lead | Jin — jinhong36@icloud.com |

---

## 2. The stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Hosting / deploy:** Vercel (auto-deploys from the `main` branch)
- **Contact form / email:** Resend
- **CMS:** Payload (admin panel at `/admin`), backed by Supabase Postgres
- **Images:** uploaded via the CMS into Supabase Storage (older pages still use Cloudinary URLs)
- **Committee content:** Payload CMS (`/admin` → Committee)
- **Sponsors content:** Notion
- **Events / ticketing:** Eventbrite (auto-syncs to the site)

---

## 3. Accounts & access (the important part)

Everything below is **owned by MASCA, not by any individual.** The keystone is the
`admin@masca.org.au` account — most other services log in through it.

### `admin@masca.org.au` (keystone account)
- A **real mailbox** the committee controls, hosted on **Google Workspace**.
- **Every service is signed into with "Continue with Google" using this account** —
  GitHub, Vercel, GoDaddy, Cloudflare, Resend, Cloudinary, Notion, and Eventbrite all
  use Google SSO rather than separate passwords. So this one account is the master key
  to everything.
- **If a service prompts for a 2FA / authentication code, open the Google
  Authenticator app on the admin account's device** and read the current code from
  there. That app is the live second factor for the Google login.
- **Backup recovery codes live in Notion** (see below) — use these if the
  Authenticator device is lost or unavailable. If you change the 2FA device, generate
  fresh recovery codes and update Notion immediately.

### GitHub
- Organisation: `masca-aus`
- Repo: `masca` (public)
- Permanent owner account: **`jin-ramen`** — do not remove.
- Committee members are added to the **`web-committee` team** with the **Maintain**
  role. At least one trusted lead has **Admin**.
- `main` is protected: no force-pushes, no deletions, changes go through pull requests.

### Vercel
- Project lives under the `admin@masca.org.au` Google Workspace login on Vercel.
- It deploys automatically when something is merged to `main` on GitHub.
- The custom domain is attached here under Project → Settings → Domains.

### Eventbrite
- Used for **event registration / ticketing**. Login via "Continue with Google"
  using `admin@masca.org.au`.
- Organiser page: https://www.eventbrite.com.au/o/121402646145
- **Events sync to the site automatically.** Any event you publish in Eventbrite
  appears on the website on its own, pulled in via the Eventbrite API — no code
  change, no embed, no redeploy needed.
- Powered by two env vars in Vercel: `EVENT_TOKEN` (API token) and `EVENT_ORG_ID`
  (which organiser's events to pull). See the env var table in §4.

### Domain & DNS

Three separate pieces — don't confuse them:

- **Registrar (where the domain is owned/renewed): GoDaddy.** Login stored in Notion.
  You only touch GoDaddy to renew the domain or change nameservers.
  Renewal date: **13/10/2029** — set a calendar reminder a month ahead.
- **DNS (where records are managed): Cloudflare.** GoDaddy's nameservers point to
  Cloudflare, and the actual DNS records live in Cloudflare. **To change any DNS
  record, go to Cloudflare — not GoDaddy.**
- **Host: Vercel.** Cloudflare's records point the domain at the Vercel project.

So the chain is: **GoDaddy (registrar) → Cloudflare (DNS) → Vercel (site).**

### Shared credentials (Notion)
- All logins, recovery codes, and keys live in **Notion**, inside the
  `admin@masca.org.au` Google Workspace.
- **Never** store these in the repo, in a chat, or in personal accounts.
- When someone leaves the committee, rotate anything they had access to and update Notion.

> **Notion is not an encrypted password vault** — it's protected only by who can
> access the workspace/page. So: keep the credentials page restricted to current
> committee members, **never use Notion's "Share to web"** on it, and remember that
> anyone with access to that workspace can read everything in it. If MASCA later
> wants stronger separation, move the most sensitive logins (the Google Workspace
> admin password especially) into a dedicated free password manager.

---

## 4. Running it locally

```bash
# 1. Clone the repo
git clone https://github.com/masca-aus/masca.git
cd masca

# 2. Install dependencies
npm install

# 3. Set up environment variables
#    Copy the example file and fill in real values from Notion.
cp .env.example .env.local

# 4. Run the dev server
npm run dev
```

The site should now be running at `http://localhost:3000` (or whatever the
terminal prints).

> **Env vars:** real secrets are **never** committed. They live in Notion and in
> Vercel (Project → Settings → Environment Variables, all marked Sensitive,
> Production + Preview). `.env.local` is gitignored — keep it that way.

### Environment variables

Every one of these is required for the site to work. Real values are in Notion and
in Vercel — copy them into `.env.local` for local dev.

| Variable | Used for |
|---|---|
| `EVENT_TOKEN` | Eventbrite API token — pulls events onto the site |
| `EVENT_ORG_ID` | Eventbrite organiser ID — which org's events to pull |
| `RESEND_KEY` | Resend API key — sends the contact-form email |
| `NOTION_TOKEN` | Notion integration token — reads sponsors content |
| `NOTION_SPONSORS_DB_ID` | Notion database ID for the sponsors page |
| `PAYLOAD_SECRET` | Payload CMS secret — signs admin login tokens. Any long random string; generate once, never rotate casually (rotating logs everyone out) |
| `DATABASE_URI` | Supabase Postgres connection string — **must** be the transaction-mode pooler string (port 6543), not the direct connection |
| `S3_ENDPOINT` | Supabase Storage S3 endpoint — Supabase dashboard → Storage → Settings → S3 Connection (looks like `https://<project>.storage.supabase.co/storage/v1/s3`) |
| `S3_REGION` | Supabase project region (shown next to the S3 endpoint, e.g. `ap-southeast-2`) |
| `S3_ACCESS_KEY_ID` | Supabase Storage S3 access key — create under Storage → Settings → S3 Access Keys |
| `S3_SECRET_ACCESS_KEY` | Secret half of the S3 access key (shown once at creation — store in Notion) |
| `S3_BUCKET` | Supabase Storage bucket for CMS image uploads (default `media`). **Must be created as a _public_ bucket** in Supabase → Storage, or uploaded images won't render |

If you add a new variable, set it in **both** `.env.local` and Vercel, then redeploy.
(Check Vercel for any additional variables not listed here.)

---

## 5. How deploys work

1. You make changes on a branch and open a **pull request** into `main`.
2. Someone reviews and merges it (while the committee is small, self-merge is fine).
3. Merging to `main` triggers Vercel to build and deploy automatically.
4. Within a minute or two, the live site updates. No manual deploy step.

**Database migrations:** the Vercel build command must be `npm run ci` (set in the
Vercel project settings). That runs `payload migrate` against Supabase before
`next build`, so schema changes ship with the code that needs them. Local builds
(`npm run build`) skip migrations, but since the committee page is prerendered
from Payload they do need a reachable `DATABASE_URI`.

To preview before going live: every pull request gets its own **Vercel preview URL**
automatically — check that link before merging.

**Never push directly to `main`** — branch protection blocks it, and that's on purpose.

---

## 6. Common tasks

- **Edit text:** in the page files under `app/` — find the page you want and edit
  the copy directly.
- **Add or change images:** upload them in the CMS at **`/admin` → Media** — files
  land in the public Supabase Storage `media` bucket and each entry gets a permanent
  URL. (Older pages still reference **Cloudinary** URLs directly; that keeps working.)
  Don't commit large image files into the repo.
- **Add a new page:** create a new folder under `app/` with a `page.tsx` inside
  (App Router convention) — copy an existing page as a template.
- **Update the committee page:** edit members in the CMS at **`/admin` → Committee**
  (portraits come from **`/admin` → Media**). Changes appear on the live site within
  seconds — no redeploy, no code change.
- **Update the sponsors page:** edit the source in **Notion** (see
  `NOTION_SPONSORS_DB_ID`). The site pulls from there; no code change needed.
- **Create or manage an event:** publish it in **Eventbrite** (logged in via Google as
  `admin@masca.org.au`). It appears on the website automatically via the API — nothing
  to add or deploy on the site side.
- **Change the contact-form recipient / email:** managed through **Resend** — check
  the API route under `app/api/` and the `RESEND_*` environment variables in Vercel.
- **Add an environment variable:** add it to both your local `.env.local` **and**
  Vercel → Settings → Environment Variables, then redeploy.

---

## 7. Committee handover

### Onboarding a new committee member
1. They create a personal GitHub account (or use their existing one).
2. An org admin adds them to the `masca-aus` → `web-committee` team (Maintain role).
3. Give them access to the Notion workspace.
4. Point them at this document.

### When someone leaves
1. Remove them from the `web-committee` team on GitHub **(DO NOT remove owner `jin-ramen`)**.
2. Remove their Notion access.
3. **Rotate** any shared credentials they personally knew (the `admin@` Google
   password especially), and update Notion.
4. Make sure no service still depends on their personal account.

### Each year's tech lead inherits
- The `admin@masca.org.au` Google Workspace account and its recovery codes.
- Admin on the `masca-aus` GitHub org.
- Ownership of this document — keep it current.

---

## 8. Costs & renewals

Track anything that costs money or expires, so nothing lapses silently.

| Item | Who pays | Amount | Renews | Notes |
|---|---|---|---|---|
| Domain (GoDaddy) | MASCA | [FILL: $] | **13/10/2029** | Critical — site + email die if it lapses |
| DNS (Cloudflare) | — | Free | n/a | Manages DNS records → Vercel |
| Hosting (Vercel) | — | Free (Hobby) | n/a | Free tier unless upgraded |
| Google Workspace | MASCA | [FILL: $/mo] | [FILL: date] | Hosts the `admin@` mailbox + Notion access |
| Resend | — | [FILL: free?] | n/a | Contact-form email |
| Cloudinary | — | [FILL: free?] | n/a | Image hosting |
| Notion | — | [FILL: free?] | n/a | Credentials + committee page |
| Eventbrite | — | Free to set up | n/a | Service fees apply to paid tickets |

---

## 9. If something breaks

- **Site is down:** check the Vercel dashboard (`admin@` account) for a failed
  build, and confirm the domain hasn't expired at GoDaddy.
- **A deploy didn't go live:** check Vercel → Deployments for the latest build
  status and error log.
- **Images not loading:** for CMS uploads, check Supabase → Storage (bucket exists,
  is **public**, and the `S3_*` env vars in Vercel are valid). For older pages,
  check Cloudinary (account status, correct URLs).
- **Contact form not sending:** check Resend (account status, `RESEND_*` env vars).
- **Events not showing on the site:** confirm the event is **published** in Eventbrite
  (not draft), and that `EVENT_TOKEN` / `EVENT_ORG_ID` in Vercel are still valid.
- **Committee/sponsors page empty or broken:** check the Notion source and that
  `NOTION_TOKEN` plus the relevant DB ID are correct in Vercel env vars.
- **Can't log into a service:** every service uses "Continue with Google" via
  `admin@masca.org.au`. If it asks for an auth code, read it from the **Google
  Authenticator app** on the admin account's device. If that device is unavailable,
  use the backup recovery codes in Notion.
- **Domain/email suddenly stopped:** first check **GoDaddy** for an expired or
  unpaid domain (most common cause). If the domain is fine but the site won't
  resolve, check the **DNS records in Cloudflare** — not GoDaddy.
- **Locked out entirely:** whoever holds the `admin@` Google Workspace account and
  the Notion workspace can recover everything. That's why those two must always be
  committee-controlled.

---

## 10. Source of truth

- **Code:** `github.com/masca-aus/masca`
- **Credentials:** Notion (never the repo)
- **This document:** lives in the repo at `HANDOVER.md` — update it as things change

If you change how the site is hosted, where the domain lives, or which services it
uses, **update this file in the same pull request.** Future-you (and the next
committee) will thank you.