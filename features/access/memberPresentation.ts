import type { CommitteeArea, CommitteeMembership } from "./committeePolicy";
import { addDays, dayKey, toInstant } from "../mediaCalendar/dates";
export const memberAreaLabels: Record<CommitteeArea, string> = {
  events: "Events",
  careers: "Careers",
  committee: "Committee profiles",
  sponsors: "Sponsors",
  organisations: "Organisations",
  media: "Media library",
  mediaCalendar: "Media calendar",
};
export const memberRolePresets = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "approver", label: "Approver" },
  { value: "editor+approver", label: "Editor + Approver" },
];
export function memberRoleLabel(
  roles: CommitteeMembership["roles"][CommitteeArea],
) {
  if (roles?.includes("editor") && roles.includes("approver"))
    return "Editor + Approver";
  if (roles?.includes("approver")) return "Approver";
  if (roles?.includes("editor")) return "Editor";
  return roles?.includes("viewer") ? "Viewer" : "No access";
}
export function memberTermDay(expiresAt: string) {
  const instant = Date.parse(expiresAt);
  return Number.isFinite(instant)
    ? dayKey(new Date(instant - 1).toISOString())
    : null;
}
export function memberTermLabel(expiresAt: string) {
  const day = memberTermDay(expiresAt);
  return day
    ? new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${day}T12:00:00Z`))
    : "Choose a term end date";
}
export function memberTermInstant(
  day: string | null,
  current: string,
  max?: string,
) {
  if (!day) return "";
  if (day === memberTermDay(current)) return current;
  if (max && day === memberTermDay(max)) return max;
  return toInstant(`${addDays(day, 1)}T00:00`)!;
}
