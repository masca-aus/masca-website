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
});
