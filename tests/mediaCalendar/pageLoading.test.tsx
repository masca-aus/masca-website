// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("reserves the date grid while loading and waits before showing an empty calendar", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", (url: string) =>
    String(url).includes("collaboration")
      ? Promise.resolve(Response.json({ participants: [] }))
      : new Promise<Response>((resolve) => {
          finish = resolve;
        }),
  );
  render(
    <CalendarView
      user={{
        id: "1",
        email: "qa@masca.org.au",
        role: "administrator",
        status: "active",
      }}
    />,
  );
  const loading = screen.getByRole("status", { name: "Loading calendar" });
  const dates = loading.querySelector(".mc-days");
  expect(loading.querySelectorAll(".mc-day").length).toBeGreaterThanOrEqual(28);
  expect(screen.queryByText("Your undated drafts will live here.")).toBeNull();
  expect(screen.queryByRole("button", { name: /^Create post on/ })).toBeNull();
  await act(async () => {
    finish(
      Response.json({
        posts: [],
        categories: [],
        members: [],
        notifications: [],
        next: null,
      }),
    );
  });
  expect(screen.queryByRole("status", { name: "Loading calendar" })).toBeNull();
  expect(
    screen.getAllByRole("button", { name: /^Create post on/ }).length,
  ).toBeGreaterThanOrEqual(28);
  expect(dates?.isConnected).toBe(true);
  expect(screen.getByText("Your undated drafts will live here.")).toBeTruthy();
});
