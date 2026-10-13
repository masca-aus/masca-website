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
it("opens the editor inside the clicked area and saves only after review", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  const form = screen.getByRole("form", { name: "Add access to Events" });
  expect(form.closest('[aria-label="Events access"]')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Person" }));
  fireEvent.click(screen.getByRole("option", { name: "Syed" }));
  expect(
    screen.getByText(/Other area roles and the existing term stay unchanged/),
  ).toBeTruthy();
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "assignArea",
    workspaceId: "ws-masa",
    area: "events",
    roles: ["viewer"],
    targetId: "2",
    expectedRevision: "p1",
  });
  expect(screen.queryByRole("form")).toBeNull();
});
it("cancel and Escape restore the original add control", async () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  const add = screen.getByRole("button", { name: "Add person to Events" });
  fireEvent.click(add);
  fireEvent.keyDown(screen.getByRole("form"), { key: "Escape" });
  expect(screen.queryByRole("form")).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(add));
  fireEvent.click(add);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form")).toBeNull();
});
it("keeps a rejected save and user input inline", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    throw Error("Your authority has changed.");
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  fireEvent.click(screen.getByRole("button", { name: "Person" }));
  fireEvent.click(screen.getByRole("option", { name: "Syed" }));
  fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("changed"),
  );
  expect(screen.getByRole("button", { name: "Person" }).textContent).toContain(
    "Syed",
  );
});
it("creates workspace and tools inline without creating a membership", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Add workspace" }));
  const f = screen.getByRole("form", { name: "Create workspace" });
  expect(f.closest(".ag-workspaces")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Workspace name" }), {
    target: { value: "New team" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "Events" }));
  fireEvent.submit(f);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "createWorkspace",
    name: "New team",
    areas: ["events"],
  });
});
it("rejects invalid email locally without losing input or writing access", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Add person" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "New member" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "MASCA email" }), {
    target: { value: "person@gmail.com" },
  });
  fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("@masca.org.au"),
  );
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "MASCA email" })).toHaveProperty(
    "value",
    "person@gmail.com",
  );
});
it("configures tools inside the workspace and leaves membership grants out of the request", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Manage tools" }));
  const f = screen.getByRole("form", { name: "Manage workspace tools" });
  expect(f.closest('[aria-label="MASA workspace"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: "Careers" }));
  fireEvent.submit(f);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "configureWorkspace",
    areas: ["events", "mediaCalendar", "careers"],
  });
  expect(save.mock.calls[0][0]).not.toHaveProperty("membership");
});
it("a pointer drop proposes inline access and can close without a write", async () => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  const area = screen.getByRole("region", { name: "Events access" });
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => area,
  });
  const person = screen.getByRole("button", { name: /Syed.*Active account/ });
  fireEvent.pointerDown(person, { button: 0, clientX: 5, clientY: 5 });
  fireEvent.pointerMove(window, { clientX: 40, clientY: 40 });
  fireEvent.pointerUp(window, { clientX: 40, clientY: 40 });
  expect(
    await screen.findByRole("form", { name: "Add access to Events" }),
  ).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
  expect(screen.queryByRole("form")).toBeNull();
  expect(document.body.classList.contains("ag-dragging")).toBe(false);
});
it("holds a conflict for explicit re-review and prevents a duplicate submit", async () => {
  const { AccessSaveError } =
    await import("../components/admin/access/inlineTypes");
  const save = vi.fn(async (input: unknown) => {
    void input;
    throw new AccessSaveError("Changed access. Review it.", 409);
  });
  vi.stubGlobal("fetch", async () => Response.json(accessFixture));
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  fireEvent.click(screen.getByRole("button", { name: "Person" }));
  fireEvent.click(screen.getByRole("option", { name: "Syed" }));
  const form = screen.getByRole("form");
  fireEvent.submit(form);
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Review latest access" });
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Save access" })).toHaveProperty(
    "disabled",
    true,
  );
  fireEvent.click(screen.getByRole("button", { name: "Review latest access" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save access" })).toHaveProperty(
      "disabled",
      false,
    ),
  );
  expect(screen.getByRole("button", { name: "Person" }).textContent).toContain(
    "Syed",
  );
});
it("reviews workspace archiving inline before the explicit save", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "Open MASA" }));
  fireEvent.click(screen.getByRole("button", { name: "Manage tools" }));
  fireEvent.click(screen.getByRole("button", { name: "Archive workspace" }));
  expect(save).not.toHaveBeenCalled();
  expect(
    screen.getByText(/Published website content keeps its current visibility/),
  ).toBeTruthy();
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "archiveWorkspace",
    expectedRevision: "w1",
  });
});
