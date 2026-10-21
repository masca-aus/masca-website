// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { CommitteeMembership } from "../features/access/committeePolicy";
const h = vi.hoisted(() => ({
  role: "administrator",
  disabled: false,
  value: [] as unknown,
  setValue: vi.fn(),
}));
vi.mock("@payloadcms/ui", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: "platform@masca.org.au",
      role: h.role,
      status: "active",
    },
  }),
  useField: () => ({
    value: h.value,
    setValue: h.setValue,
    disabled: h.disabled,
  }),
}));
import {
  MembershipEditor,
  CommitteeMemberships,
} from "../components/admin/CommitteeMemberships";
const original: CommitteeMembership = {
  id: "q",
  committee: "QLD",
  expiresAt: "2027-06-30T13:59:00Z",
  roles: { mediaCalendar: ["editor"] },
  manager: false,
};
function Harness({
  value = original,
  cap,
}: {
  value?: CommitteeMembership;
  cap?: string;
}) {
  const [membership, setMembership] = useState(value);
  return (
    <>
      <MembershipEditor
        value={membership}
        onChange={setMembership}
        maxExpiresAt={cap}
      />
      <output data-testid="membership">{JSON.stringify(membership)}</output>
    </>
  );
}
beforeEach(() => {
  h.role = "administrator";
  h.disabled = false;
  h.value = [original];
  h.setValue.mockClear();
});
afterEach(cleanup);
it("adds only the selected area with Viewer access and preserves other area roles", () => {
  render(<Harness />);
  expect(screen.queryByRole("button", { name: /^events access$/i })).toBeNull();
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Give access to Events" }),
  );
  expect(
    JSON.parse(screen.getByTestId("membership").textContent!).roles,
  ).toEqual({ mediaCalendar: ["editor"], events: ["viewer"] });
  fireEvent.click(screen.getByRole("button", { name: /^events access$/i }));
  fireEvent.click(screen.getByRole("option", { name: "Editor" }));
  expect(
    JSON.parse(screen.getByTestId("membership").textContent!).roles.events,
  ).toEqual(["editor"]);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Give access to Events" }),
  );
  expect(
    JSON.parse(screen.getByTestId("membership").textContent!).roles,
  ).toEqual({ mediaCalendar: ["editor"] });
});
it("uses a date-only term picker and preserves the manager's exact expiry when choosing its final day", async () => {
  render(
    <Harness
      value={{ ...original, expiresAt: "2027-06-28T13:59:00Z" }}
      cap="2027-06-30T13:59:00Z"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Committee term end" }));
  expect(
    screen.queryByRole("textbox", { name: "Time in Brisbane" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "30 June 2027" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
  await waitFor(() =>
    expect(
      JSON.parse(screen.getByTestId("membership").textContent!).expiresAt,
    ).toBe("2027-06-30T13:59:00Z"),
  );
});
it.each([ ["editor", false], ["administrator", true] ])("keeps membership controls read-only for %s with disabled=%s", (role, disabled) => {
  h.role = role;
  h.disabled = disabled;
  render(<CommitteeMemberships path="committeeMemberships" />);
  expect(screen.queryByRole("button", { name: "Add committee" })).toBeNull();
  expect(
    screen.queryByRole("checkbox", { name: "Committee access manager" }),
  ).toBeNull();
  const select = screen.getByRole("button", {
    name: /^media calendar access$/i,
  });
  expect(select.hasAttribute("disabled")).toBe(true);
  fireEvent.click(select);
  expect(h.setValue).not.toHaveBeenCalled();
});
