import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "../proxy";

describe("admin theme preference", () => {
  it("defaults a first-time admin visit to light even when the device prefers dark", () => {
    const request = new NextRequest("https://masca.org.au/admin", {
      headers: { "Sec-CH-Prefers-Color-Scheme": "dark" },
    });

    const response = proxy(request);

    expect(response.cookies.get("payload-theme")?.value).toBe("light");
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "payload-theme=light",
    );
  });

  it("preserves a returning admin user's chosen dark theme", () => {
    const request = new NextRequest("https://masca.org.au/admin", {
      headers: { cookie: "payload-theme=dark" },
    });

    const response = proxy(request);

    expect(response.cookies.get("payload-theme")).toBeUndefined();
    expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
  });
});
