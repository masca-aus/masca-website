// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AddToCalendar } from "../../components/admin/mediaCalendar/AddToCalendar";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const post = {
  id: "post-1",
  title: "Career night",
  plannedAt: "2026-10-20T08:00:00Z",
};
it("requires a saved date, and keeps menu Escape inside the export flow", () => {
  const { rerender } = render(
    <AddToCalendar post={{ ...post, plannedAt: null }} />,
  );
  expect(
    screen
      .getByRole("button", { name: "Add to calendar" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(screen.getByText("Add a planned date first")).toBeTruthy();
  rerender(<AddToCalendar post={post} />);
  fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Add to calendar" }),
  );
});
it("opens a draft in Google using the latest saved post, without creating it automatically", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  const { rerender } = render(<AddToCalendar post={post} />);
  fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
  rerender(
    <AddToCalendar
      post={{
        ...post,
        title: "Updated title",
        plannedAt: "2026-10-22T08:00:00Z",
      }}
    />,
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Google Calendar" }));
  const url = new URL(open.mock.calls[0][0] as string);
  expect(url.searchParams.get("text")).toBe("MASCA · Updated title");
  expect(url.searchParams.get("dates")).toMatch(/^20261022T080000Z/);
  expect(open.mock.calls[0].slice(1)).toEqual([
    "_blank",
    "noopener,noreferrer",
  ]);
  expect(screen.queryByRole("menu")).toBeNull();
});
