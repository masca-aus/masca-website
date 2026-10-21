// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { AccessSaveError } from "../components/admin/access/inlineTypes";
import type { AccessGraphSnapshot } from "../features/access/workspaces/types";
import type { AccessMutation } from "../features/access/workspaces/mutations";
import { accessFixture } from "./helpers/accessFixture";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function roleButton() {
  return within(
    screen.getByRole("group", { name: "Tool roles for Syed" }),
  ).getByRole("button", { name: "Media calendar role for Syed" });
}
function chooseRole(value: string) {
  fireEvent.click(roleButton());
  fireEvent.click(screen.getByRole("option", { name: value }));
}
function updated(
  roles: AccessGraphSnapshot["memberships"][number]["roles"],
  revision = "p-next",
): AccessGraphSnapshot {
  return {
    ...accessFixture,
    people: accessFixture.people.map((p) =>
      p.id === "2" ? { ...p, revision } : p,
    ),
    memberships: accessFixture.memberships.map((m) =>
      m.id === "m2" ? { ...m, roles } : m,
    ),
  };
}
it("changes only the selected tool directly in the member list without opening the editor", async () => {
  const requests: AccessMutation[] = [];
  let finish!: () => void;
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async (input) => {
        requests.push(input);
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        return { snapshot: updated({ mediaCalendar: ["editor", "approver"] }) };
      }}
    />,
  );
  chooseRole("Editor + Approver");
  // Browsers blur a focused control when it is disabled during the request.
  document.body.tabIndex = -1;
  document.body.focus();
  document.body.removeAttribute("tabindex");
  finish();
  await waitFor(() =>
    expect(roleButton().textContent).toContain("Editor + Approver"),
  );
  await waitFor(() => expect(document.activeElement).toBe(roleButton()));
  expect(screen.queryByRole("form")).toBeNull();
  expect(requests).toEqual([
    {
      type: "assignArea",
      workspaceId: "ws-masa",
      targetId: "2",
      area: "mediaCalendar",
      roles: ["editor", "approver"],
      expectedRevision: "p1",
      expectedWorkspaceRevision: "w1",
    },
  ]);
  expect(
    screen.getByRole("button", { name: "View access for Syed" }),
  ).toBeTruthy();
  expect(screen.getByText("1 Jan 2099")).toBeTruthy();
});
it("removes the final tool without removing the workspace member", async () => {
  const requests: AccessMutation[] = [];
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async (input) => {
        requests.push(input);
        return { snapshot: updated({}) };
      }}
    />,
  );
  chooseRole("No access");
  expect(await screen.findByText("No content access")).toBeTruthy();
  expect(requests).toEqual([
    {
      type: "removeArea",
      workspaceId: "ws-masa",
      targetId: "2",
      area: "mediaCalendar",
      expectedRevision: "p1",
      expectedWorkspaceRevision: "w1",
    },
  ]);
  expect(
    screen.getByRole("button", { name: "View access for Syed" }),
  ).toBeTruthy();
  expect(screen.getByRole("tab", { name: /^Members\s*1$/ })).toBeTruthy();
});
it("keeps the original role after a failed save and allows retrying inline", async () => {
  let attempts = 0;
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async () => {
        if (++attempts === 1) throw new Error("Could not save this role.");
        return { snapshot: updated({ mediaCalendar: ["approver"] }) };
      }}
    />,
  );
  chooseRole("Approver");
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Could not save this role.",
  );
  expect(roleButton().textContent).toContain("Editor");
  chooseRole("Approver");
  await waitFor(() => expect(roleButton().textContent).toContain("Approver"));
  expect(screen.queryByRole("alert")).toBeNull();
});
it("requires reviewing newer access after a conflict and never resends the stale edit", async () => {
  const requests: AccessMutation[] = [];
  vi.stubGlobal("fetch", async () =>
    Response.json(
      updated({ mediaCalendar: ["viewer"], events: ["approver"] }, "p-latest"),
    ),
  );
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async (input) => {
        requests.push(input);
        if (requests.length === 1)
          throw new AccessSaveError(
            "Access changed. Review the latest access.",
            409,
          );
        return {
          snapshot: updated({
            mediaCalendar: ["editor", "approver"],
            events: ["approver"],
          }),
        };
      }}
    />,
  );
  chooseRole("Approver");
  await screen.findByRole("alert");
  expect(roleButton()).toHaveProperty("disabled", true);
  fireEvent.click(
    screen.getByRole("button", { name: "Review latest access for Syed" }),
  );
  await waitFor(() => expect(roleButton().textContent).toContain("Viewer"));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("group", { name: "Tool roles for Syed" }),
    ),
  );
  expect(requests).toHaveLength(1);
  chooseRole("Editor + Approver");
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[1]).toMatchObject({
    type: "assignArea",
    expectedRevision: "p-latest",
    area: "mediaCalendar",
    roles: ["editor", "approver"],
  });
  expect(
    within(
      screen.getByRole("group", { name: "Tool roles for Syed" }),
    ).getByRole("button", { name: "Events role for Syed" }).textContent,
  ).toContain("Approver");
});
it("keeps a pending row visible so a delayed failure cannot lose its inline feedback", async () => {
  let fail!: (error: Error) => void;
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={() =>
        new Promise((_, reject) => {
          fail = reject;
        })
      }
    />,
  );
  chooseRole("Approver");
  const search = screen.getByRole("searchbox", { name: "Search members" });
  expect(search).toHaveProperty("disabled", true);
  fireEvent.change(search, { target: { value: "missing" } });
  expect(roleButton()).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  expect(screen.queryByRole("form")).toBeNull();
  fail(new AccessSaveError("Access changed while saving.", 409));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Access changed while saving.",
  );
  expect(
    screen.getByRole("button", { name: "Review latest access for Syed" }),
  ).toBeTruthy();
});
it("retains keyboard position and the review action when refreshing a conflict fails", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new Error("Could not reload access.");
  });
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async () => {
        throw new AccessSaveError("Access changed.", 409);
      }}
    />,
  );
  chooseRole("Approver");
  const review = await screen.findByRole("button", {
    name: "Review latest access for Syed",
  });
  review.focus();
  fireEvent.click(review);
  document.body.tabIndex = -1;
  document.body.focus();
  document.body.removeAttribute("tabindex");
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(
      "Could not reload access.",
    ),
  );
  expect(document.activeElement).toBe(
    screen.getByRole("group", { name: "Tool roles for Syed" }),
  );
  expect(review).toHaveProperty("disabled", false);
});
it.each(["staged", "suspended", "archived", "expired", "self"] as const)(
  "prevents direct role changes for %s access",
  (mode) => {
    const fixture: AccessGraphSnapshot = {
      ...accessFixture,
      mode: mode === "staged" ? "staged" : "active",
      viewer:
        mode === "self"
          ? { ...accessFixture.viewer, id: "2", appoint: false }
          : accessFixture.viewer,
      workspaces: accessFixture.workspaces.map((w) =>
        mode === "archived" && w.id === "ws-masa"
          ? { ...w, status: "archived" }
          : w,
      ),
      people: accessFixture.people.map((p) =>
        mode === "suspended" && p.id === "2"
          ? { ...p, status: "suspended" }
          : p,
      ),
      memberships: accessFixture.memberships.map((m) =>
        mode === "expired" && m.id === "m2"
          ? { ...m, expiresAt: "2020-01-01T00:00:00Z" }
          : m,
      ),
    };
    render(<AccessGraph initialSnapshot={fixture} />);
    if (mode === "archived")
      fireEvent.click(screen.getByRole("button", { name: "Show archived" }));
    if (mode === "archived")
      fireEvent.click(
        screen.getByRole("button", { name: "Select workspace MASA" }),
      );
    expect(roleButton()).toHaveProperty("disabled", true);
  },
);
