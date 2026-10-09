// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  query: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.query,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  navigation.push.mockClear();
});
it("shows immediate creation feedback, prevents duplicates, and opens before refreshing the calendar", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let createCount = 0,
    overviewCount = 0,
    createPatch: Record<string, unknown> = {},
    complete!: (r: Response) => void;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return new Response(JSON.stringify({ participants: [] }));
    if (opts?.body && JSON.parse(String(opts.body)).action === "create") {
      createCount++;
      createPatch = JSON.parse(String(opts.body)).patch;
      return new Promise<Response>((resolve) => {
        complete = resolve;
      });
    }
    overviewCount++;
    if (overviewCount > 1) return new Promise<Response>(() => {});
    return new Response(
      JSON.stringify({
        posts: [],
        categories: [
          { id: "masa", name: "MASA", color: "#5959c9", archived: false },
        ],
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
  await waitFor(() =>
    expect(screen.queryByText("Loading your calendar…")).toBeNull(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Filter by MASA" }));
  const button = screen.getByRole("button", { name: "New post" });
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "Creating post" })).toBeTruthy();
  expect(document.activeElement).toBe(
    screen.getByRole("dialog", { name: "Creating post" }),
  );
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(screen.getByRole("dialog", { name: "Creating post" }), {
    key: "Tab",
  });
  expect(document.activeElement).toBe(
    screen.getByRole("dialog", { name: "Creating post" }),
  );
  fireEvent.click(button);
  expect(createCount).toBe(1);
  expect(createPatch.category).toBe("masa");
  await act(async () =>
    complete(new Response(JSON.stringify({ post: { id: "new-post" } }))),
  );
  await waitFor(() =>
    expect(navigation.push).toHaveBeenCalledWith(
      "/admin/media-calendar?post=new-post",
      { scroll: false },
    ),
  );
});
