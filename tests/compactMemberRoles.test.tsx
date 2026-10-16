// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { accessFixture } from "./helpers/accessFixture";
import type { AccessMutation } from "../features/access/workspaces/mutations";
afterEach(cleanup);
function chooseRole(area: string, role: string) {
  fireEvent.click(
    screen.getByRole("button", { name: `${area} role` }),
  );
  fireEvent.click(screen.getByRole("option", { name: role }));
}
it("changes and removes tool roles through one control while preserving the member and term", async () => {
  const saved: AccessMutation[] = [];
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async (input) => {
        saved.push(input);
        return { snapshot: accessFixture };
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "View access for Syed" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Edit access" }),
  );
  chooseRole("Events", "Approver");
  chooseRole("Media calendar", "No access");
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
  expect(saved).toMatchObject([
    {
      type: "saveMembership",
      targetId: "2",
      membership: {
        roles: { events: ["approver"], mediaCalendar: [] },
        expiresAt: "2099-01-01T12:34:56.123Z",
      },
    },
  ]);
});
it("does not grant an unchecked tool a default role when access is cleared", async () => {
  const fixture = {
    ...accessFixture,
    workspaces: accessFixture.workspaces.map((w) => ({
      ...w,
      termEnd: "2099-12-31T14:00:00.000Z",
    })),
    people: [
      ...accessFixture.people,
      {
        id: "4",
        name: "Alya",
        email: "alya@masca.org.au",
        status: "active",
        revision: "p4",
      },
    ],
  };
  const saved: AccessMutation[] = [];
  render(
    <AccessGraph
      initialSnapshot={fixture}
      onMutation={async (input) => {
        saved.push(input);
        return { snapshot: fixture };
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Add member" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose Alya" }));
  chooseRole("Events", "Editor");
  chooseRole("Events", "No access");
  fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Choose at least one tool.",
  );
  expect(saved).toEqual([]);
  chooseRole("Media calendar", "Editor + Approver");
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
  expect(saved).toMatchObject([
    {
      type: "saveMembership",
      targetId: "4",
      membership: {
        roles: { events: [], mediaCalendar: ["editor", "approver"] },
      },
    },
  ]);
});
it("can clear the final tool on an existing membership without deleting the person or changing their term", async () => {
  const saved: AccessMutation[] = [];
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async (input) => {
        saved.push(input);
        return { snapshot: accessFixture };
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "View access for Syed" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Edit access" }),
  );
  chooseRole("Media calendar", "No access");
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
  expect(saved).toMatchObject([
    {
      type: "saveMembership",
      targetId: "2",
      membership: {
        id: "m2",
        roles: { mediaCalendar: [] },
        expiresAt: "2099-01-01T12:34:56.123Z",
      },
    },
  ]);
});
