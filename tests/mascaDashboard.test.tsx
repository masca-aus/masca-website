import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MascaDashboard } from "@/components/admin/MascaDashboard";

describe("MASCA CMS dashboard", () => {
  it("centres its capped-width content in the available admin viewport", () => {
    const html = renderToStaticMarkup(<MascaDashboard />);

    expect(html).toContain(
      '<main class="masca-dashboard" style="margin-inline:auto">',
    );
  });
});
