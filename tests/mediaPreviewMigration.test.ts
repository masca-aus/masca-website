import { describe, expect, it, vi } from "vitest";

import { up } from "@/migrations/20260917_010000_add_media_admin_previews";

describe("media preview migration", () => {
  it("adds every column Payload needs for the admin preview", async () => {
    const execute = vi.fn();

    await up({ db: { execute } } as never);

    const statement = JSON.stringify(execute.mock.calls[0][0]);
    expect(statement).toContain("focal_x");
    expect(statement).toContain("sizes_admin_preview_url");
    expect(statement).toContain("sizes_admin_preview_filename");
  });
});
