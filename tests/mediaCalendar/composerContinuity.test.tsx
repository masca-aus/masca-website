// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, act, waitFor } from "@testing-library/react";
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost } from "../../features/mediaCalendar/service";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("keeps one modal and scroll lock from creating through detail loading and editing", async () => {
  const user = {
    id: "1",
    email: "test@masca.org.au",
    role: "administrator" as const,
    status: "active" as const,
  };
  const post = newPost(user, { plannedAt: "2026-10-20T08:00:00.000Z" });
  let finish!: (response: Response) => void;
  const requests = vi.fn(
    async () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", requests);
  const props = {
    user,
    members: [],
    categories: [],
    onClose: () => {},
    onChange: () => {},
  };
  const view = render(<PostPanel {...props} id={null} />);
  const dialog = screen.getByRole("dialog", { name: "Creating post" });
  const overlay = dialog.parentElement;
  expect(requests).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe("hidden");
  view.rerender(<PostPanel {...props} id={post.id} />);
  expect(screen.getByRole("dialog", { name: "Opening post" })).toBe(dialog);
  expect(dialog.parentElement).toBe(overlay);
  await act(async () =>
    finish(
      new Response(
        JSON.stringify({ post, assets: [], pendingUploads: [], history: [] }),
      ),
    ),
  );
  await screen.findByRole("textbox", { name: "Post title" });
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(dialog.parentElement).toBe(overlay);
  expect(document.body.style.overflow).toBe("hidden");
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Post title" }),
    ),
  );
  view.unmount();
  expect(document.body.style.overflow).toBe("");
});
