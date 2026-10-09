// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarSelect } from "../../components/admin/mediaCalendar/CalendarSelect";
afterEach(cleanup);
it("chooses a filter with the keyboard, closes, and returns focus to the trigger", () => {
  function Example() {
    const [value, setValue] = useState("all");
    return (
      <CalendarSelect
        label="Status"
        value={value}
        onChange={setValue}
        options={[
          { value: "all", label: "All statuses" },
          { value: "draft", label: "Draft" },
          { value: "approved", label: "Approved" },
        ]}
      />
    );
  }
  render(<Example />);
  const trigger = screen.getByRole("button", { name: "Status" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });
  expect(trigger.textContent).toContain("Draft");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it("dismisses a menu without changing the selected filter", () => {
  render(
    <CalendarSelect
      label="Category"
      value="a"
      onChange={() => {
        throw new Error("selection changed");
      }}
      options={[{ value: "a", label: "MASA" }]}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Category" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it("closes on viewport changes so the menu cannot remain off screen", () => {
  render(
    <CalendarSelect
      label="Category"
      value="a"
      onChange={() => {}}
      options={[{ value: "a", label: "MASA" }]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Category" }));
  fireEvent(window, new Event("resize"));
  expect(screen.queryByRole("listbox")).toBeNull();
});
