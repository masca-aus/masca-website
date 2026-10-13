// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { accessFixture } from "./helpers/accessFixture";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("expands cached workspace areas without another request and shares a table snapshot", async () => {
  const fetch = vi.fn(async () => Response.json(accessFixture));
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph />);
  fireEvent.click(await screen.findByRole("button", { name: "Open MASA" }));
  expect(screen.getByRole("heading", { name: "Media calendar" })).toBeTruthy();
  expect(screen.getByText("Editor")).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Table view" }));
  expect(screen.getByRole("table")).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Syed" })).toBeTruthy();
});
it("distinguishes failed loading from an empty catalogue", async () => {
  vi.stubGlobal("fetch", async () => new Response("bad", { status: 503 }));
  render(<AccessGraph />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("No workspaces yet")).toBeNull();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});
it("uses stable IDs on rename and explains staged access", () => {
  render(
    <AccessGraph
      initialSnapshot={{
        ...accessFixture,
        mode: "staged",
        workspaces: [
          { ...accessFixture.workspaces[0], name: "MASA organising team" },
        ],
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Open MASA organising team" }),
  );
  expect(screen.getByRole("heading", { name: "Media calendar" })).toBeTruthy();
  expect(screen.getByText(/staged/i)).toBeTruthy();
});
it("shows actual expiry and suspension independently", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "Open Queensland" }));
  expect(screen.getAllByText("Suspended").length).toBeGreaterThan(0);
  expect(screen.getByText("Expired")).toBeTruthy();
});
