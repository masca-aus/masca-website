// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { useCalendarDrag } from "../../components/admin/mediaCalendar/useCalendarDrag";
import type { Card } from "../../features/mediaCalendar/types";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const post: Card = {
  id: "test",
  title: "Test",
  type: "feed",
  category: null,
  plannedAt: null,
  status: "draft",
  onHold: false,
  version: 1,
  owner: "1",
  thumbnail: null,
};
it("uses the actual release destination even when a quick move outruns the animation frame", () => {
  vi.useFakeTimers();
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let destination: string | null | undefined;
  function Example() {
    const drag = useCalendarDrag(
      (_id, date) => {
        destination = date;
      },
      () => {},
    );
    return (
      <>
        <button onPointerDown={(e) => drag.pickUp(e, post)}>Pick up</button>
        <section data-drop-day="2026-10-20">20 October</section>
        {drag.visual && (
          <div role="status">Dragging {drag.visual.post.title}</div>
        )}
      </>
    );
  }
  render(<Example />);
  // jsdom has no hit testing; use the real rendered target as its layout boundary.
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => screen.getByText("20 October"),
  });
  fireEvent.pointerDown(screen.getByRole("button"), {
    button: 0,
    clientX: 10,
    clientY: 10,
  });
  fireEvent.pointerMove(document, { clientX: 90, clientY: 40 });
  fireEvent.pointerUp(document, { clientX: 90, clientY: 40 });
  act(() => vi.advanceTimersByTime(180));
  expect(destination).toBe("2026-10-20");
  expect(screen.queryByRole("status")).toBeNull();
});
