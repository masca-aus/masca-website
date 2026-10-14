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
it("loads scoped history only when requested and renders access metadata", async () => {
  const fetch = vi.fn(async (url: string) => {
    void url;
    return Response.json({
      history: [
        {
          id: "h1",
          action: "assignArea",
          actorName: "Admin",
          createdAt: "2026-10-14T00:00:00Z",
          before: null,
          after: {
            expiresAt: "2099-01-01T00:00:00Z",
            roles: { events: ["viewer"] },
          },
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph initialView="manage" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(
    screen.getByRole("button", { name: "View Syed in Media calendar" }),
  );
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Access history" }));
  expect(await screen.findByText(/Admin/)).toBeTruthy();
  expect(fetch.mock.calls[0][0]).toContain("workspace=ws-masa");
  expect(fetch.mock.calls[0][0]).toContain("person=2");
});
it("membership removal is explicit and scoped to one workspace", async () => {
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
  fireEvent.click(
    screen.getByRole("button", { name: "View Syed in Media calendar" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remove workspace membership" }),
  );
  expect(save).not.toHaveBeenCalled();
  expect(
    screen.getByText(/Other workspaces and attribution are preserved/),
  ).toBeTruthy();
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "removeMembership",
    workspaceId: "ws-masa",
    targetId: "2",
    expectedRevision: "p1",
  });
});
it("shows an explicit renewal affecting every role in that workspace", () => {
  render(<AccessGraph initialView="manage" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  fireEvent.click(
    screen.getByRole("button", { name: "View Syed in Media calendar" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Renew term" }));
  expect(
    screen.getByRole("form", { name: "Renew workspace term" }),
  ).toBeTruthy();
  expect(screen.getByText(/every assigned area/)).toBeTruthy();
});
it("labels shared records separately and fetches them lazily", async () => {
  const fetch = vi.fn(async (url: string) => {
    void url;
    return Response.json({
      records: [
        {
          recordId: "12",
          area: "events",
          label: "Events record #12",
          sharedWith: [{ userId: "2", name: "Syed", role: "viewer" }],
          canManage: false,
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetch);
  render(<AccessGraph initialView="manage" initialSnapshot={accessFixture} />);
  fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Shared records" }));
  expect(await screen.findByText("Events record #12")).toBeTruthy();
  expect(
    screen.getByText(/Record access does not create workspace membership/),
  ).toBeTruthy();
});
