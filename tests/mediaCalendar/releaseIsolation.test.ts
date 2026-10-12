import { afterEach, expect, it, vi } from "vitest";
import { up } from "../../migrations/20261010_140000_media_calendar";

afterEach(() => vi.unstubAllEnvs());
it("refuses to journal a preview calendar migration against live CMS users", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "false");
  const execute = vi.fn();
  await expect(up({ db: { execute } } as never)).rejects.toThrow(/isolated/i);
  expect(execute).not.toHaveBeenCalled();
});
it("creates the production calendar even when preview flags remain configured", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  const execute = vi.fn();
  await up({ db: { execute } } as never);
  const statement = JSON.stringify(execute.mock.calls[0][0]);
  expect(statement).toContain('media_calendar');
  expect(statement).not.toContain('media_calendar_preview');
  expect(statement).toContain('public');
});
