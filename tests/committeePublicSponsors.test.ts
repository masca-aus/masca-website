import { afterEach, expect, it, vi } from "vitest";
const find = vi.hoisted(() => vi.fn().mockResolvedValue({ docs: [] }));
vi.mock("payload", () => ({ getPayload: async () => ({ find }) }));
vi.mock("@payload-config", () => ({ default: {} }));
import { getSponsors } from "../utils/sponsors";
afterEach(() => {
  vi.unstubAllEnvs();
  find.mockClear();
});
it("reads sponsors through public access checks instead of bypassing private drafts", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  await getSponsors();
  expect(find).toHaveBeenCalledWith(
    expect.objectContaining({ overrideAccess: false }),
  );
});
