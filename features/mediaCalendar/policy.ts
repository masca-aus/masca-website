import { isWorkspaceEmail } from "../access/workspacePolicy.ts";
import type { CalendarAccess, CalendarUser } from "./types.ts";
export function mayUseCalendar(
  user: CalendarUser | null | undefined,
  capability: keyof Pick<CalendarAccess, "view" | "edit" | "approve">,
): boolean {
  if (!user || user.status !== "active" || !isWorkspaceEmail(user.email))
    return false;
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
  post: { creator: string; contributors: string[] },
) {
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
