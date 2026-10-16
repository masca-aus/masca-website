// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { accessFixture } from "./helpers/accessFixture";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("reveals only the selected workspace and tool without reloading or opening editors", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph initialView="bubbles" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  expect(
    screen.queryByRole("button", { name: "View Syed in Media calendar" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "View Media calendar access" }),
  );
  expect(
    screen.getByRole("region", { name: "Media calendar members" }).textContent,
  ).toContain("Syed");
  expect(screen.queryByRole("form")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open Queensland" }));
  expect(
    screen.queryByRole("region", { name: "Media calendar members" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "View Media calendar access" }),
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("routes management to the chosen workspace and keeps account management discoverable", async () => {
  render(<AccessGraph initialView="bubbles" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "Open Queensland" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Manage Queensland access" }),
  );
  expect(
    screen.getByRole("table", { name: "Queensland members" }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: /^Members/ }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Table view" }));
  expect(screen.getByRole("button", { name: "Add person" })).toBeTruthy();
});
it("distinguishes inactive people and access managers from content permissions", () => {
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={{
        ...accessFixture,
        memberships: accessFixture.memberships.map((m) =>
          m.id === "m2" ? { ...m, manager: true } : m,
        ),
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  const managers = screen.getByRole("region", { name: "MASA access managers" });
  expect(managers.textContent).toContain("Syed");
  expect(managers.textContent).toContain("Manage membership");
  fireEvent.click(
    screen.getByRole("button", { name: "View Media calendar access" }),
  );
  expect(
    screen.getByRole("region", { name: "Media calendar members" }).textContent,
  ).toContain("Editor");
  fireEvent.click(screen.getByRole("button", { name: "Open Queensland" }));
  fireEvent.click(screen.getByRole("button", { name: "View Events access" }));
  const people = screen.getByRole("region", { name: "Events members" });
  expect(people.textContent).toContain("Suspended");
  expect(people.textContent).toContain("Expired");
  expect(within(people).queryByText("Active")).toBeNull();
});
it("keeps archived workspaces and staged access readable without mutation controls", () => {
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={{
        ...accessFixture,
        mode: "staged",
        workspaces: accessFixture.workspaces.map((w) => ({
          ...w,
          status: "archived",
        })),
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show archived" }));
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  expect(screen.getByText(/Archived workspace/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add member" })).toBeNull();
  expect(screen.queryByRole("region", { name: "People" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Workspace actions for MASA" }),
  ).toBeNull();
});

it.each([false, true])(
  "reveals offscreen details with reduced motion set to %s",
  (reduced) => {
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        x: 0,
        y: 900,
        top: 900,
        bottom: 930,
        left: 0,
        right: 100,
        width: 100,
        height: 30,
        toJSON: () => ({}),
      });
    try {
      render(
        <AccessGraph initialView="bubbles" initialSnapshot={accessFixture} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
      expect(scroll).toHaveBeenCalledWith({
        block: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
      fireEvent.click(
        screen.getByRole("button", { name: "View Media calendar access" }),
      );
      expect(scroll.mock.contexts.at(-1)).toBe(
        within(
          screen.getByRole("region", { name: "Media calendar members" }),
        ).getByRole("heading"),
      );
    } finally {
      rect.mockRestore();
      HTMLElement.prototype.scrollIntoView = original;
    }
  },
);
