// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
  waitFor,
} from "@testing-library/react";
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost } from "../../features/mediaCalendar/service";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("keeps one modal and scroll lock from creating through detail loading and editing", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.parentElement;
    },
  );
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
  fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Close post" }),
  );
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
      screen.getByRole("dialog", { name: "Post editor" }),
    ),
  );
  const title = screen.getByRole("textbox", {
    name: "Post title",
  }) as HTMLInputElement;
  expect(title.selectionStart).toBe(title.selectionEnd);
  expect(title.value).toBe("Untitled post");
  fireEvent.click(title);
  title.focus();
  fireEvent.change(title, { target: { value: "My new post" } });
  expect(title.value).toBe("My new post");
  view.unmount();
  expect(document.body.style.overflow).toBe("");
});
