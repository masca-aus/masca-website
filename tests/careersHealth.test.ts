import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/(frontend)/careers/health/route";
import { formatHealthReport } from "@/utils/careersHealth";
import type { CareerBoardReport } from "@/utils/careersSource";
import type { Job } from "@/utils/careers";

const NOW = new Date("2026-09-14T05:42:00Z"); // 3:42 pm in Melbourne (AEST)

const job: Job = {
  id: "kopi-barista",
  row: 4,
  title: "Weekend Barista",
  company: "Kopi Corner",
  type: "casual",
  country: { key: "australia", label: "Australia" },
  state: { key: "victoria", label: "Victoria" },
  location: "Victoria",
  international: "yes",
  studyLevels: ["any"],
  applyHref: "mailto:jobs@kopi.example",
  applyKind: "email",
  tags: [],
  featured: true,
  isNew: false,
  isClosingSoon: false,
};

const okReport: CareerBoardReport = {
  status: "ok",
  jobs: [job],
  hidden: [{ row: 9, reason: "unpublished", message: "Published is unticked", title: "Draft — Somewhere" }],
  warnings: ['Row 4: Location "Melb CBD" isn\'t a state or one of the options — filed under Other'],
  info: ["Ignored columns (not used by the site): Owner"],
  today: "2026-09-14",
  config: { sheetId: "abc123DEF456", gid: "0" },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatHealthReport", () => {
  it("lays out the verdict, live roles, hidden rows, warnings and notes", () => {
    const text = formatHealthReport(okReport, NOW);
    expect(text).toContain("Checked: 14 Sept 2026, 3:42 pm (Melbourne)");
    expect(text).toContain("Sheet:   connected (tab gid 0)");
    expect(text).not.toContain("abc123DEF456");
    expect(text).toContain("Status:  OK");
    expect(text).toContain("Live on the site: 1 role");
    expect(text).toMatch(/Row 4\s+Weekend Barista — Kopi Corner\s+featured, Rolling applications/);
    expect(text).toContain("Hidden: 1 row");
    expect(text).toMatch(/Row 9\s+Published is unticked\s+Draft — Somewhere/);
    expect(text).toContain("Warnings: 1");
    expect(text).toContain('Row 4: Location "Melb CBD"');
    expect(text).toContain("Notes\n  Ignored columns");
    expect(text).toContain("updates within 5 minutes");
  });

  it("leads with the problem and the fix when the sheet can't be read", () => {
    const text = formatHealthReport(
      {
        ...okReport,
        status: "not-shared",
        jobs: [],
        hidden: [],
        warnings: [],
        info: [],
        error: {
          title: "Google asked us to sign in — the sheet isn't shared publicly.",
          detail: "Expected CSV, received text/html.",
          fix: 'Share → General access → "Anyone with the link" → Viewer.',
        },
      },
      NOW,
    );
    expect(text).toContain("Status:  PROBLEM — sheet not shared");
    expect(text).toContain("Fix: Share → General access");
    expect(text).not.toContain("Live on the site");
  });
});

describe("GET /careers/health", () => {
  it("answers 200 text/plain, uncached and noindex, even when unconfigured", async () => {
    vi.stubEnv("CAREERS_SHEET_ID", "");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    const text = await res.text();
    expect(text).toContain("Status:  NOT CONNECTED");
    expect(text).toContain("CAREERS_SHEET_ID");
  });
});
