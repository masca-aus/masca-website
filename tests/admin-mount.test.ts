import { existsSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

const app = (...p: string[]) => path.resolve(import.meta.dirname, "..", "app", ...p);

describe("admin mount structure", () => {
  it("serves the Payload admin UI from app/(payload)/admin", () => {
    expect(existsSync(app("(payload)", "layout.tsx"))).toBe(true);
    expect(existsSync(app("(payload)", "admin", "[[...segments]]", "page.tsx"))).toBe(true);
    expect(existsSync(app("(payload)", "admin", "[[...segments]]", "not-found.tsx"))).toBe(true);
    expect(existsSync(app("(payload)", "admin", "importMap.js"))).toBe(true);
  });

  it("exposes the Payload REST API (login, forgot-password) under app/(payload)/api", async () => {
    expect(existsSync(app("(payload)", "api", "[...slug]", "route.ts"))).toBe(true);
    const route = await import("../app/(payload)/api/[...slug]/route");
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"] as const) {
      expect(route[method], `${method} handler`).toBeTypeOf("function");
    }
  });

  it("keeps a single root layout per route group (frontend moved out of app root)", () => {
    // Two nested root layouts would double-render <html>; the public site must
    // live in its own route group alongside (payload).
    expect(existsSync(app("layout.tsx"))).toBe(false);
    expect(existsSync(app("(frontend)", "layout.tsx"))).toBe(true);
    expect(existsSync(app("(frontend)", "page.tsx"))).toBe(true);
  });
});
