// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PostPanelLoading } from "../../components/admin/mediaCalendar/PostPanel";
afterEach(cleanup);
it("shows the editor sections and disabled publishing actions while a draft is loading", () => {
  render(<PostPanelLoading />);
  expect(screen.getByText("Creating your draft…").getAttribute("role")).toBe(
    "status",
  );
  expect(screen.getByRole("heading", { name: "Media" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Caption" })).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Instagram preview" }),
  ).toBeTruthy();
  for (const name of [
    "Copy caption",
    "Download media",
    "Duplicate",
    "Request review",
  ])
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(
      true,
    );
  expect(screen.queryByRole("textbox", { name: "Post title" })).toBeNull();
});
it("keeps a failed load actionable without displaying placeholder editor content", () => {
  const close = () => {};
  render(
    <PostPanelLoading
      error
      message="Could not open this post"
      onClose={close}
    />,
  );
  expect(screen.getByRole("alert").textContent).toBe(
    "Could not open this post",
  );
  expect(
    screen.getByRole("button", { name: "Close post" }).hasAttribute("disabled"),
  ).toBe(false);
  expect(screen.queryByRole("button", { name: "Request review" })).toBeNull();
});
