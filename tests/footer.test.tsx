import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import sitemap from "../app/sitemap";
import Footer from "@/components/Footer";

const legalPaths = [
  "/privacy",
  "/terms",
  "/cookies",
  "/data-protection",
  "/accessibility",
] as const;

describe("public footer", () => {
  it("renders every legal and accessibility destination", () => {
    const html = renderToStaticMarkup(<Footer />);

    for (const path of legalPaths) {
      expect(html).toContain(`href="${path}"`);
    }
    expect(html).toContain("Cookie preferences");
    expect(html).toContain("<button");
  });

  it("includes every legal page in the public sitemap", () => {
    const paths = sitemap().map(({ url }) => new URL(url).pathname);

    for (const path of legalPaths) {
      expect(paths).toContain(path);
    }
  });
});
