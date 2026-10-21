import type { AccessGraphSnapshot } from "../../features/access/workspaces/types";
export const accessFixture: AccessGraphSnapshot = {
  mode: "active",
  viewer: { id: "1", create: true, configure: true, appoint: true },
  revision: "r",
  workspaces: [
    {
      id: "ws-masa",
      name: "MASA",
      kind: "project",
      status: "active",
      areas: ["events", "mediaCalendar"],
      termEnd: null,
      sponsorId: null,
      revision: "w1",
    },
    {
      id: "QLD",
      name: "Queensland",
      kind: "committee",
      status: "active",
      areas: ["events"],
      termEnd: null,
      sponsorId: null,
      revision: "w2",
    },
  ],
  people: [
    {
      id: "2",
      name: "Syed",
      email: "syed@masca.org.au",
      status: "active",
      revision: "p1",
    },
    {
      id: "3",
      name: "Husna",
      email: "husna@masca.org.au",
      status: "suspended",
      revision: "p2",
    },
  ],
  memberships: [
    {
      id: "m2",
      userId: "2",
      committee: "ws-masa",
      roles: { mediaCalendar: ["editor"] },
      manager: false,
      expiresAt: "2099-01-01T12:34:56.123Z",
    },
    {
      id: "m3",
      userId: "3",
      committee: "QLD",
      roles: { events: ["viewer"] },
      manager: false,
      expiresAt: "2020-01-01T00:00:00Z",
    },
  ],
};
