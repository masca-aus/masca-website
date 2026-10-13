"use client";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import { memberAreaLabels } from "@/features/access/memberPresentation";
export function AccessTable({
  snapshot,
  onInspect,
}: {
  snapshot: AccessGraphSnapshot;
  onInspect?: (workspaceId: string, userId: string) => void;
}) {
  return (
    <div className="ag-table-wrap">
      <table>
        <caption>Workspace memberships</caption>
        <thead>
          <tr>
            <th>Person</th>
            <th>Workspace</th>
            <th>Access</th>
            <th>Term ends</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.memberships.map((m) => {
            const p = snapshot.people.find((p) => p.id === m.userId),
              w = snapshot.workspaces.find((w) => w.id === m.committee);
            return (
              <tr key={`${m.userId}-${m.id}`}>
                <td>
                  {onInspect ? (
                    <button
                      type="button"
                      className="ag-text"
                      onClick={() => onInspect(m.committee, m.userId)}
                    >
                      {p?.name ?? "Former member"}
                    </button>
                  ) : (
                    (p?.name ?? "Former member")
                  )}
                </td>
                <td>{w?.name}</td>
                <td>
                  {m.manager && <span>Access manager · </span>}
                  {Object.entries(m.roles)
                    .filter(([, r]) => r?.length)
                    .map(
                      ([a, r]) =>
                        `${memberAreaLabels[a as keyof typeof memberAreaLabels]}: ${r?.join(", ")}`,
                    )
                    .join(" · ") || (!m.manager ? "No content access" : "")}
                </td>
                <td>
                  {new Date(m.expiresAt).toLocaleDateString("en-AU", {
                    timeZone: "Australia/Brisbane",
                  })}
                </td>
                <td>
                  {p?.status === "suspended"
                    ? "Suspended account"
                    : w?.status === "archived"
                      ? "Archived workspace"
                      : Date.parse(m.expiresAt) <= Date.now()
                        ? "Expired"
                        : p?.status === "invited"
                          ? "Awaiting sign-in"
                          : "Active"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
