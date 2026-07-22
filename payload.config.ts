import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { buildConfig } from "payload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Ruthlessly minimal Payload setup (issue #3): one shared admin account in a
// single auth collection. No roles, drafts/versions, uploads, or extra
// collections. Supabase is a dumb Postgres host reached through the
// transaction-mode pooler — no Supabase Auth/RLS/JS client anywhere.
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
  secret: process.env.PAYLOAD_SECRET || "",
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
