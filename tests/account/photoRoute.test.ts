import { afterEach, beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
const state = vi.hoisted(() => ({
  user: {
    id: 1,
    email: "sarah@masca.org.au",
    status: "active",
    sessionRevision: "r",
  } as object | null,
  photos: new Map<string, Buffer>(),
}));
vi.mock("payload", () => ({
  getPayload: async () => ({ auth: async () => ({ user: state.user }) }),
}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("../../features/account/photoRepository", () => ({
  accountPhotoInfo: async (actor: { id: number }) => ({
    userId: String(actor.id),
    photoVersion: state.photos.has(String(actor.id)) ? "v" : null,
  }),
  readAccountPhoto: async (_actor: object, id: string) => ({
    photo: state.photos.get(id)!,
    version: "v",
  }),
  saveAccountPhoto: async (actor: { id: number }, photo: Buffer | null) => {
    if (photo) state.photos.set(String(actor.id), photo);
    else state.photos.delete(String(actor.id));
    return { userId: String(actor.id), photoVersion: photo ? "v" : null };
  },
}));
import { GET, POST, DELETE } from "../../app/api/account/photo/route";
beforeEach(() => {
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  state.user = {
    id: 1,
    email: "sarah@masca.org.au",
    status: "active",
    sessionRevision: "r",
  };
  state.photos.clear();
  state.photos.set("2", Buffer.from("teammate"));
});
afterEach(() => vi.unstubAllEnvs());
it("rejects unauthenticated reads and cross-origin writes", async () => {
  state.user = null;
  expect(
    (await GET(new Request("https://masca.org.au/api/account/photo?info=true")))
      .status,
  ).toBe(401);
  expect(
    (
      await POST(
        new Request("https://masca.org.au/api/account/photo", {
          method: "POST",
          headers: { Origin: "https://other.example" },
          body: "bad",
        }),
      )
    ).status,
  ).toBe(403);
  expect(state.photos.size).toBe(1);
});
it("uses the authenticated owner for uploads and removals, even with another ID in the URL", async () => {
  const input = await sharp({
    create: { width: 20, height: 30, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const request = new Request("https://masca.org.au/api/account/photo?id=2", {
    method: "POST",
    headers: { Origin: "https://masca.org.au", "Content-Type": "image/png" },
    body: new Uint8Array(input),
  });
  const saved = await POST(request);
  expect(saved.status).toBe(200);
  expect((await saved.json()).userId).toBe("1");
  expect((await sharp(state.photos.get("1")!).metadata()).format).toBe("webp");
  expect(state.photos.get("2")!.toString()).toBe("teammate");
  const removed = await DELETE(
    new Request("https://masca.org.au/api/account/photo?id=2", {
      method: "DELETE",
      headers: { Origin: "https://masca.org.au" },
    }),
  );
  expect(removed.status).toBe(200);
  expect(state.photos.has("1")).toBe(false);
  expect(state.photos.get("2")!.toString()).toBe("teammate");
});
it("serves thumbnails privately and refuses invalid replacements", async () => {
  const read = await GET(
    new Request("https://masca.org.au/api/account/photo?id=2"),
  );
  expect(read.headers.get("cache-control")).toBe("private, no-store");
  expect(read.headers.get("x-content-type-options")).toBe("nosniff");
  const bad = await POST(
    new Request("https://masca.org.au/api/account/photo", {
      method: "POST",
      headers: {
        Origin: "https://masca.org.au",
        "Content-Type": "image/svg+xml",
      },
      body: "<svg/>",
    }),
  );
  expect(bad.status).toBe(415);
  expect(state.photos.size).toBe(1);
});
