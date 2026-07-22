import { describe, expect, it } from "vitest";

import configPromise from "@payload-config";

const getMedia = async () => {
  const config = await configPromise;
  const media = config.collections.find((c) => c.slug === "media");
  if (!media) throw new Error("media collection not found");
  return media;
};

describe("media collection (Supabase Storage uploads)", () => {
  it("is upload-enabled and restricted to images only", async () => {
    const media = await getMedia();
    expect(media.upload).toBeTruthy();
    expect(media.upload.mimeTypes).toEqual(["image/*"]);
  });

  it("never writes files to local disk (Vercel filesystem is ephemeral)", async () => {
    const media = await getMedia();
    expect(media.upload.disableLocalStorage).toBe(true);
  });

  it("caps upload size at 5 MB and rejects oversized files outright", async () => {
    const config = await configPromise;
    expect(config.upload.limits?.fileSize).toBe(5 * 1024 * 1024);
    expect(config.upload.abortOnLimit).toBe(true);
  });

  it("requires alt text on every image", async () => {
    const media = await getMedia();
    const alt = media.fields.find((f) => "name" in f && f.name === "alt");
    expect(alt).toBeDefined();
    expect(alt && "required" in alt && alt.required).toBe(true);
  });

  it("is publicly readable (portraits/logos render on the public site)", async () => {
    const media = await getMedia();
    const canRead = media.access.read({ req: { user: null } } as never);
    expect(canRead).toBe(true);
  });

  it("resolves doc URLs to the Supabase Storage public URL, not a Payload API route", async () => {
    const media = await getMedia();
    const urlField = media.fields.find((f) => "name" in f && f.name === "url");
    if (!urlField || !("hooks" in urlField)) throw new Error("url field with hooks not found");
    const hooks = urlField.hooks?.afterRead ?? [];
    expect(hooks.length).toBeGreaterThan(0);
    // Run the full afterRead chain the way Payload does: each hook receives the
    // previous hook's return as `value`. The storage plugin's hook must win.
    let url: unknown = null;
    for (const hook of hooks) {
      url = await hook({
        data: { filename: "portrait.jpg" },
        originalDoc: { filename: "portrait.jpg" },
        req: { payload: { config: { serverURL: "http://localhost:3000" } } },
        value: url,
      } as never);
    }
    // vitest env pins S3_ENDPOINT to the dummy Supabase project below.
    expect(url).toBe(
      "https://test-project.storage.supabase.co/storage/v1/object/public/media/portrait.jpg",
    );
  });
});
