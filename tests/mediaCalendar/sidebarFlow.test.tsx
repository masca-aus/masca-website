// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarView } from "../../components/admin/mediaCalendar/CalendarView";
import { dayKey, moveToDay } from "../../features/mediaCalendar/dates";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("filters from the sidebar by assignment, approval, ideas and format, and resets together", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const date = moveToDay(null, dayKey(new Date().toISOString()));
  vi.stubGlobal(
    "fetch",
    async (url: string) =>
      new Response(
        JSON.stringify(
          String(url).includes("collaboration")
            ? { participants: [] }
            : {
                categories: [
                  {
                    id: "events",
                    name: "Events",
                    color: "#5959c9",
                    archived: false,
                  },
                ],
                members: [
                  { id: "1", name: "Me" },
                  { id: "2", name: "Teammate" },
                ],
                notifications: [],
                next: null,
                posts: [
                  {
                    id: "a",
                    title: "My event",
                    owner: "1",
                    category: "events",
                    plannedAt: date,
                    type: "feed",
                    status: "draft",
                    version: 1,
                    thumbnail: null,
                  },
                  {
                    id: "b",
                    title: "Team review",
                    owner: "2",
                    category: "events",
                    plannedAt: date,
                    type: "reel",
                    status: "in_review",
                    version: 1,
                    thumbnail: null,
                  },
                  {
                    id: "c",
                    title: "Future idea",
                    owner: "2",
                    category: null,
                    plannedAt: null,
                    type: "carousel",
                    status: "draft",
                    version: 1,
                    thumbnail: null,
                  },
                ],
              },
        ),
      ),
  );
  render(
    <CalendarView
      user={{
        id: "1",
        email: "test@masca.org.au",
        status: "active",
        role: "administrator",
      }}
    />,
  );
  await screen.findByRole("button", { name: "Open My event" });
  expect(
    screen.getByRole("navigation", { name: "Calendar planning" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "My posts" }));
  expect(screen.queryByRole("button", { name: "Open Team review" })).toBeNull();
  expect(screen.getByRole("button", { name: "Open My event" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Needs approval" }));
  expect(screen.getByRole("button", { name: "Open Team review" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Open My event" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Unscheduled ideas" }));
  expect(screen.getByRole("button", { name: "Open Future idea" })).toBeTruthy();
  expect(
    screen.queryByRole("button", {
      name: "Create post on " + dayKey(new Date().toISOString()),
    }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  fireEvent.click(screen.getByText("More filters"));
  fireEvent.click(screen.getByRole("button", { name: "Filter format" }));
  fireEvent.click(screen.getByRole("option", { name: "Reels" }));
  expect(screen.getByRole("button", { name: "Open Team review" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Open My event" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByRole("button", { name: "Open My event" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add content type" }));
  expect(
    screen
      .getAllByRole("textbox", { name: "Content type name" })
      .some((el) => (el as HTMLInputElement).value === "New content type"),
  ).toBe(true);
});
