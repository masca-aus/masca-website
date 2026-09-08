import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LegalPage from "@/components/LegalPage";

describe("legal page layout", () => {
  it("keeps sections, headings and lists visually separated", () => {
    const html = renderToStaticMarkup(
      <LegalPage eyebrow="Legal" title="Example" summary="Summary">
        <section>
          <h2>First section</h2>
          <p>Introduction</p>
          <ul>
            <li>First item</li>
          </ul>
        </section>
        <section>
          <h2>Second section</h2>
          <p>More information</p>
        </section>
      </LegalPage>,
    );

    expect(html).toContain("flex flex-col gap-12");
    expect(html).toContain("lg:gap-14");
    expect(html).toContain("[&amp;_h2]:mb-5");
    expect(html).toContain("[&amp;_ul]:list-disc");
    expect(html).toContain("[&amp;_ul]:pl-6");
  });
});
