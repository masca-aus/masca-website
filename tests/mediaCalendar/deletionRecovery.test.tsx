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
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost } from "../../features/mediaCalendar/service";
import type { CalendarUser } from "../../features/mediaCalendar/types";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const user: CalendarUser = {
  id: "1",
  email: "test@masca.org.au",
  role: "administrator",
  status: "active",
};
it("keeps a deleted editor open after storage failure until the local changes are copied", async () => {
  const post = {
    ...newPost(user, { title: "My local title" }),
    deletedAt: new Date().toISOString(),
  };
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ post, assets: [], pendingUploads: [], history: [] }),
      ),
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  let exported = "",
    closed = false;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        exported = text;
      },
    },
  });
  render(
    <PostPanel
      id={post.id}
      user={user}
      members={[]}
      categories={[]}
      onClose={() => {
        closed = true;
      }}
      onChange={() => {}}
    />,
  );
  await screen.findByRole("heading", { name: "This post was deleted" });
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close post" }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Close post" }));
  expect(closed).toBe(false);
  expect(
    screen.getByRole("textbox", { name: "Local copy of deleted post" })
      .textContent,
  ).toContain("My local title");
  fireEvent.click(screen.getByRole("button", { name: "Copy my changes" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy(),
  );
  expect(exported).toContain("My local title");
  fireEvent.click(screen.getByRole("button", { name: "Close post" }));
  await waitFor(() => expect(closed).toBe(true));
});
