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
        "Create and update committee profiles step by step. Changes appear on the website when you Save.",
      media: "Upload images only, up to 5 MB each. Add useful alt text so everyone can understand the image.",
      sponsors: "Update sponsor details and logos in one page. Changes appear on the homepage when you Save.",
      users: "Manage the people who can sign in and update MASCA website content.",
    };

    for (const [slug, description] of Object.entries(expectedDescriptions)) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);

      expect(collection?.admin?.description).toBe(description);
      expect(collection?.admin?.components?.beforeList).toContain("/components/admin/DocumentBackLink#CollectionBackLink");
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
      "eventEditorHeader",
      "publicDetailsSection",
      "imagesAndLinksSection",
      "internalDetailsSection",
      "reviewAndPublishSection",
      "eventEditorFooter",
    ]);
    expect(fieldNames.indexOf("reviewAndPublishSection")).toBeLessThan(fieldNames.indexOf("reviewStatus"));
  });

  it("adds visual-only sections to the committee and sponsor forms", async () => {
    const config = await configPromise;

    for (const [slug, expectedSections] of [
      ["committee", ["committeeWizardHeader", "identitySection", "roleAndTermSection", "portraitAndProfileSection", "committeeWizardFooter"]],
      ["sponsors", ["sponsorDetailsSection", "logoSection"]],
    ]) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);
      const sectionNames = (collection?.fields ?? [])
        .filter((field) => field.type === "ui")
        .map((field) => field.name);

      expect(sectionNames).toEqual(expectedSections);
    }
  });

  it("retains committee ordering and shows native image previews", async () => {
    const config = await configPromise;
    const committee = config.collections.find((collection) => collection.slug === "committee");
    expect(committee?.orderable).toBe(true);
    expect(committee?.defaultSort).toBe("_order");
    for (const [slug, imageField] of [["committee", "portrait"], ["sponsors", "logo"]]) {
      const collection = config.collections.find((candidate) => candidate.slug === slug);
      const field = collection?.fields.find((candidate) => "name" in candidate && candidate.name === imageField);
      expect(field).toMatchObject({ displayPreview: true });
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
