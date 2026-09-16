import { describe, expect, it } from "vitest";

import { isAdminNavigationTarget } from "@/components/admin/adminNavigation";

describe("CMS route preloading", () => {
  it("only warms internal CMS routes", () => {
    expect(isAdminNavigationTarget("/admin")).toBe(true);
    expect(isAdminNavigationTarget("/admin/collections/events")).toBe(true);
    expect(isAdminNavigationTarget("/committee")).toBe(false);
    expect(isAdminNavigationTarget("https://www.masca.org.au/admin")).toBe(false);
    expect(isAdminNavigationTarget("/admin#settings")).toBe(false);
  });
});
