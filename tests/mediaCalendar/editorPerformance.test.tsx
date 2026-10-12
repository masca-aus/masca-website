// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
import { PostPanel } from "../../components/admin/mediaCalendar/PostPanel";
import { newPost, applyAction } from "../../features/mediaCalendar/service";
import type { CalendarUser, Post } from "../../features/mediaCalendar/types";
const navigation = vi.hoisted(() => ({ query: new URLSearchParams() }));
const editor = vi.hoisted(() => ({
  onPost: null as unknown as (p: Post) => void,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {} }),
  useSearchParams: () => navigation.query,
}));
// CodeMirror requires layout APIs that jsdom does not provide. Keep the actual
// calendar/composer and HTTP boundary; only replace the caption layout widget.
vi.mock("next/dynamic", () => ({
  default: () => (props: { onPost: (p: Post) => void }) => {
    editor.onPost = props.onPost;
    return <div>Caption editor</div>;
  },
}));
const user: CalendarUser = {
  id: "1",
  email: "qa@masca.org.au",
  status: "active",
  role: "administrator",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  navigation.query = new URLSearchParams();
  window.history.replaceState(null, "", "/");
});
it("opens the created draft without waiting for a second detail request", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const post = newPost(user, {});
  let detailRequests = 0;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return Response.json({ participants: [] });
    if (opts?.body) return Response.json({ post });
    if (String(url).includes("?id=")) {
      detailRequests++;
      return new Promise<Response>(() => {});
    }
    return Response.json({
      posts: [],
      categories: [],
      members: [],
      notifications: [],
      next: null,
    });
  });
  render(<CalendarView user={user} />);
  await waitFor(() =>
    expect(screen.queryByText("Loading your calendar…")).toBeNull(),
  );
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  const title = await screen.findByRole("textbox", { name: "Post title" });
  expect((title as HTMLInputElement).value).toBe("Untitled post");
  expect(detailRequests).toBe(0);
});
it("ignores asset-detail reads that finish after the editor has closed", async () => {
  const post = newPost(user, { title: "Upload snapshot" });
  let reads = 0,
    finish!: (r: Response) => void;
  vi.stubGlobal("fetch", async () => {
    reads++;
    if (reads === 1)
      return Response.json({
        post,
        assets: [],
        pendingUploads: [],
        history: [],
      });
    return new Promise<Response>((resolve) => {
      finish = resolve;
    });
  });
  const updates: Post[] = [];
  const view = render(
    <PostPanel
      id={post.id}
      user={user}
      members={[]}
      categories={[]}
      onClose={() => {}}
      onChange={(p) => updates.push(p)}
    />,
  );
  await screen.findByRole("textbox", { name: "Post title" });
  const uploaded = {
    ...post,
    version: 2,
    assets: ["00000000-0000-4000-8000-000000000001"],
  };
  act(() => editor.onPost(uploaded));
  await waitFor(() => expect(reads).toBe(2));
  view.unmount();
  await act(async () =>
    finish(
      Response.json({
        post: uploaded,
        assets: [{ id: uploaded.assets[0], thumbnailKey: "private-thumbnail" }],
        pendingUploads: [],
        history: [],
      }),
    ),
  );
  expect(updates).toHaveLength(1);
});
it("loads current details after leaving a newly created draft and returning with browser history", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let post = newPost(user, {}),
    detailRequests = 0;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return Response.json({ participants: [] });
    if (opts?.body) {
      const action = JSON.parse(String(opts.body));
      if (action.action !== "create") {
        const next = structuredClone(post);
        applyAction(next, user, action);
        post = next;
      }
      return Response.json({ post });
    }
    if (String(url).includes("?id=")) {
      detailRequests++;
      return Response.json({
        post,
        assets: [],
        pendingUploads: [],
        history: [],
      });
    }
    return Response.json({
      posts: [],
      categories: [],
      members: [],
      notifications: [],
      next: null,
    });
  });
  const view = render(<CalendarView user={user} />);
  await waitFor(() =>
    expect(screen.queryByText("Loading your calendar…")).toBeNull(),
  );
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  const title = await screen.findByRole("textbox", { name: "Post title" });
  fireEvent.change(title, { target: { value: "Current saved title" } });
  fireEvent.blur(title);
  await waitFor(() => expect(post.title).toBe("Current saved title"));
  navigation.query = new URLSearchParams({ post: post.id });
  view.rerender(<CalendarView user={user} />);
  await waitFor(() =>
    expect(screen.getByRole("dialog", { name: "Post editor" })).toBeTruthy(),
  );
  navigation.query = new URLSearchParams();
  view.rerender(<CalendarView user={user} />);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const beforeReturn = detailRequests;
  navigation.query = new URLSearchParams({ post: post.id });
  view.rerender(<CalendarView user={user} />);
  await waitFor(() =>
    expect(
      (screen.getByRole("textbox", { name: "Post title" }) as HTMLInputElement)
        .value,
    ).toBe("Current saved title"),
  );
  expect(detailRequests).toBe(beforeReturn + 1);
});
it("updates a saved title in the calendar without fetching the entire calendar or hidden history", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let post = newPost(user, {}),
    overviewRequests = 0,
    detailRequests = 0;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return Response.json({ participants: [] });
    if (opts?.body) {
      const action = JSON.parse(String(opts.body));
      if (action.action !== "create") {
        const updated = structuredClone(post);
        applyAction(updated, user, action);
        post = updated;
      }
      return Response.json({ post });
    }
    if (String(url).includes("?id=")) {
      detailRequests++;
      return Response.json({
        post,
        assets: [],
        pendingUploads: [],
        history: [],
      });
    }
    overviewRequests++;
    return Response.json({
      posts: [],
      categories: [],
      members: [],
      notifications: [],
      next: null,
    });
  });
  render(<CalendarView user={user} />);
  await waitFor(() =>
    expect(screen.queryByText("Loading your calendar…")).toBeNull(),
  );
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  const title = await screen.findByRole("textbox", { name: "Post title" });
  const baseline = { overviewRequests, detailRequests };
  fireEvent.change(title, { target: { value: "Updated immediately" } });
  fireEvent.blur(title);
  await waitFor(() => expect(post.title).toBe("Updated immediately"));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Open Updated immediately/ }),
    ).toBeTruthy(),
  );
  expect(overviewRequests).toBe(baseline.overviewRequests);
  expect(detailRequests).toBe(baseline.detailRequests);
  const history = screen
    .getByText("Activity & review history")
    .closest("details")!;
  history.open = true;
  fireEvent(history, new Event("toggle"));
  await waitFor(() => expect(detailRequests).toBe(baseline.detailRequests + 1));
});
