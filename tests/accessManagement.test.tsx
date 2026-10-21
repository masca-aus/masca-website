// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { accessFixture } from "./helpers/accessFixture";
function chooseRole(area: string, role = "Viewer") {
  fireEvent.click(
    screen.getByRole("button", { name: `${area} role` }),
  );
  fireEvent.click(screen.getByRole("option", { name: role }));
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("defaults to a scoped member list and uses the sidebar to switch workspaces", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  expect(screen.getByRole("navigation", { name: "Workspaces" })).toBeTruthy();
  const table = screen.getByRole("table", { name: "MASA members" });
  expect(within(table).getByText("Syed")).toBeTruthy();
  expect(within(table).queryByText("Husna")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Select workspace Queensland" }),
  );
  expect(
    screen.getByRole("table", { name: "Queensland members" }),
  ).toBeTruthy();
  expect(screen.getByText("Suspended account")).toBeTruthy();
});
it("expands an existing member in the same row and preserves expiry while editing tools", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(<AccessGraph initialSnapshot={accessFixture} onMutation={save} />);
  fireEvent.click(screen.getByRole("button", { name: "View access for Syed" }));
  expect(
    screen.getByRole("region", { name: "Syed access details" }).closest("tr"),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /^Edit access$/ }));
  const form = screen.getByRole("form", { name: "Add workspace member" });
  expect(form.closest("tr")).toBeTruthy();
  chooseRole("Events");
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "saveMembership",
    targetId: "2",
    membership: {
      roles: { mediaCalendar: ["editor"], events: ["viewer"] },
      expiresAt: "2099-01-01T12:34:56.123Z",
    },
  });
});
it("keeps the add-member form inline and prevents navigation from losing edits", async () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  const add = screen.getByRole("button", { name: /^Add member$/ });
  fireEvent.click(add);
  expect(
    screen
      .getByRole("form", { name: "Add workspace member" })
      .closest('[aria-label="MASA members panel"]'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add with MASCA email" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "Draft name" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Select workspace Queensland" }),
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(screen.getByRole("button", { name: "Bubble view" }));
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveProperty(
    "value",
    "Draft name",
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(document.activeElement).toBe(add));
});
it("filters the member list by name or email without reloading the graph", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search members" }), {
    target: { value: "missing" },
  });
  expect(screen.getByText("No matching members.")).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search members" }), {
    target: { value: "syed@masca.org.au" },
  });
  expect(
    screen.getByRole("button", { name: "View access for Syed" }),
  ).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it("uses tool cards for area-specific inline access and keeps activity lazy", async () => {
  const fetch = vi.fn(async (url: string) => {
    void url;
    return Response.json({ history: [] });
  });
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  expect(
    screen.getByRole("form").closest('[aria-label="Events access"]'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
  expect(await screen.findByText("No recorded changes yet.")).toBeTruthy();
  expect(fetch.mock.calls[0][0]).toContain("workspace=ws-masa");
});
it("keeps bubbles as a cached overview and returns to management", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "Bubble view" }));
  expect(screen.getByRole("button", { name: "Open MASA" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Manage access" }));
  expect(screen.getByRole("navigation", { name: "Workspaces" })).toBeTruthy();
});
it("makes staged management explicitly read-only", () => {
  const save = vi.fn();
  render(
    <AccessGraph
      initialSnapshot={{ ...accessFixture, mode: "staged" }}
      onMutation={save}
    />,
  );
  expect(screen.getByRole("button", { name: /^Add member$/ })).toHaveProperty(
    "disabled",
    true,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Add member$/ }));
  expect(screen.queryByRole("form")).toBeNull();
  expect(
    screen.getByText(/Changes unlock after the access rollout review/),
  ).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

it("keeps the editing row visible by locking search until the editor closes", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "View access for Syed" }));
  fireEvent.click(screen.getByRole("button", { name: /^Edit access$/ }));
  const search = screen.getByRole("searchbox", { name: "Search members" });
  expect(search).toHaveProperty("disabled", true);
  fireEvent.change(search, { target: { value: "missing" } });
  expect(screen.getByRole("form")).toBeTruthy();
});
it("supports arrow-key tabs and readable workspace changes in activity", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      history: [
        {
          id: "h",
          action: "configureWorkspace",
          actorName: "Admin",
          createdAt: "2026-10-14T00:00:00Z",
          before: { name: "MASA", areas: ["events"], status: "active" },
          after: {
            name: "MASA",
            areas: ["events", "mediaCalendar"],
            status: "active",
          },
        },
      ],
    }),
  );
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.keyDown(screen.getByRole("tab", { name: /^Members/ }), {
    key: "ArrowRight",
  });
  expect(
    screen.getByRole("tab", { name: "Tools" }).getAttribute("aria-selected"),
  ).toBe("true");
});
it("shows which workspace tools changed in the activity history", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      history: [
        {
          id: "h",
          action: "configureWorkspace",
          actorName: "Admin",
          createdAt: "2026-10-14T00:00:00Z",
          before: { name: "MASA", areas: ["events"], status: "active" },
          after: {
            name: "MASA",
            areas: ["events", "mediaCalendar"],
            status: "active",
          },
        },
      ],
    }),
  );
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
  expect(await screen.findByText(/MASA.*Events.*Media calendar/)).toBeTruthy();
});
it("switches workspace while viewing read-only member details", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "View access for Syed" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Select workspace Queensland" }),
  );
  expect(
    screen.getByRole("table", { name: "Queensland members" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("region", { name: "Syed access details" }),
  ).toBeNull();
});
it("keeps an area editor recoverable if that tool is removed during conflict review", async () => {
  const { AccessSaveError } = await import(
    "../components/admin/access/inlineTypes"
  );
  vi.stubGlobal("fetch", async () =>
    Response.json({
      ...accessFixture,
      workspaces: accessFixture.workspaces.map((w) =>
        w.id === "ws-masa"
          ? { ...w, areas: ["mediaCalendar"], revision: "new" }
          : w,
      ),
    }),
  );
  render(
    <AccessGraph
      initialSnapshot={accessFixture}
      onMutation={async () => {
        throw new AccessSaveError("Changed access", 409);
      }}
    />,
  );
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(screen.getByRole("button", { name: "Add person to Events" }));
  fireEvent.click(screen.getByRole("button", { name: "Person" }));
  fireEvent.click(screen.getByRole("option", { name: "Syed" }));
  fireEvent.submit(screen.getByRole("form"));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review latest access" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "no longer enabled",
    ),
  );
  expect(screen.getByRole("form")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form")).toBeNull();
});

