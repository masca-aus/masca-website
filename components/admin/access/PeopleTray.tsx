"use client";
/* eslint-disable @next/next/no-img-element -- Private profile images must be fetched directly by the authenticated browser. */
import { useState } from "react";
import type { AccessPerson } from "@/features/access/workspaces/types";
export function PersonAvatar({ person }: { person: AccessPerson }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  return (
    <span className="ag-avatar">
      <span>
        {person.name
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase()}
      </span>
      {person.photoURL && failedPhoto !== person.photoURL && (
        <img
          src={person.photoURL}
          alt=""
          onError={() => setFailedPhoto(person.photoURL!)}
        />
      )}
    </span>
  );
}
export function PeopleTray({
  people,
  selected,
  onSelect,
  children,
}: {
  people: AccessPerson[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="ag-people" aria-label="People">
      <header>
        <h2>People</h2>
        <span>
          {people.length} {people.length === 1 ? "person" : "people"}
        </span>
      </header>
      <div className="ag-people-list">
        {people.map((p) => (
          <button
            type="button"
            key={p.id}
            className={`ag-person ${selected === p.id ? "is-selected" : ""}`}
            aria-pressed={selected === p.id}
            onClick={() => {
              onSelect(selected === p.id ? null : p.id);
            }}
          >
            <PersonAvatar person={p} />
            <span>
              {p.name}
              <small>
                {p.status === "active"
                  ? "Active account"
                  : p.status === "invited"
                    ? "Awaiting first sign-in"
                    : "Suspended"}
              </small>
            </span>
          </button>
        ))}
        {children}
      </div>
      {!people.length && <p>No people in this view yet.</p>}
    </section>
  );
}
