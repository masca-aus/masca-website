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
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {} }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function setup({ reject = false, viewer = false, archived = false } = {}) {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let category = {
    id: "6135c336-0b1a-441e-9659-fb650682ed9e",
    name: "Events",
    color: "#5959c9",
    archived,
  };
  const post = {
    id: "post",
    title: "Community night",
    owner: "1",
    category: archived ? null : category.id,
    plannedAt: null,
    type: "feed",
    status: "draft",
    version: 1,
    thumbnail: null,
  };
  let purged = false;
  vi.stubGlobal("fetch", async (url: string, opts?: RequestInit) => {
    if (String(url).includes("collaboration"))
      return new Response(JSON.stringify({ participants: [] }));
    if (opts?.body) {
      const body = JSON.parse(String(opts.body));
      if (body.action === "delete-category") {
        purged = true;
        return new Response(JSON.stringify({ deletedId: body.id }));
      }
      if (body.action === "category") {
        if (reject)
          return new Response(
            JSON.stringify({ error: "Could not save this content type." }),
            { status: 503 },
          );
        category = body.category;
        return new Response(JSON.stringify({ category }));
      }
    }
    return new Response(
      JSON.stringify({
        posts: [post],
        categories: purged ? [] : [category],
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
        email: "test@masca.org.au",
        status: "active",
        role: viewer ? "editor" : "administrator",
        calendarAccess: {
          view: true,
          edit: !viewer,
          approve: false,
          designation: null,
        },
      }}
    />,
  );
}
it("renames and recolours a type from its context menu while retaining its posts", async () => {
  setup();
  const tag = await screen.findByRole("button", { name: "Filter by Events" });
  fireEvent.click(tag);
  fireEvent.contextMenu(tag, { clientX: 120, clientY: 100 });
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  const input = screen.getByRole("textbox", { name: "Content type name" });
  expect((input as HTMLInputElement).value).toBe("Events");
  fireEvent.change(input, { target: { value: "Recruitment" } });
  fireEvent.click(screen.getByRole("button", { name: "Teal" }));
  fireEvent.submit(screen.getByRole("form", { name: "Edit content type" }));
  const renamed = await screen.findByRole("button", {
    name: "Filter by Recruitment",
  });
  expect(renamed.getAttribute("aria-pressed")).toBe("true");
  expect(renamed.querySelector("i")?.style.background).toBe(
    "rgb(51, 127, 156)",
  );
  expect(
    screen.getByRole("button", { name: "Open Community night" }).textContent,
  ).toContain("Recruitment");
  fireEvent.click(
    screen.getByRole("button", { name: "Actions for Recruitment" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Change colour" }));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Content type name",
      }) as HTMLInputElement
    ).value,
  ).toBe("Recruitment");
});
it("deletes the selected type from the sidebar, preserves posts, and restores it inline", async () => {
  setup();
  const tag = await screen.findByRole("button", { name: "Filter by Events" });
  fireEvent.click(tag);
  fireEvent.contextMenu(tag);
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Filter by Events" }),
    ).toBeNull(),
  );
  expect(
    screen
      .getByRole("button", { name: "Filter by all content types" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen.getByRole("button", { name: "Open Community night" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo delete Events" }));
  expect(
    await screen.findByRole("button", { name: "Filter by Events" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Undo delete Events" }),
  ).toBeNull();
});
it("keeps the type when deletion fails and does not offer editing to viewers", async () => {
  setup({ reject: true });
  const tag = await screen.findByRole("button", { name: "Filter by Events" });
  fireEvent.contextMenu(tag);
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Could not save this content type.",
  );
  expect(screen.getByRole("button", { name: "Filter by Events" })).toBeTruthy();
  cleanup();
  setup({ viewer: true });
  fireEvent.contextMenu(
    await screen.findByRole("button", { name: "Filter by Events" }),
  );
  expect(screen.queryByRole("menu")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Actions for Events" }),
  ).toBeNull();
});

it("requires an inline confirmation before removing an unused deleted type permanently", async () => {
  setup({ archived: true });
  fireEvent.click(await screen.findByRole("button", { name: /Deleted types/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Delete permanently Events" }),
  );
  expect(
    screen.getByRole("group", { name: "Delete Events permanently" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel permanent deletion" }),
  );
  expect(
    screen.getByRole("button", { name: "Restore content type Events" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Delete permanently Events" }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirm permanent deletion of Events",
    }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Restore content type Events" }),
    ).toBeNull(),
  );
  expect(
    screen.getByRole("button", { name: "Open Community night" }),
  ).toBeTruthy();
});
