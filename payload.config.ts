import path from "path";
import { fileURLToPath } from "url";

import { revalidatePath } from "next/cache";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig, type Field } from "payload";
import sharp from "sharp";

import { COMMITTEE_STEPS } from "./features/committee/committeeEditor.ts";
import { Organisations } from "./collections/Organisations.ts";
import { Events } from "./collections/Events.ts";
import { COMMITTEE_DEPARTMENT_OPTIONS } from "./utils/committeeDepartments";
import { editorSection } from "./utils/editorSection.ts";

export function createDatabasePoolConfig(
  connectionString: string | undefined,
  isMigration = process.env.PAYLOAD_MIGRATING === "true",
) {
  let selectedConnectionString = connectionString;

  if (connectionString && !isMigration) {
    try {
      const databaseURL = new URL(connectionString);
      const isSupabaseSharedPooler =
        databaseURL.hostname === "pooler.supabase.com" ||
        databaseURL.hostname.endsWith(".pooler.supabase.com");

      if (isSupabaseSharedPooler && databaseURL.port === "5432") {
        databaseURL.port = "6543";
        selectedConnectionString = databaseURL.toString();
      }
    } catch {
      // Let the Postgres adapter report malformed connection strings itself.
    }
  }

  return {
    connectionString: selectedConnectionString,
    // Payload holds a reconnect client and a transaction client while media
    // saves run a separate document-lock query. A two-client pool deadlocks
    // that save. Leave bounded headroom for these queries and concurrent edits.
    max: 5,
    // Exhaustion must fail visibly instead of leaving the CMS submitting forever.
    connectionTimeoutMillis: 10_000,
  };
}

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase Storage speaks the S3 protocol at <project>/storage/v1/s3; the same
// project serves public objects at <project>/storage/v1/object/public/. Files
// live in a PUBLIC bucket so images are served straight from Supabase's CDN
// instead of streaming every request through a Vercel function.
const s3Endpoint = process.env.S3_ENDPOINT || "";
const s3Bucket = process.env.S3_BUCKET || "media";
const publicFileURL = (filename: string) =>
  `${s3Endpoint.replace(/\/s3\/?$/, "")}/object/public/${s3Bucket}/${filename}`;

