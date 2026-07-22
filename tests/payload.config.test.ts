import { describe, expect, it } from "vitest";

import configPromise from "@payload-config";

describe("payload config", () => {
  it("mounts the admin panel at /admin backed by the users auth collection", async () => {
    const config = await configPromise;
    expect(config.routes.admin).toBe("/admin");
    expect(config.admin.user).toBe("users");
  });

  it("defines exactly one collection: auth-enabled users with local (password) strategy", async () => {
    const config = await configPromise;
    // Sanitization adds Payload-internal collections (payload-preferences,
    // payload-migrations, ...); beyond those there must only be `users`.
    const ours = config.collections.filter((c) => !c.slug.startsWith("payload-"));
    expect(ours).toHaveLength(1);
    const users = ours[0];
    expect(users.slug).toBe("users");
    expect(users.auth).toBeTruthy();
    expect(users.auth.disableLocalStrategy).toBeFalsy();
  });

  it("uses the Postgres adapter fed by DATABASE_URI (Supabase pooler)", async () => {
    const config = await configPromise;
    expect(config.db.name).toBe("postgres");
  });

  it("sends email (incl. password resets) through Resend from the org inbox", async () => {
    const config = await configPromise;
    const emailAdapter = await config.email;
    expect(emailAdapter).toBeTypeOf("function");
    const adapter = emailAdapter({ payload: {} as never });
    expect(adapter.name).toBe("resend-rest");
    expect(adapter.defaultFromAddress).toBe("hello@masca.org.au");
  });

  it("keeps the surface minimal: no GraphQL, no telemetry", async () => {
    const config = await configPromise;
    expect(config.graphQL.disable).toBe(true);
    expect(config.telemetry).toBe(false);
  });

  it("reads its secret from PAYLOAD_SECRET", async () => {
    const config = await configPromise;
    expect(config.secret).toBe("test-secret");
  });
});
