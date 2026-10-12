// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { RoomPresence } from "../../components/admin/mediaCalendar/RoomPresence";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("shows Live only after a successful update and reconnects after a failure", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  let updates = 0;
  vi.stubGlobal("fetch", async () => {
    updates++;
    if (updates === 2) throw new Error("Network unavailable");
    return Response.json({
      participants: [
        { userId: "1", name: "Sarah Tan", color: "#b4517a", postId: null },
      ],
    });
  });
  await act(async () => {
    render(<RoomPresence />);
  });
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Live",
  );
  expect(screen.getByText("1 online")).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000);
  });
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Reconnecting",
  );
  expect(screen.queryByText("1 online")).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000);
  });
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Live",
  );
});
it("does not claim to be live while the initial connection is still pending", () => {
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  render(<RoomPresence />);
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Connecting",
  );
  expect(screen.queryByText("Live")).toBeNull();
});
it("stops showing stale online people when an update hangs beyond the presence expiry", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  let updates = 0;
  vi.stubGlobal("fetch", () =>
    ++updates === 1
      ? Promise.resolve(
          Response.json({
            participants: [
              {
                userId: "1",
                name: "Sarah Tan",
                color: "#b4517a",
                postId: null,
              },
            ],
          }),
        )
      : new Promise(() => {}),
  );
  await act(async () => {
    render(<RoomPresence />);
  });
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Live",
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15001);
  });
  expect(screen.getByLabelText("Collaboration connection").textContent).toBe(
    "Reconnecting",
  );
  expect(screen.queryByText("1 online")).toBeNull();
});
