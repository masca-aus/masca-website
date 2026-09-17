import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "app/(payload)/custom.css"), "utf8");

describe("CMS document layout", () => {
  it("centres standard collection forms on widescreen layouts without constraining live preview", () => {
    expect(stylesheet).toContain(
      ".collection-edit:not(.collection-edit--is-live-previewing) .document-fields",
    );
    expect(stylesheet).toContain("max-width: 76rem;");
    expect(stylesheet).toContain("margin-inline: auto;");
  });
});
