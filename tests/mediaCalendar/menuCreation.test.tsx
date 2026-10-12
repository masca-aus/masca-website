// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
import { dayKey, moveToDay } from "../../features/mediaCalendar/dates";
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  navigation.push.mockClear();
});
it("opening a scheduled card through its portalled menu never creates a draft", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let creates = 0;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return new Response(JSON.stringify({ participants: [] }));
    if (opts?.body && JSON.parse(String(opts.body)).action === "create") {
      creates++;
      return new Response(JSON.stringify({ post: { id: "unwanted" } }));
    }
    return new Response(
      JSON.stringify({
        posts: [
          {
            id: "existing",
            title: "Scheduled check",
            plannedAt: moveToDay(null, dayKey(new Date().toISOString())),
            type: "feed",
            status: "draft",
            owner: "1",
            category: null,
            version: 1,
            thumbnail: null,
          },
        ],
        categories: [],
        members: [],
        notifications: [],
        next: null,
      }),
    );
  });
  render(
    <CalendarView
      user={{
        id: "1",
        role: "administrator",
        status: "active",
        email: "test@masca.org.au",
      }}
    />,
  );
  await screen.findByRole("button", { name: "Actions for Scheduled check" });
  fireEvent.click(
    screen.getByRole("button", { name: "Actions for Scheduled check" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Open post" }));
  expect(creates).toBe(0);
  expect(navigation.push).toHaveBeenCalledWith(
    "/admin/media-calendar?post=existing",
    { scroll: false },
  );
});
