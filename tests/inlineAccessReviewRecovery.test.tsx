// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { AccessSaveError } from "../components/admin/access/inlineTypes";
import { accessFixture } from "./helpers/accessFixture";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function member() {
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(
    screen.getByRole("button", { name: "View Syed in Media calendar" }),
  );
}
it("does not restore an unrelated removed role after reviewing a whole-membership conflict", async () => {
  const latest = {
    ...accessFixture,
    people: accessFixture.people.map((p) => ({ ...p, revision: "p-latest" })),
    memberships: accessFixture.memberships.map((m) =>
      m.committee === "ws-masa" ? { ...m, roles: {} } : m,
    ),
  };
  vi.stubGlobal("fetch", async () => Response.json(latest));
  const save = vi
    .fn()
    .mockRejectedValueOnce(new AccessSaveError("Changed", 409))
    .mockResolvedValue({ snapshot: latest });
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose Syed" }));
  fireEvent.click(screen.getByRole("button", { name: "Events role" }));
  fireEvent.click(screen.getByRole("option", { name: /^Editor$/ }));
  fireEvent.submit(screen.getByRole("form"));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review latest access" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save access" })).toHaveProperty(
      "disabled",
      false,
    ),
  );
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(
    save.mock.calls[1][0].membership.roles.mediaCalendar?.length ?? 0,
  ).toBe(0);
  expect(save.mock.calls[1][0].membership.roles.events).toEqual(["editor"]);
});
it("keeps renewal safely blocked if membership or person disappears during conflict review", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ ...accessFixture, people: [], memberships: [] }),
  );
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={async () => {
        throw new AccessSaveError("Changed", 409);
      }}
    />,
  );
  member();
  fireEvent.click(screen.getByRole("button", { name: "Renew term" }));
  fireEvent.submit(screen.getByRole("form"));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review latest access" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "no longer available",
    ),
  );
  expect(screen.getByRole("button", { name: "Renew term" })).toHaveProperty(
    "disabled",
    true,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form")).toBeNull();
});
it("ignores an obsolete conflict refresh after closing and opening another editor", async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  render(
    <AccessGraph
      initialView="manage"
      initialSnapshot={accessFixture}
      onMutation={async () => {
        throw new AccessSaveError("Changed", 409);
      }}
    />,
  );
  member();
  fireEvent.click(screen.getByRole("button", { name: "Renew term" }));
  fireEvent.submit(screen.getByRole("form"));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review latest access" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  resolve(
    Response.json({
      ...accessFixture,
      workspaces: accessFixture.workspaces.map((w) => ({
        ...w,
        name: "Unexpected late name",
        revision: "late",
      })),
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("form").textContent).not.toContain(
      "Unexpected late name",
    ),
  );
  expect(screen.getByRole("form").textContent).toContain("MASA");
});
