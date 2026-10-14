import React from "react";
import { it, expect, vi, afterEach } from "vitest";
vi.mock("@payloadcms/next/templates", () => ({ DefaultTemplate: "div" }));
import { MediaCalendar } from "../components/admin/mediaCalendar/MediaCalendar";
import { PeopleAccessPage } from "../components/admin/access/PeopleAccessPage";
afterEach(() => vi.unstubAllEnvs());
const user = {
  id: 1,
  email: "member@masca.org.au",
  status: "active",
  role: "editor",
  accessModel: "committee",
  committeeAccessReviewedAt: "2026-10-14",
  accessCatalog: [
    { id: "ws-project", status: "active", areas: ["mediaCalendar"] },
  ],
  workspaceNames: { "ws-project": "MASA" },
  committeeMemberships: [
    {
      id: "m",
      committee: "ws-project",
      roles: { mediaCalendar: ["editor"] },
      manager: true,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
};
const props = {
  initPageResult: {
    req: { user },
    visibleEntities: { collections: [], globals: [] },
  },
};
it("passes project authority and readable names to the actual calendar interface", () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  vi.stubEnv("MEDIA_CALENDAR_ENABLED", "true");
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  const element = MediaCalendar(props as never) as React.ReactElement<{
    children: React.ReactElement<{ user: typeof user }>;
  }>;
  expect(element.props.children.props.user.accessCatalog).toEqual([
    { id: "ws-project", status: "active", areas: ["mediaCalendar"] },
  ]);
  expect(element.props.children.props.user.workspaceNames).toEqual({
    "ws-project": "MASA",
  });
});
it("supplies the CMS template with the same request and authorised navigation", () => {
  const element = PeopleAccessPage(props as never) as React.ReactElement<{
    req: unknown;
    visibleEntities: unknown;
  }>;
  expect(element.props.req).toBe(props.initPageResult.req);
  expect(element.props.visibleEntities).toBe(
    props.initPageResult.visibleEntities,
  );
});
