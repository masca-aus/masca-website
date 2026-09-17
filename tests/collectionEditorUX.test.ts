import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import configPromise from "@payload-config";

const editorCollections = ["events", "committee", "media", "sponsors", "users"];

describe("collection editor UX", () => {
  it("registers plain-language collection introductions for every editor-facing collection", async () => {
    const config = await configPromise;

    for (const slug of editorCollections) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);

      expect(collection?.admin?.components?.beforeList).toContain(
        "/components/admin/CollectionIntro#CollectionIntro",
      );
    }
  });

  it("adds visual-only sections around the event form without nesting its data", async () => {
    const config = await configPromise;
    const events = config.collections.find((collection) => collection.slug === "events");
    const fields = events?.fields ?? [];
    const sectionNames = fields
      .filter((field) => field.type === "ui")
      .map((field) => field.name);
    const fieldNames = fields.flatMap((field) =>
      "name" in field && typeof field.name === "string" ? [field.name] : [],
    );

    expect(sectionNames).toEqual([
      "publicDetailsSection",
      "imagesAndLinksSection",
      "internalDetailsSection",
      "reviewAndPublishSection",
    ]);
    expect(fieldNames.indexOf("reviewAndPublishSection")).toBeLessThan(fieldNames.indexOf("reviewStatus"));
  });

  it("adds visual-only sections to the committee and sponsor forms", async () => {
    const config = await configPromise;

    for (const [slug, expectedSections] of [
      ["committee", ["publicDetailsSection", "imagesAndLinksSection"]],
      ["sponsors", ["publicDetailsSection", "imagesAndLinksSection"]],
    ]) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);
      const sectionNames = (collection?.fields ?? [])
        .filter((field) => field.type === "ui")
        .map((field) => field.name);

      expect(sectionNames).toEqual(expectedSections);
    }
  });
});
