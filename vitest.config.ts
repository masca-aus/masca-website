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
    },
  },
});
