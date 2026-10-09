// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarCard } from "../../components/admin/mediaCalendar/CalendarCard";
import type { Card } from "../../features/mediaCalendar/types";
afterEach(cleanup);
const post: Card = {
  id: "example",
  title: "Career night",
  type: "feed",
  category: null,
  plannedAt: null,
  status: "approved",
  onHold: false,
  version: 3,
  owner: "1",
  thumbnail: null,
};
it("opens the same actions from right click and the visible menu button", () => {
  let action = "";
  render(
    <CalendarCard
      post={post}
      editable
      open={() => {}}
      onAction={(value) => {
        action = value;
      }}
    />,
  );
  fireEvent.contextMenu(
    screen.getByRole("button", { name: "Open Career night" }),
    { clientX: 40, clientY: 40 },
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Move to draft" }));
  expect(action).toBe("draft");
  fireEvent.click(
    screen.getByRole("button", { name: "Actions for Career night" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
  expect(action).toBe("delete");
});
it("keeps posted history immutable and hides editing actions from viewers", () => {
  const { rerender } = render(
    <CalendarCard
      post={{ ...post, status: "posted" }}
      editable
      open={() => {}}
      onAction={() => {}}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Actions for Career night" }),
  );
  expect(screen.queryByRole("menuitem", { name: "Move to draft" })).toBeNull();
  rerender(<CalendarCard post={post} editable={false} open={() => {}} />);
  expect(
    screen.queryByRole("button", { name: "Actions for Career night" }),
  ).toBeNull();
});
