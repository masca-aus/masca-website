// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const h = vi.hoisted(() => ({
  posted: [] as Record<string, unknown>[],
  people: [] as unknown[],
}));
vi.mock("@payloadcms/ui", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: "manager@masca.org.au",
      role: "editor",
      status: "active",
      accessModel: "committee",
      committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
      committeeMemberships: [
        {
          id: "manager",
          committee: "QLD",
          manager: true,
          roles: {},
          expiresAt: "2099-01-01T00:00:00Z",
        },
      ],
    },
  }),
  useField: () => ({}),
}));
import { PeopleAccess } from "../components/admin/PeopleAccess";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-13T00:00:00Z"));
  h.posted = [];
  h.people = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("reminders")) return Response.json({ reminders: [] });
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      h.posted.push(body);
      h.people = [
        { id: "new", email: body.email, membership: body.membership },
      ];
      return Response.json({ saved: true });
    }
    return Response.json({ people: h.people });
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("keeps a non-MASCA address in the form with a clear error instead of sending a request", async () => {
  render(<PeopleAccess />);
  await screen.findByText("No members yet");
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  fireEvent.change(screen.getByRole("textbox", { name: "MASCA email" }), {
    target: { value: "person@gmail.com" },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Add member" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("@masca.org.au"),
  );
  expect(h.posted).toHaveLength(0);
  expect(screen.getByRole("textbox", { name: "MASCA email" })).toHaveProperty(
    "value",
    "person@gmail.com",
  );
});
it("adds the chosen committee and area, normalizes the email and shows the saved member", async () => {
  render(<PeopleAccess />);
  await screen.findByText("No members yet");
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  fireEvent.change(screen.getByRole("textbox", { name: "MASCA email" }), {
    target: { value: "NEW.MEMBER@masca.org.au" },
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Give access to Media calendar" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Media calendar access" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "Editor" }));
  fireEvent.click(screen.getByRole("button", { name: "Committee term end" }));
  for (let month = 0; month < 8; month++)
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  fireEvent.click(screen.getByRole("button", { name: "30 June 2027" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  await waitFor(() => expect(h.posted).toHaveLength(1));
  expect(h.posted[0]).toEqual({
    committee: "QLD",
    email: "new.member@masca.org.au",
    membership: expect.objectContaining({
      committee: "QLD",
      manager: false,
      expiresAt: "2027-06-30T14:00:00.000Z",
      roles: { mediaCalendar: ["editor"] },
    }),
  });
  expect(await screen.findByText("new.member@masca.org.au")).toBeTruthy();
  expect(screen.queryByRole("form", { name: "Add member" })).toBeNull();
});
