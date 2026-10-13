import type {
  CommitteeAccount,
  CommitteeArea,
  CommitteeMembership,
} from "../committeePolicy.ts";
export type WorkspaceId = string;
export type AccessWorkspace = {
  id: WorkspaceId;
  name: string;
  kind: "committee" | "project";
  status: "active" | "archived";
  areas: CommitteeArea[];
  termEnd: string | null;
  sponsorId: WorkspaceId | null;
  revision: string;
};
export type PolicyWorkspace = Pick<AccessWorkspace, "id" | "status" | "areas">;
export type AccessPerson = {
  id: string;
  email: string;
  name: string;
  status: string;
  revision: string;
  photoURL?: string;
};
export type GraphMembership = CommitteeMembership & { userId: string };
export type AccessGraphSnapshot = {
  mode: "staged" | "active";
  viewer: { id: string; create: boolean; configure: boolean; appoint: boolean };
  workspaces: AccessWorkspace[];
  people: AccessPerson[];
  memberships: GraphMembership[];
  revision: string;
};
export type WorkspaceInput = Pick<
  AccessWorkspace,
  "name" | "kind" | "areas" | "termEnd" | "sponsorId"
>;
export type AuthorityAccount = CommitteeAccount & {
  accessCatalog: PolicyWorkspace[];
};
