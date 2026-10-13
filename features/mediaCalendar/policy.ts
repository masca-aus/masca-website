import {
  committeeMode,
  accessibleCommittees,
  activeMemberships,
  mayAccessResource,
  type CommitteeAction,
  type CommitteeScope,
} from "../access/committeePolicy.ts";
import { isWorkspaceEmail } from "../access/workspacePolicy.ts";
import type { CalendarAccess, CalendarUser } from "./types.ts";
export function mayUseCalendar(
  user: CalendarUser | null | undefined,
  capability: keyof Pick<CalendarAccess, "view" | "edit" | "approve">,
): boolean {
  if (!user || user.status !== "active" || !isWorkspaceEmail(user.email))
    return false;
  if (committeeMode(user))
    return (
      accessibleCommittees(
        user,
        "mediaCalendar",
        capability === "view"
          ? "view"
          : capability === "edit"
            ? "edit"
            : "approve",
      ).length > 0
    );
  if (capability === "approve")
    return (
      user.calendarAccess?.view === true &&
      user.calendarAccess.approve === true &&
      ["member", "chair"].includes(user.calendarAccess.designation ?? "")
    );
  if (user.role === "administrator") return true;
  return (
    user.calendarAccess?.view === true &&
    (capability === "view" || user.calendarAccess.edit === true)
  );
}
export function mayApprove(
  user: CalendarUser,
  post: {
    creator: string;
    contributors: string[];
    owningScope?: CommitteeScope;
    sharedWith?: import("../access/committeePolicy").SharingGrant[];
  },
) {
  if (committeeMode(user))
    return mayAccessResource(
      user,
      {
        ...post,
        area: "mediaCalendar",
        owningScope: post.owningScope ?? "National",
      },
      "approve",
    );
  return (
    mayUseCalendar(user, "approve") &&
    String(user.id) !== post.creator &&
    !post.contributors.includes(String(user.id))
  );
}
export function validCalendarAccess(value: unknown): boolean {
  if (value == null) return true;
  const v = value as CalendarAccess;
  return (
    typeof v.view === "boolean" &&
    typeof v.edit === "boolean" &&
    typeof v.approve === "boolean" &&
    [null, "member", "chair"].includes(v.designation) &&
    (!v.edit || v.view) &&
    (!v.approve || (v.view && !!v.designation))
  );
}

/** Broad admission permits explicit shared records; authority is always checked per record. */
export function mayEnterCalendar(user: CalendarUser | null | undefined) {
  return committeeMode(user)
    ? activeMemberships(user).length > 0
    : mayUseCalendar(user, "view");
}
export function mayAccessPost(
  user: CalendarUser,
  post: {
    owningScope?: CommitteeScope;
    sharedWith?: import("../access/committeePolicy").SharingGrant[];
    creator?: string;
    contributors?: string[];
  },
  action: CommitteeAction,
) {
  if (committeeMode(user))
    return mayAccessResource(
      user,
      {
        ...post,
        area: "mediaCalendar",
        owningScope: post.owningScope ?? "National",
      },
      action,
    );
  return action === "approve" || action === "publish"
    ? mayUseCalendar(user, "approve")
    : mayUseCalendar(
        user,
        ["view", "comment"].includes(action) ? "view" : "edit",
      );
}
export function mayManagePost(
  user: CalendarUser,
  post: { owningScope?: CommitteeScope },
  action: CommitteeAction = "edit",
) {
  return mayAccessPost(user, { owningScope: post.owningScope }, action);
}
