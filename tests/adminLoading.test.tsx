import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLoading from "@/app/(payload)/admin/[[...segments]]/loading";

describe("CMS route loading state", () => {
  it("immediately gives an accessible, content-neutral loading state", () => {
    const html = renderToStaticMarkup(<AdminLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Loading CMS page");
    expect(html).not.toContain("event");
    expect(html).not.toContain("email");
  });
});
