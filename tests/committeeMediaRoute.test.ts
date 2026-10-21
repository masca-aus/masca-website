import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CommitteeAccount } from "../features/access/committeePolicy";
const state = vi.hoisted(() => ({
  media: {
    id: 88,
    filename: "poster.jpg",
    prefix: "committee-private",
    owningScope: "QLD",
    accessPublished: false,
  },
  user: null as CommitteeAccount | null,
  draftAccess: false,
  publicAccess: false,
  find: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({
  getPayload: async () => ({
    find: state.find,
    auth: async () => ({ user: state.user }),
  }),
  createLocalReq: async ({ user }: { user: CommitteeAccount }) => ({ user }),
}));
vi.mock("../features/mediaCalendar/assets", () => ({
  privateStorage: () => ({ bucket: "private-files", s3: { send: state.send } }),
}));
import { GET } from "../app/api/committee-media/route";
beforeEach(() => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  vi.stubEnv("S3_BUCKET", "public-files");
  state.media = {
    id: 88,
    filename: "poster.jpg",
    prefix: "committee-private",
    owningScope: "QLD",
    accessPublished: false,
  };
  state.user = null;
  state.draftAccess = false;
  state.publicAccess = false;
  state.find
    .mockReset()
    .mockImplementation(
      async (options: { collection: string; draft?: boolean }) => ({
        docs:
          options.collection === "media"
            ? [state.media]
            : options.collection === "events" &&
                ((options.draft && state.draftAccess) ||
                  (!options.draft && state.publicAccess))
              ? [{ id: 5, _status: options.draft ? "draft" : "published" }]
              : [],
      }),
    );
  state.send
    .mockReset()
    .mockResolvedValue({
      ContentType: "image/jpeg",
      Body: { transformToByteArray: async () => new Uint8Array([1, 2]) },
    });
});
afterEach(() => vi.unstubAllEnvs());
const request = () =>
  new Request("https://masca.org.au/api/committee-media?filename=poster.jpg");
it("serves legacy published images from their existing public storage key", async () => {
  state.media.prefix = "";
  state.media.accessPublished = true;
  expect((await GET(request())).status).toBe(200);
  expect(state.send.mock.calls[0][0].input).toMatchObject({
    Bucket: "public-files",
    Key: "poster.jpg",
  });
});
it("allows a draft attachment through an authorized parent without media-library access", async () => {
  state.user = {
    id: 1,
    email: "member@masca.org.au",
    status: "active",
    role: "editor",
    accessModel: "committee",
    committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
    committeeMemberships: [],
  };
  state.draftAccess = true;
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(state.find).toHaveBeenCalledWith(
    expect.objectContaining({
      collection: "events",
      draft: true,
      overrideAccess: false,
      req: { user: state.user },
    }),
  );
  expect(state.send.mock.calls[0][0].input).toMatchObject({
    Bucket: "private-files",
    Key: "committee-private/poster.jpg",
  });
  state.draftAccess = false;
  state.send.mockClear();
  expect((await GET(request())).status).toBe(404);
  expect(state.send).not.toHaveBeenCalled();
});
it("exposes published attachments without exposing private draft files", async () => {
  expect((await GET(request())).status).toBe(404);
  state.publicAccess = true;
  expect((await GET(request())).status).toBe(200);
  expect(state.find).toHaveBeenCalledWith(
    expect.objectContaining({
      collection: "events",
      draft: false,
      overrideAccess: false,
    }),
  );
});
