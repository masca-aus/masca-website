import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ConsentBanner,
  PreferencesDialog,
} from "@/components/PrivacyPreferences";

describe("privacy preference controls", () => {
  it("offers an informed choice on a visitor's first visit", () => {
    const html = renderToStaticMarkup(
      <ConsentBanner
        onAllowAnalytics={vi.fn()}
        onNecessaryOnly={vi.fn()}
        onManagePreferences={vi.fn()}
      />,
    );

    expect(html).toContain("Your privacy, your choice");
    expect(html).toContain("Allow analytics");
    expect(html).toContain("Necessary only");
    expect(html).toContain("Manage preferences");
    expect(html).toContain('href="/cookies"');
  });

  it("exposes an accessible preference dialog with necessary storage locked on", () => {
    const html = renderToStaticMarkup(
      <PreferencesDialog
        analyticsAllowed={false}
        onAnalyticsChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Necessary storage");
    expect(html).toContain("Always on");
    expect(html).toContain("Optional analytics");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Save preferences");
  });
});
