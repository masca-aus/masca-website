import { describe, expect, it } from "vitest";

import { createDatabasePoolConfig } from "@payload-config";

describe("database connection pooling", () => {
  it("keeps Supabase session mode for migration commands", () => {
    expect(
      createDatabasePoolConfig(
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
        true,
      ),
    ).toEqual({
      connectionString:
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
      max: 2,
    });
  });

  it("uses Supabase transaction mode for serverless runtime traffic", () => {
    expect(
      createDatabasePoolConfig(
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
      ),
    ).toEqual({
      connectionString:
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
      max: 2,
    });
  });

  it("leaves non-Supabase Postgres connection strings unchanged", () => {
    expect(
      createDatabasePoolConfig("postgresql://user:pass@database.example.com:5432/app"),
    ).toEqual({
      connectionString: "postgresql://user:pass@database.example.com:5432/app",
      max: 2,
    });
  });

  it("leaves an existing Supabase transaction-mode connection unchanged", () => {
    expect(
      createDatabasePoolConfig(
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
      ),
    ).toEqual({
      connectionString:
        "postgresql://user:pass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
      max: 2,
    });
  });

  it("does not invent a connection string when DATABASE_URI is absent", () => {
    expect(createDatabasePoolConfig(undefined)).toEqual({
      connectionString: undefined,
      max: 2,
    });
  });
});
