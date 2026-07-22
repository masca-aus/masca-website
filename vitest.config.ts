import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": path.resolve(import.meta.dirname, "payload.config.ts"),
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    // Dummy values so payload.config.ts can be imported without real secrets.
    env: {
      PAYLOAD_SECRET: "test-secret",
      DATABASE_URI: "postgresql://user:pass@localhost:6543/test",
      RESEND_KEY: "test-resend-key",
      S3_ENDPOINT: "https://test-project.storage.supabase.co/storage/v1/s3",
      S3_REGION: "ap-southeast-2",
      S3_ACCESS_KEY_ID: "test-access-key",
      S3_SECRET_ACCESS_KEY: "test-secret-key",
      S3_BUCKET: "media",
    },
  },
});
