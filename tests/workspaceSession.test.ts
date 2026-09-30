import { afterEach, describe, expect, it, vi } from "vitest";
import {
  workspaceStrategy,
  signWorkspaceSession,
} from "../features/access/workspaceSession";
import {
  beginGoogleLogin,
  finishGoogleLogin,
} from "../features/access/googleOIDC";
const secret = "test-signature-secret-for-workspace";
const user = {
  id: 3,
  email: "editor@masca.org.au",
  status: "active",
  sessionRevision: "r1",
};
const payload = {
  secret,
  config: { cookiePrefix: "payload" },
  findByID: vi.fn(async () => user),
};
async function authenticate(token: string, origin?: string) {
  const headers = new Headers({
    cookie: `payload-token=${token}`,
    ...(origin ? { origin } : {}),
  });
  return workspaceStrategy.authenticate({ headers, payload } as never);
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  payload.findByID.mockResolvedValue(user);
});
describe("Google workspace sessions", () => {
  it("rejects suspended, revoked and tampered sessions", async () => {
    vi.stubEnv("GOOGLE_AUTH_ORIGIN", "https://preview.example.com");
    const token = await signWorkspaceSession(3, "r1", secret);
    expect((await authenticate(token)).user?.id).toBe(3);
    payload.findByID.mockResolvedValue({ ...user, status: "suspended" });
    expect((await authenticate(token)).user).toBeNull();
    payload.findByID.mockResolvedValue({ ...user, sessionRevision: "r2" });
    expect((await authenticate(token)).user).toBeNull();
    expect((await authenticate(token + "x")).user).toBeNull();
  });
  it("rejects foreign origins", async () => {
    vi.stubEnv("GOOGLE_AUTH_ORIGIN", "https://preview.example.com");
    expect(
      (
        await authenticate(
          await signWorkspaceSession(3, "r1", secret),
          "https://evil.example",
        )
      ).user,
    ).toBeNull();
    expect(payload.findByID).not.toHaveBeenCalled();
  });
  it("uses fixed callback, PKCE and signed state before contacting Google", async () => {
    vi.stubEnv("GOOGLE_AUTH_ORIGIN", "https://preview.example.com");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const flow = await beginGoogleLogin(secret);
    const url = new URL(flow.url);
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://preview.example.com/api/auth/google/callback",
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      finishGoogleLogin("code", "wrong", flow.transaction, secret),
    ).rejects.toThrow();
    await expect(
      finishGoogleLogin(
        "code",
        url.searchParams.get("state")!,
        flow.transaction + "x",
        secret,
      ),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
