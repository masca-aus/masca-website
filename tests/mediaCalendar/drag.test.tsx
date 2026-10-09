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
it("scrolls at the visible viewport edge even when the page is much taller", () => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("innerHeight", 800);
  let scroll = 0;
  vi.stubGlobal("scrollBy", (_x: number, y: number) => {
    scroll += y;
  });
  function Example() {
    const drag = useCalendarDrag(
      () => {},
      () => {},
    );
    return (
      <>
        <button onPointerDown={(e) => drag.pickUp(e, post)}>Pick up</button>
        <section data-drop-day="2026-10-20">Target</section>
        {drag.visual && <div role="status">Dragging</div>}
      </>
    );
  }
  render(<Example />);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => screen.getByText("Target"),
  });
  vi.spyOn(document.body, "getBoundingClientRect").mockReturnValue({
    top: 0,
    bottom: 5000,
    left: 0,
    right: 1000,
    width: 1000,
    height: 5000,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  fireEvent.pointerDown(screen.getByRole("button"), {
    button: 0,
    clientX: 10,
    clientY: 10,
  });
  fireEvent.pointerMove(document, { clientX: 80, clientY: 799 });
  act(() => frame?.(0));
  expect(scroll).toBeGreaterThan(0);
  expect(screen.getByRole("status").textContent).toBe("Dragging");
});
