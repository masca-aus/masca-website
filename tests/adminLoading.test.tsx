import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLoading from "@/app/(payload)/admin/[[...segments]]/loading";

describe("CMS route loading state", () => {
  it("keeps the interface calm with an accessible, page-shaped loading state", () => {
    const html = renderToStaticMarkup(<AdminLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Preparing your workspace");
    expect(html).toContain("masca-admin-loading--document");
    expect(html).toContain("masca-admin-loading__bar");
    expect(html).not.toContain("event");
    expect(html).not.toContain("email");
  });
});
