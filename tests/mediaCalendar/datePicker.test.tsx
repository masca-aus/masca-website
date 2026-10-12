// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalendarDatePicker } from "../../components/admin/mediaCalendar/CalendarDatePicker";
afterEach(cleanup);
it("applies a selected day and time in Brisbane without saving intermediate choices", () => {
  const change = vi.fn();
  render(
    <CalendarDatePicker
      label="Planned publishing date and time"
      value="2026-09-29T08:00:00.000Z"
      onChange={change}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Planned publishing date and time" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Choose publishing date" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  fireEvent.click(screen.getByRole("button", { name: "15 October 2026" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Time in Brisbane" }), {
    target: { value: "09:30" },
  });
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
  expect(change).toHaveBeenCalledWith("2026-10-14T23:30:00.000Z");
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("keeps invalid times open and lets Escape dismiss only the picker", () => {
  const change = vi.fn(),
    outer = vi.fn();
  render(
    <div onKeyDown={outer}>
      <CalendarDatePicker
        label="Planned publishing date and time"
        value={null}
        onChange={change}
      />
    </div>,
  );
  const trigger = screen.getByRole("button", {
    name: "Planned publishing date and time",
  });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("textbox", { name: "Time in Brisbane" }), {
    target: { value: "25:99" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
  expect(screen.getByRole("alert").textContent).toContain("HH:MM");
  expect(change).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(outer).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
});
it("supports keyboard day navigation and date-only deadlines", () => {
  const change = vi.fn();
  render(
    <CalendarDatePicker
      label="Preparation deadline"
      dateOnly
      value="2026-10-10"
      onChange={change}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preparation deadline" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "10 October 2026" }), {
    key: "ArrowRight",
  });
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "11 October 2026",
  );
  fireEvent.click(screen.getByRole("button", { name: "11 October 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
  expect(change).toHaveBeenCalledWith("2026-10-11");
  expect(
    screen.queryByRole("textbox", { name: "Time in Brisbane" }),
  ).toBeNull();
});
