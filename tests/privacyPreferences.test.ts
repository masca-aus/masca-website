import { describe, expect, it } from "vitest";

import {
  createPrivacyPreferences,
  parsePrivacyPreferences,
  shouldLoadAnalytics,
} from "@/utils/privacyPreferences";

describe("privacy preferences", () => {
  it("keeps optional analytics off on a first visit", () => {
    expect(shouldLoadAnalytics(null)).toBe(false);
  });

  it("loads analytics only after the visitor explicitly allows it", () => {
    const saved = JSON.stringify(
      createPrivacyPreferences(true, "2026-09-08T00:00:00.000Z"),
    );

    expect(shouldLoadAnalytics(saved)).toBe(true);
  });

  it("remembers a necessary-only choice without loading analytics", () => {
    const saved = JSON.stringify(
      createPrivacyPreferences(false, "2026-09-08T00:00:00.000Z"),
    );

    expect(parsePrivacyPreferences(saved)).toEqual({
      analytics: false,
      savedAt: "2026-09-08T00:00:00.000Z",
      version: 1,
    });
    expect(shouldLoadAnalytics(saved)).toBe(false);
  });

  it("treats malformed or outdated preferences as a new visit", () => {
    expect(parsePrivacyPreferences("not-json")).toBeNull();
    expect(
      parsePrivacyPreferences(
        JSON.stringify({ analytics: true, savedAt: "2025-01-01", version: 0 }),
      ),
    ).toBeNull();
  });
});
