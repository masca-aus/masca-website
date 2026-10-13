// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost } from "../../features/mediaCalendar/service";
const widget = vi.hoisted(() => ({
  ready: null as null | (() => void),
  onPost: null as
    null | ((post: import("../../features/mediaCalendar/types").Post) => void),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {} }) }));
vi.mock("next/dynamic", () => ({
  default:
    () =>
    (props: {
      onReady: () => void;
      onPost: NonNullable<typeof widget.onPost>;
    }) => {
      widget.ready = props.onReady;
      widget.onPost = props.onPost;
      return <div>Caption initialized</div>;
    },
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  widget.ready = null;
  widget.onPost = null;
});
const user = {
  id: "1",
  email: "qa@masca.org.au",
  role: "administrator" as const,
  status: "active" as const,
};
const base = {
  user,
  members: [],
  categories: [],
  onClose: () => {},
  onChange: () => {},
};
it("reveals the form and preview together only after caption initialization", async () => {
  const post = newPost(user, {});
  render(<PostPanel {...base} id={post.id} initialPost={post} />);
  await waitFor(() => expect(widget.ready).toBeTypeOf("function"));
  expect(screen.queryByRole("textbox", { name: "Post title" })).toBeNull();
  expect(
    screen.queryByRole("region", { name: "Instagram preview" }),
  ).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Request review" })
      .hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => widget.ready!());
  expect(
    await screen.findByRole("textbox", { name: "Post title" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Instagram preview" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Request review" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
it("does not let readiness from the previous post reveal a different post", async () => {
  const first = newPost(user, {}),
    second = newPost(user, { title: "Second post" });
  const view = render(
    <PostPanel {...base} id={first.id} initialPost={first} />,
  );
  await waitFor(() => expect(widget.ready).toBeTypeOf("function"));
  const oldReady = widget.ready!;
  widget.ready = null;
  view.rerender(<PostPanel {...base} id={second.id} initialPost={second} />);
  await waitFor(() => expect(widget.ready).toBeTypeOf("function"));
  await act(async () => oldReady());
  expect(screen.queryByRole("textbox", { name: "Post title" })).toBeNull();
  await act(async () => widget.ready!());
  expect(
    (
      (await screen.findByRole("textbox", {
        name: "Post title",
      })) as HTMLInputElement
    ).value,
  ).toBe("Second post");
});
it("can close a saved draft while its caption is still initializing", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const close = vi.fn(),
    post = newPost(user, {});
  render(
    <PostPanel {...base} onClose={close} id={post.id} initialPost={post} />,
  );
  await waitFor(() => expect(widget.ready).toBeTypeOf("function"));
  fireEvent.click(screen.getByRole("button", { name: "Close post" }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it("reveals guarded recovery if a post is deleted before its caption initializes", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  const close = vi.fn(),
    post = newPost(user, { title: "Keep these details" });
  render(
    <PostPanel {...base} onClose={close} id={post.id} initialPost={post} />,
  );
  await waitFor(() => expect(widget.onPost).toBeTypeOf("function"));
  await act(async () =>
    widget.onPost!({
      ...post,
      version: 2,
      deletedAt: new Date().toISOString(),
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "This post was deleted" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("textbox", { name: "Local copy of deleted post" })
      .textContent,
  ).toContain("Keep these details");
  fireEvent.click(screen.getByRole("button", { name: "Close post" }));
  expect(close).not.toHaveBeenCalled();
});
