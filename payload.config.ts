import path from "path";
import { fileURLToPath } from "url";

import { revalidatePath } from "next/cache";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";

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
// single auth collection. No roles, drafts/versions, or extra collections.
// Supabase is a dumb Postgres host reached through the transaction-mode
// pooler — no Supabase Auth/RLS/JS client anywhere. Media uploads (issue #4)
// go to Supabase Storage via its S3-compatible API. The committee directory
// (issue #5) and the sponsors marquee (issue #6) live in the `committee` and
// `sponsors` collections and are read by the public site through the Local API.
export default buildConfig({
  admin: {
    user: "users",
    importMap: {
      baseDir: dirname,
    },
  },
  collections: [
    {
      slug: "users",
      admin: {
        useAsTitle: "email",
      },
      // `auth: true` gives email+password login and the forgot-password flow;
      // reset emails go out through the Resend adapter below.
      auth: true,
      fields: [],
    },
    {
      slug: "media",
      // Anyone may read media metadata (the files themselves are public-bucket
      // objects anyway); only the logged-in admin can create/update/delete.
      access: {
        read: () => true,
      },
      fields: [
        {
          name: "alt",
          type: "text",
          required: true,
        },
      ],
      upload: {
        // Images only — a committee member cannot upload PDFs, zips, etc.
        mimeTypes: ["image/*"],
        // Crop/focal-point UIs need sharp, which we deliberately don't ship.
        crop: false,
        focalPoint: false,
      },
    },
    {
      slug: "committee",
      admin: {
        useAsTitle: "name",
        defaultColumns: ["name", "role", "year", "order"],
      },
      // Anyone may read (the public site renders from this collection); only
      // the logged-in admin can create/update/delete.
      access: {
        read: () => true,
      },
      defaultSort: "order",
      // Fields mirror the shape the committee page has always rendered, and
      // are validated here so bad entries are rejected at save time.
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
        },
        {
          name: "role",
          type: "text",
          required: true,
          admin: {
            description: 'Committee position, e.g. "President".',
          },
        },
        {
          name: "portrait",
          type: "upload",
          relationTo: "media",
          required: true,
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
        {
          name: "order",
          type: "number",
          required: true,
          admin: {
            description:
              "Sort position within the year's grid (1 = first). Lower numbers appear first.",
          },
        },
        {
          name: "linkedin_url",
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
        {
          name: "bio",
          type: "textarea",
          required: true,
          admin: {
            description: "Shown in the expanded modal on the committee page.",
          },
        },
      ],
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
        {
          name: "name",
          type: "text",
          required: true,
          admin: {
            description: "Sponsor name — doubles as the logo's alt text.",
          },
        },
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          required: true,
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
      ],
      hooks: {
        afterChange: [revalidateSponsorPages],
        afterDelete: [revalidateSponsorPages],
      },
    },
  ],
  db: postgresAdapter({
    // Transaction-mode pooler connection string — required on Vercel
    // serverless where connections must not be held open.
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
    migrationDir: path.resolve(dirname, "migrations"),
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
