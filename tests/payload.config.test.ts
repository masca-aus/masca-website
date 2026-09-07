import { describe, expect, it, vi } from "vitest";

const { capturedDatabasePool } = vi.hoisted(() => ({
  capturedDatabasePool: {
    connectionString: undefined as string | undefined,
    max: undefined as number | undefined,
  },
}));

vi.mock("@payloadcms/db-postgres", async () => {
  const actual = await vi.importActual<typeof import("@payloadcms/db-postgres")>(
    "@payloadcms/db-postgres",
  );

  return {
    ...actual,
    postgresAdapter: (
      options: Parameters<typeof actual.postgresAdapter>[0],
    ) => {
      capturedDatabasePool.connectionString = options.pool?.connectionString;
      capturedDatabasePool.max = options.pool?.max;
      return actual.postgresAdapter(options);
    },
  };
});

import configPromise from "@payload-config";

describe("payload config", () => {
  it("mounts the admin panel at /admin backed by the users auth collection", async () => {
    const config = await configPromise;
    expect(config.routes.admin).toBe("/admin");
    expect(config.admin.user).toBe("users");
  });

  it("brands the admin panel as the MASCA CMS", async () => {
    const config = await configPromise;
    expect(config.admin.meta.titleSuffix).toBe("— MASCA CMS");
    expect(config.admin.meta.icons).toEqual([
      { rel: "icon", type: "image/x-icon", url: "/logo/favicon.ico" },
    ]);
    expect(config.admin.components.graphics.Logo).toBeTruthy();
    expect(config.admin.components.graphics.Icon).toBeTruthy();
    expect(config.admin.components.views.dashboard.Component).toBeTruthy();
  });

  it("defines exactly four collections: auth-enabled users, media, committee, sponsors", async () => {
    const config = await configPromise;
    // Sanitization adds Payload-internal collections (payload-preferences,
    // payload-migrations, ...); beyond those there must only be `users`,
    // `media` (issue #4), `committee` (issue #5) and `sponsors` (issue #6).
    const ours = config.collections.filter((c) => !c.slug.startsWith("payload-"));
    expect(ours.map((c) => c.slug).sort()).toEqual(["committee", "media", "sponsors", "users"]);
    const users = ours.find((c) => c.slug === "users");
    expect(users?.auth).toBeTruthy();
    expect(users?.auth.disableLocalStrategy).toBeFalsy();
  });

  it("only allows an authenticated user to unlock their own account", async () => {
    const config = await configPromise;
    const users = config.collections.find((collection) => collection.slug === "users");
    const canUnlock = users?.access.unlock;

    expect(canUnlock).toBeTypeOf("function");
    expect(await canUnlock?.({ req: { user: null } } as never)).toBe(false);
    expect(
      await canUnlock?.({ req: { user: { id: 42 } } } as never),
    ).toEqual({ id: { equals: 42 } });
  });

  it("uses the Postgres adapter fed by DATABASE_URI (Supabase pooler)", async () => {
    const config = await configPromise;
    expect(config.db.name).toBe("postgres");
  });

  it("limits each serverless instance to two database connections", async () => {
    await configPromise;
    expect(capturedDatabasePool.max).toBe(2);
  });

  it("uses Supabase transaction mode for website and CMS traffic", async () => {
    await configPromise;
    expect(capturedDatabasePool.connectionString).toBe(
      "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
    );
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
