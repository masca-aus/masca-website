"use client";
import { useEffect, useState } from "react";
import { AdminLink as Link } from "./AdminNavigationContext";
type Reminder = {
  id: string;
  committee: string;
  name: string;
  expiresAt: string;
  daysBefore: number;
};
export function CommitteeTermReminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  useEffect(() => {
    let alive = true;
    void fetch("/api/committee-access/reminders", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (alive) setItems(data.reminders ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!items.length) return null;
  return (
    <aside
      aria-label="Committee handover reminders"
      style={{
        margin: "1.5rem 0",
        padding: "1rem",
        border: "1px solid var(--theme-elevation-200)",
        borderRadius: 12,
      }}
    >
      <h2 style={{ fontSize: "1.1rem" }}>Upcoming committee handover</h2>
      <p>Review or renew these memberships before their term ends.</p>
      <ul>
        {items.map((r) => (
          <li key={r.id}>
            {r.name} · {r.committee} · term ends{" "}
            {new Date(r.expiresAt).toLocaleDateString("en-AU")}
          </li>
        ))}
      </ul>
      <Link href="/admin/people-access">Review memberships</Link>
    </aside>
  );
}