for (const change of ["removed", "renamed", "replaced"] as const) {
  it(`preserves a recoverable dirty member editor when latest membership is ${change}`, async () => {
    const { AccessSaveError } = await import(
      "../components/admin/access/inlineTypes"
    );
    const latest = {
      ...accessFixture,
      people: accessFixture.people.map((p) =>
        p.id === "2"
          ? {
              ...p,
              revision: "p-new",
              ...(change === "renamed"
                ? { name: "New name", email: "new@masca.org.au" }
                : {}),
            }
          : p,
      ),
      memberships:
        change === "removed"
          ? accessFixture.memberships.filter((m) => m.id !== "m2")
          : accessFixture.memberships.map((m) =>
              m.id === "m2" && change === "replaced"
                ? { ...m, id: "replacement" }
                : m,
            ),
    };
    vi.stubGlobal("fetch", async () => Response.json(latest));
    render(
      <AccessGraph
        initialSnapshot={accessFixture}
        onMutation={async () => {
          throw new AccessSaveError("Changed access", 409);
        }}
      />,
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search members" }),
      { target: { value: "syed" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View access for Syed" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Edit access$/ }));
    chooseRole("Events");
    fireEvent.submit(screen.getByRole("form"));
    fireEvent.click(
      await screen.findByRole("button", { name: "Review latest access" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        change === "removed" ? "no longer available" : "Latest access loaded",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Events role" }).textContent,
    ).toContain("Viewer");
    expect(screen.getByRole("button", { name: "Save access" })).toHaveProperty(
      "disabled",
      change === "removed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Select workspace Queensland" }),
    );
    expect(
      screen.getByRole("table", { name: "Queensland members" }),
    ).toBeTruthy();
  });
}

it("places new membership creation inside the member list, including an empty workspace", () => {
  render(
    <AccessGraph
      initialSnapshot={{
        ...accessFixture,
        memberships: accessFixture.memberships.filter(
          (m) => m.committee !== "QLD",
        ),
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Select workspace Queensland" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /^Add member$/ }));
  expect(
    screen.getByRole("form", { name: "Add workspace member" }).closest("tbody"),
  ).toBeTruthy();
  expect(screen.queryByText("No members in this workspace yet")).toBeNull();
  expect(screen.queryByText("No matching members.")).toBeNull();
});
it("finds an existing teammate inline and saves their access without creating another account", async () => {
  const saved: unknown[] = [];
  const fixture = {
    ...accessFixture,
    people: [
      ...accessFixture.people,
      {
        id: "4",
        name: "Alya",
        email: "alya@masca.org.au",
        status: "active" as const,
        revision: "p4",
      },
    ],
    workspaces: accessFixture.workspaces.map((w) => ({
      ...w,
      termEnd: "2099-12-31T14:00:00.000Z",
    })),
  };
  render(
    <AccessGraph
      initialSnapshot={fixture}
      onMutation={async (input) => {
        saved.push(input);
        return {
          snapshot: {
            ...fixture,
            memberships: [
              ...fixture.memberships,
              {
                id: "m4",
                userId: "4",
                committee: "ws-masa",
                roles: { events: ["viewer"] },
                manager: false,
                expiresAt: "2099-12-31T14:00:00.000Z",
              },
            ],
          },
        };
      }}
    />,
  );
  const add = screen.getByRole("button", { name: /^Add member$/ });
  fireEvent.click(add);
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a teammate" }), {
    target: { value: "alya@masca.org.au" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Choose Alya" }));
  chooseRole("Events");
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
  expect(saved).toMatchObject([
    {
      type: "saveMembership",
      targetId: "4",
      expectedRevision: "p4",
      membership: {
        committee: "ws-masa",
        roles: { events: ["viewer"] },
        expiresAt: "2099-12-31T14:00:00.000Z",
      },
    },
  ]);
  expect(
    screen.getByRole("button", { name: "View access for Alya" }),
  ).toBeTruthy();
  expect(document.activeElement).toBe(add);
});
it("keeps the identity fixed when editing a member and toggles their details in place", () => {
  render(<AccessGraph initialSnapshot={accessFixture} />);
  const person = screen.getByRole("button", { name: "View access for Syed" });
  fireEvent.click(person);
  expect(person.getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(person);
  expect(
    screen.queryByRole("region", { name: "Syed access details" }),
  ).toBeNull();
  fireEvent.click(person);
  fireEvent.click(screen.getByRole("button", { name: /^Edit access$/ }));
  const form = screen.getByRole("form");
  expect(within(form).queryByRole("button", { name: "Person" })).toBeNull();
  expect(within(form).getByText("syed@masca.org.au")).toBeTruthy();
  expect(
    within(form).queryByRole("searchbox", { name: "Find a teammate" }),
  ).toBeNull();
});

it("does not submit a hidden new account after returning to teammate selection", async () => {
  const submissions: unknown[] = [];
  const fixture = {
    ...accessFixture,
    workspaces: accessFixture.workspaces.map((w) => ({
      ...w,
      termEnd: "2099-12-31T14:00:00.000Z",
    })),
  };
  render(
    <AccessGraph
      initialSnapshot={fixture}
      onMutation={async (input) => {
        submissions.push(input);
        return { snapshot: fixture };
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Add member$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add with MASCA email" }));
  fireEvent.change(screen.getByRole("textbox", { name: "MASCA email" }), {
    target: { value: "draft@masca.org.au" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Choose an existing teammate instead" }),
  );
  chooseRole("Events");
  fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(submissions).toEqual([]);
  expect(
    screen.getByRole("searchbox", { name: "Find a teammate" }),
  ).toBeTruthy();
});
