// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EventReportPanel } from "@/components/admin/EventReportPanel";
import {
  reportDocument,
  reportDate,
} from "@/features/events/reportPresentation";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const report = {
  period: "2026-09",
  total: 1,
  completed: 0,
  archived: 0,
  organisations: [["MASCA QLD", 1]] as [string, number][],
  states: [["QLD", 1]] as [string, number][],
  generatedAt: "2026-09-30T00:00:00Z",
  rows: [
    {
      id: 1,
      title: "<script>alert(1)</script>",
      organisation: "MASCA QLD",
      state: "QLD",
      startDate: "2026-09-01T14:30:00Z",
      lifecycle: "active",
      publication: "draft",
    },
  ],
};
it("preserves month across frequency switches and clears stale export when dates change", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => report }),
  );
  render(<EventReportPanel />);
  const select = (label: string, option: string) => {
    fireEvent.click(
      screen.getByRole("combobox", { name: new RegExp(`^${label} `) }),
    );
    fireEvent.click(screen.getByRole("option", { name: option }));
  };
  select("Month", "September");
  select("Year", "2026");
  select("Report period", "Yearly");
  expect(screen.queryByRole("combobox", { name: /^Month / })).toBeNull();
  select("Report period", "Monthly");
  expect(
    screen.getByRole("combobox", { name: /^Month / }).textContent,
  ).toContain("September");
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByRole("button", { name: "Print / save PDF" });
  expect(fetch).toHaveBeenCalledWith(
    "/api/events/report?period=2026-09",
    expect.anything(),
  );
  expect(screen.getByText("Draft")).toBeTruthy();
  select("Month", "October");
  expect(screen.queryByRole("button", { name: "Print / save PDF" })).toBeNull();
});
it("shows an actionable error and permits retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Please sign in again." }),
    }),
  );
  render(<EventReportPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Please sign in again.",
    ),
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Generate report",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
it("escapes report values, includes local date and draft status, and has print-only document structure", () => {
  const html = reportDocument(report);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Draft");
  expect(html).toContain("2 Sept 2026");
  expect(html).toContain("<thead>");
  expect(html).toContain("@page");
  expect(reportDate("2026-09-30T14:30:00Z", "QLD")).toContain("1 Oct 2026");
});

it("supports keyboard selection and Escape without committing a date", () => {
  render(<EventReportPanel />);
  const month = screen.getByRole("combobox", { name: /^Month / });
  fireEvent.keyDown(month, { key: "ArrowDown" });
  fireEvent.keyDown(month, { key: "Home" });
  fireEvent.keyDown(month, { key: "Enter" });
  expect(month.textContent).toContain("January");
  fireEvent.click(month);
  fireEvent.keyDown(month, { key: "ArrowDown" });
  fireEvent.keyDown(month, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(month.textContent).toContain("January");
});
