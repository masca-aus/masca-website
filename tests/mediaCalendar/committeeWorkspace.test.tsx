// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("owningScope=QLD"),
  useRouter: () => ({ push() {} }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps workspace selection in creation, overview and presence requests", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const requests: {
    url: string;
    body: { action?: string; owningScope?: string } | null;
  }[] = [];
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    const body = opts?.body ? JSON.parse(String(opts.body)) : null;
    requests.push({ url: String(url), body });
    if (body?.action === "create") return new Promise(() => {});
    return new Response(
      JSON.stringify(
        String(url).includes("collaboration")
          ? { participants: [] }
          : {
              posts: [],
              categories: [],
              members: [],
              notifications: [],
              next: null,
            },
      ),
    );
  });
  render(
    <CalendarView
      user={{
        id: "1",
        email: "one@masca.org.au",
        status: "active",
        role: "editor",
        accessModel: "committee",
        committeeAccessReviewedAt: "2026-01-01",
        committeeMemberships: [
          {
            id: "m",
            committee: "QLD",
            roles: { mediaCalendar: ["editor"] },
            expiresAt: "2099-01-01T00:00:00Z",
            manager: false,
          },
        ],
      }}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Committee workspace" }),
    ).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  expect(
    requests.find((r) => r.body?.action === "create")?.body?.owningScope,
  ).toBe("QLD");
  expect(requests.some((r) => r.url.includes("owningScope=QLD"))).toBe(true);
  expect(
    requests.find((r) => r.url.includes("collaboration"))?.body?.owningScope,
  ).toBe("QLD");
});
