import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import configPromise from "@payload-config";

const editorCollections = ["events", "committee", "media", "sponsors", "users"];

describe("collection editor UX", () => {
  it("shows plain-language guidance beneath every collection heading", async () => {
    const config = await configPromise;

    const expectedDescriptions = {
      events:
        "Add events for MASCA students and review submissions before they appear on the website. An event appears publicly only after it is approved and published.",
      committee:
        "Keep member roles, portraits and department details accurate on the public committee page.",
      media: "Upload and organise images that can be reused across the MASCA website.",
      sponsors: "Keep partner names and logos current in the homepage sponsor marquee.",
      users: "Manage the people who can sign in and update MASCA website content.",
    };

    for (const [slug, description] of Object.entries(expectedDescriptions)) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);

      expect(collection?.admin?.description).toBe(description);
      expect(collection?.admin?.components?.beforeList).toBeUndefined();
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

  it("adds a back-to-list action to every collection document screen", async () => {
    const config = await configPromise;

    for (const slug of editorCollections) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);

      expect(collection?.admin?.components?.edit?.beforeDocumentControls).toContain(
        "/components/admin/DocumentBackLink#DocumentBackLink",
      );
    }
  });
});
