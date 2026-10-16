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
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
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
  render(<AccessGraph initialView="manage" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
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
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
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
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add workspace" }));
  const f = screen.getByRole("form", { name: "Create workspace" });
  expect(f.closest(".ag-management-panel")).toBeTruthy();
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
  render(
    <AccessGraph
      initialView="table"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
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
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(screen.getByRole("button", { name: "Add tool" }));
  const f = screen.getByRole("form", { name: "Manage workspace tools" });
  expect(f.closest('[aria-label="MASA access management"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: "Careers" }));
  fireEvent.submit(f);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "configureWorkspace",
    areas: ["events", "mediaCalendar", "careers"],
  });
  expect(save.mock.calls[0][0]).not.toHaveProperty("membership");
});
it("holds a conflict for explicit re-review and prevents a duplicate submit", async () => {
  const { AccessSaveError } =
    await import("../components/admin/access/inlineTypes");
  const save = vi.fn(async (input: unknown) => {
    void input;
    throw new AccessSaveError("Changed access. Review it.", 409);
  });
  vi.stubGlobal("fetch", async () => Response.json(accessFixture));
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
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
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(screen.getByRole("button", { name: "Add tool" }));
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
