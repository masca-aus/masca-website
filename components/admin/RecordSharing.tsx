"use client";
import { useAuth, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useState } from "react";
import {
  committeeMode,
  type CommitteeAccount,
} from "@/features/access/committeePolicy";
import "./committeeAccess.css";
import "./mediaCalendar/calendar.css";
import { CalendarSelect } from "./mediaCalendar/CalendarSelect";
type Person = { userId: string; role: "viewer" | "editor"; email: string };
export function RecordSharing() {
  const { user } = useAuth(),
    { id, collectionSlug } = useDocumentInfo(),
    [people, setPeople] = useState<Person[]>([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("viewer"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const enabled = committeeMode(user as unknown as CommitteeAccount);
  useEffect(() => {
    let active = true;
    if (enabled && id && collectionSlug)
      fetch(`/api/${collectionSlug}/${id}/access-sharing`, {
        cache: "no-store",
      })
        .then(async (response) => {
          if (response.ok && active) setPeople((await response.json()).people);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled, id, collectionSlug]);
  if (!enabled) return null;
  if (!id)
    return (
      <p>
        Save this record before sharing it with an individual MASCA account.
      </p>
    );
  async function change(userId?: string) {
    setBusy(true);
    try {
      const response = await fetch(
          `/api/${collectionSlug}/${id}/access-sharing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userId ? { remove: userId } : { email, role }),
          },
        ),
        body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPeople(body.people);
      setEmail("");
      setMessage("Record sharing saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Sharing could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="committee-access">
      <h3>Record sharing</h3>
      <p>
        Share this record with an active individual MASCA account. Viewers can
        read and comment; Editors can also edit. Publication and access
        management remain with the owning committee.
      </p>
      {people.map((p) => (
        <p key={p.userId}>
          {p.email} · {p.role}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => void change(p.userId)}
          >
            Remove sharing
          </button>
        </p>
      ))}
      <label>
        MASCA email{" "}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <CalendarSelect
        label="Sharing access"
        value={role}
        onChange={setRole}
        options={[
          { value: "viewer", label: "Viewer / comment" },
          { value: "editor", label: "Editor" },
        ]}
      />
      <button
        type="button"
        disabled={busy || !email}
        onClick={() => void change()}
      >
        Share record
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
