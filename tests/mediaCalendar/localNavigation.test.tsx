// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
import { newPost } from "../../features/mediaCalendar/service";
import { dayKey, moveToDay } from "../../features/mediaCalendar/dates";
// Next aliases this module to the App Router implementation in the real build.
vi.mock("next/dynamic", async () => ({
  default: (await import("next/dist/shared/lib/app-dynamic")).default,
}));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  navigation.push.mockClear();
  window.history.replaceState(null, "", "/");
});
it("opens and closes locally, keeps the selected type, and carries it into the next draft", async () => {
  window.history.replaceState(null, "", "/admin/media-calendar");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
  }));
  const user = {
    id: "1",
    email: "test@masca.org.au",
    role: "administrator" as const,
    status: "active" as const,
  };
  const categoryId = crypto.randomUUID();
  const existing = newPost(user, {
    title: "Existing event",
    category: categoryId,
    plannedAt: moveToDay(null, dayKey(new Date().toISOString())),
  });
  let created = existing,
    createPatch: Record<string, unknown> = {};
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return new Response(JSON.stringify({ participants: [], updates: [] }));
    if (opts?.body) {
      const body = JSON.parse(String(opts.body));
      if (body.action === "create") {
        createPatch = body.patch;
        created = newPost(user, body.patch);
        return new Response(JSON.stringify({ post: created }));
      }
    }
    if (new URL(String(url), "http://localhost").searchParams.has("id"))
      return new Response(
        JSON.stringify({
          post: window.location.search.includes(existing.id)
            ? existing
            : created,
          assets: [],
          pendingUploads: [],
          history: [],
        }),
      );
    return new Response(
      JSON.stringify({
        posts: [existing],
        categories: [
          { id: categoryId, name: "MASA", color: "#5959c9", archived: false },
        ],
        members: [],
        notifications: [],
        next: null,
      }),
    );
  });
  render(<CalendarView user={user} />);
  await screen.findByRole("button", { name: "Filter by MASA" });
  fireEvent.click(screen.getByRole("button", { name: "Filter by MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Existing event" }));
  expect(window.location.search).toBe(`?post=${existing.id}`);
  expect(navigation.push).not.toHaveBeenCalled();
  await screen.findByRole("textbox", { name: "Post title" });
  fireEvent.click(screen.getByRole("button", { name: "Close post" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(window.location.search).toBe("");
  expect(
    screen
      .getByRole("button", { name: "Filter by MASA" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  await screen.findByRole("textbox", { name: "Post title" });
  expect(createPatch.category).toBe(categoryId);
  expect(
    screen.getByRole("button", { name: "Post content type" }).textContent,
  ).toContain("MASA");
});