// Media uploads are handed straight to Supabase Storage; if the S3 env vars
// are absent the upload path dies deep inside the AWS SDK ("Region is
// missing") and the admin just sees a bare 500. Refuse to boot on Vercel
// without them so the misconfiguration is caught at deploy time instead.
if (process.env.VERCEL) {
  const missing = [
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ].filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Media uploads need Supabase Storage credentials, but the Vercel project is missing: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables and redeploy.`,
    );
  }
}

// revalidatePath only works inside a Next request; from a script or migration
// using the Local API there is no cache to invalidate, so skip rather than
// fail the whole write.
const safeRevalidatePath = (path: string) => {
  try {
    revalidatePath(path);
  } catch {
    // Outside Next (payload run scripts, migrations) — nothing to revalidate.
  }
};

// The committee page (and the homepage yearbook teaser) are statically
// rendered from this collection, so an edit in /admin must regenerate them
// on the spot — no ISR timer.
const revalidateCommitteePages = () => {
  safeRevalidatePath("/committee");
  safeRevalidatePath("/");
};

// Every page that renders the sponsors marquee is statically rendered from the
// sponsors collection, so an edit in /admin must regenerate them on the spot —
// no ISR timer. Today the marquee only appears on the homepage; add any new
// marquee-bearing page here.
const revalidateSponsorPages = () => {
  safeRevalidatePath("/");
};

// Ruthlessly minimal Payload setup (issue #3): one shared admin account in a
// single auth collection, with no roles. Events alone use drafts/versions for
// the moderated public-submission workflow.
// Supabase is a dumb Postgres host reached through the transaction-mode
// pooler — no Supabase Auth/RLS/JS client anywhere. Media uploads (issue #4)
// go to Supabase Storage via its S3-compatible API. The committee directory
// (issue #5) and the sponsors marquee (issue #6) live in the `committee` and
// `sponsors` collections and are read by the public site through the Local API.
// Moderated event submissions live in the isolated `events` collection.
export default buildConfig({
  i18n: {
    translations: {
      en: {
        version: {
          versions: "Change history",
        },
      },
    },
  },
  admin: {
    user: "users",
    meta: {
      titleSuffix: "— MASCA CMS",
      icons: [
        { rel: "icon", type: "image/x-icon", url: "/logo/favicon.ico" },
      ],
    },
    components: {
      providers: ["/components/admin/AdminNavigationEnhancements#AdminNavigationEnhancements"],
      actions: ["/components/admin/ThemeToggle#ThemeToggle"],
      graphics: {
        Logo: "/components/admin/MascaBrand#MascaLogo",
        Icon: "/components/admin/MascaBrand#MascaIcon",
      },
      views: {
        dashboard: {
          Component: "/components/admin/MascaDashboard#MascaDashboard",
        },
      },
    },
    importMap: {
      baseDir: dirname,
    },
  },
  collections: [
    Organisations,
    {
      slug: "users",
      admin: {
        useAsTitle: "email",
        description: "Manage the people who can sign in and update MASCA website content.",
        components: {
          beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
          edit: {
            beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
          },
        },
      },
      access: {
        // Payload <=3.88 permits any authenticated user to unlock another
        // account by default. Restrict the operation to the caller's own row.
        unlock: ({ req }) =>
          req.user ? { id: { equals: req.user.id } } : false,
      },
      // `auth: true` gives email+password login and the forgot-password flow;
      // reset emails go out through the Resend adapter below.
      auth: true,
      fields: [],
    },
    {
      slug: "media",
      admin: {
        useAsTitle: "filename",
        description: "Upload images only, up to 5 MB each. Add useful alt text so everyone can understand the image.",
        components: {
          beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
          edit: {
            beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
          },
        },
      },
      // Anyone may read media metadata (the files themselves are public-bucket
      // objects anyway); only the logged-in admin can create/update/delete.
      access: {
        read: () => true,
      },
      fields: [
        {
          name: "alt",
          label: "Alt text",
          type: "text",
          required: true,
          admin: {
            description: "Describe the image’s useful content in a short sentence. For a portrait, include the person’s name; for a logo, use the organisation’s name. Avoid filenames or ‘image of’.",
          },
        },
      ],
      upload: {
        // Images only — a committee member cannot upload PDFs, zips, etc.
        mimeTypes: ["image/*"],
        // The CMS uses this compact derivative in list and relation previews
        // instead of fetching a full-size original image for every row.
        // Payload resolves thumbnailURL before the storage plugin rewrites
        // size URLs, so build it from the filename instead of a local URL.
        adminThumbnail: ({ doc }) => {
          const sizes = doc.sizes as { "admin-preview"?: { filename?: string } } | undefined;
          const filename = sizes?.["admin-preview"]?.filename || doc.filename;
          return typeof filename === 'string' && filename ? publicFileURL(filename) : null;
        },
        imageSizes: [
          {
            name: "admin-preview",
            width: 480,
            height: 320,
            fit: "inside",
            withoutEnlargement: true,
            formatOptions: {
              format: "webp",
              options: { quality: 75 },
            },
          },
        ],
        // This directory needs predictable portraits, so editors do not crop
        // or choose focal points from the CMS.
        crop: false,
        focalPoint: false,
      },
    },
    {
      slug: "committee",
      admin: {
        useAsTitle: "name",
        hideAPIURL: true,
        defaultColumns: ["name", "role", "department", "year"],
        description:
          "Create and update committee profiles step by step. Changes appear on the website when you Save.",
        components: {
          beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
          edit: {
            beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
            SaveButton: "/components/admin/CommitteeEditor#CommitteeSaveControl",
          },
          views: { edit: { default: { Component: "/components/admin/CommitteeEditor#CommitteeEditorView" } } },
        },
      },
      // Anyone may read (the public site renders from this collection); only
      // the logged-in admin can create/update/delete.
      access: {
        read: () => true,
      },
      // Drag-and-drop ordering in the admin list view via Payload's hidden
      // `_order` key. The sequence is global across all years — filter the
      // list to one year before dragging; the public page filters per year,
      // so per-year relative order is all that matters.
      orderable: true,
      defaultSort: "_order",
      // Fields mirror the shape the committee page has always rendered, and
      // are validated here so bad entries are rejected at save time.
      fields: [
        { name: "committeeWizardHeader", type: "ui", admin: { components: { Field: "/components/admin/CommitteeEditor#CommitteeEditorHeader" }, disableListColumn: true, disableBulkEdit: true } },
        editorSection({
          title: "Identity",
          description: "Introduce the member as they should appear in the public directory.",
        }),
        {
          name: "name",
          type: "text",
          required: true,
        },
        {
          name: "university",
          type: "text",
          admin: {
            description: 'Full name, e.g. "Monash University". Optional.',
          },
        },
        {
          name: "course",
          type: "text",
          admin: {
            description: 'Degree or course name, e.g. "Bachelor of Commerce". Optional.',
          },
        },
        editorSection({
          title: "Role and term",
          description: "Choose the position, department and committee year. List order is managed by dragging members in the committee list.",
        }),
        {
          name: "role",
          type: "text",
          required: true,
          admin: {
            description: 'Committee position, e.g. "President".',
          },
        },
        {
          name: "department",
          type: "select",
          required: true,
          defaultValue: "unassigned",
          options: COMMITTEE_DEPARTMENT_OPTIONS,
          admin: {
            description:
              "Controls the department section on the public committee page. Use Unassigned only while reviewing legacy records.",
          },
        },
        {
          name: "year",
          type: "text",
          required: true,
          validate: (value: string | null | undefined) =>
            /^\d{4}\/\d{4}$/.test(value ?? "") ||
            'Year must be a committee term like "2026/2027".',
          admin: {
            description:
              'Committee term, e.g. "2026/2027" — drives the year tabs on the page.',
          },
        },
        editorSection({
          title: "Portrait and profile",
          description: "Choose the member portrait and add an optional LinkedIn profile.",
        }),
        {
          name: "portrait",
          type: "upload",
          relationTo: "media",
          required: true,
          displayPreview: true,
          admin: {
            description: "Choose an existing portrait or upload an image up to 5 MB. Include the member’s name in its alt text.",
          },
        },
        {
          name: "bio",
          type: "textarea",
          admin: {
            description:
            "Shown in the expanded modal on the committee page. Optional — the modal simply omits it when empty.",
          },
        },
        {
          name: "linkedin_url",
          label: "LinkedIn profile",
          type: "text",
          validate: (value: string | null | undefined) => {
            if (!value) return true;
            try {
              return (
                new URL(value).protocol === "https:" ||
                "LinkedIn URL must start with https://"
              );
            } catch {
              return "Must be a full URL, e.g. https://www.linkedin.com/in/…";
            }
          },
        },
        { name: "committeeWizardFooter", type: "ui", admin: { components: { Field: "/components/admin/CommitteeEditor#CommitteeEditorFooter" }, disableListColumn: true, disableBulkEdit: true } },
      ].map((field) => {
        const step = COMMITTEE_STEPS.findIndex(section => (section.fields as readonly string[]).includes(field.name ?? ""));
        return step < 0 ? field : { ...field, admin: { ...field.admin, className: `masca-committee-step masca-committee-step-${step}` } };
      }) as Field[],
      hooks: {
        afterChange: [revalidateCommitteePages],
        afterDelete: [revalidateCommitteePages],
      },
    },
    {
      slug: "sponsors",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "date"],
        description: "Update sponsor details and logos in one page. Changes appear on the homepage when you Save.",
        components: {
          beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
          edit: {
            beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
          },
        },
      },
      // Anyone may read (the public site renders the marquee from this
      // collection); only the logged-in admin can create/update/delete.
      access: {
        read: () => true,
      },
      // Newest partners lead the marquee.
      defaultSort: "-date",
      // Fields mirror the shape the marquee has always rendered, but the logo
      // is now an upload into Media instead of a hand-pasted URL.
      fields: [
        editorSection({
          title: "Sponsor details",
          description: "The sponsor name and date shown with MASCA's partner recognition.",
        }),
        {
          name: "name",
          type: "text",
          required: true,
          admin: {
            description: "Sponsor name — doubles as the logo's alt text.",
          },
        },
        {
          name: "date",
          type: "date",
          required: true,
          admin: {
            description:
            "When they came on board — newest sponsors lead the marquee.",
          },
        },
        editorSection({
          title: "Logo",
          description: "Choose the sponsor logo that will appear on the MASCA homepage.",
        }),
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          required: true,
          displayPreview: true,
          admin: {
            description: "Choose an existing logo or upload an image up to 5 MB. A transparent background works best.",
          },
        },
      ],
      hooks: {
        afterChange: [revalidateSponsorPages],
        afterDelete: [revalidateSponsorPages],
      },
    },
    Events,
  ],
  db: postgresAdapter({
    // Transaction-mode pooler connection string — required on Vercel
    // serverless where connections must not be held open.
    pool: createDatabasePoolConfig(process.env.DATABASE_URI),
    migrationDir: path.resolve(dirname, "migrations"),
    // Local dev points at the SAME production database, so dev mode must never
    // push schema changes directly: a push stamps a `dev` row into
    // payload_migrations, and the next `payload migrate` on Vercel hangs on an
    // interactive data-loss prompt. Schema changes go through
    // `payload migrate:create` + `payload migrate` instead.
    push: false,
  }),
  email: resendAdapter({
    apiKey: process.env.RESEND_KEY || "",
    // The org inbox anchors recovery: reset emails come from (and go to)
    // addresses the committee controls, surviving annual handover.
    defaultFromAddress: "hello@masca.org.au",
    defaultFromName: "MASCA",
  }),
  graphQL: {
    disable: true,
  },
  plugins: [
    s3Storage({
      bucket: s3Bucket,
      collections: {
        media: {
          // Serve files straight from the public bucket URL — Payload never
          // proxies file bytes, so images survive redeploys and cost no
          // serverless time.
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename }) => publicFileURL(filename),
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        },
        endpoint: s3Endpoint,
        // Supabase's S3 gateway only supports path-style addressing.
        forcePathStyle: true,
        region: process.env.S3_REGION || "",
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  telemetry: false,
  upload: {
    // Hard 5 MB cap: oversized uploads get a 413 instead of a truncated file.
    abortOnLimit: true,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
