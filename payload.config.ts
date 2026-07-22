import path from "path";
import { fileURLToPath } from "url";

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

// Ruthlessly minimal Payload setup (issue #3): one shared admin account in a
// single auth collection. No roles, drafts/versions, or extra collections.
// Supabase is a dumb Postgres host reached through the transaction-mode
// pooler — no Supabase Auth/RLS/JS client anywhere. Media uploads (issue #4)
// go to Supabase Storage via its S3-compatible API.
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
