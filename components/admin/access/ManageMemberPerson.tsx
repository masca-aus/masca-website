"use client";
import { useState } from "react";
import { Check, Search, UserPlus } from "lucide-react";
import type { AccessPerson } from "@/features/access/workspaces/types";
import { PersonAvatar } from "./PeopleTray";

/** The Manage flow keeps account selection in the list rather than a popup. */
export function ManageMemberPerson({
  people,
  personId,
  fixed,
  name,
  email,
  onChoose,
  onName,
  onEmail,
}: {
  people: AccessPerson[];
  personId: string;
  fixed: boolean;
  name: string;
  email: string;
  onChoose: (id: string) => void;
  onName: (name: string) => void;
  onEmail: (email: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [newAccount, setNewAccount] = useState(false);
  const person = people.find((p) => p.id === personId);
  const available = people.filter((p) => p.status !== "suspended");
  const matches = available.filter((p) =>
    `${p.name} ${p.email}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  if (person)
    return (
      <div className="ag-selected-person">
        <PersonAvatar person={person} />
        <span>
          <strong>{person.name}</strong>
          <small>{person.email}</small>
        </span>
        {fixed ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="ag-text"
            onClick={() => onChoose("")}
          >
            Change person
          </button>
        )}
      </div>
    );
  return (
    <div className="ag-person-picker">
      {!newAccount && (
        <>
          <label className="ag-member-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Find a teammate"
              placeholder="Search by name or MASCA email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="ag-person-results" aria-label="Matching teammates">
            {matches.slice(0, 5).map((p) => (
              <button
                type="button"
                key={p.id}
                aria-label={`Choose ${p.name}`}
                onClick={() => onChoose(p.id)}
              >
                <PersonAvatar person={p} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.email}</small>
                </span>
              </button>
            ))}
            {!matches.length && (
              <p>
                No matching teammates. You can add their MASCA account below.
              </p>
            )}
            {matches.length > 5 && <p>Keep typing to narrow the list.</p>}
          </div>
          <button
            type="button"
            className="ag-text ag-new-person"
            onClick={() => {
              if (/^[^\s@]+@masca\.org\.au$/i.test(query.trim()))
                onEmail(query.trim().toLowerCase());
              setNewAccount(true);
            }}
          >
            <UserPlus size={15} aria-hidden="true" />
            Add with MASCA email
          </button>
        </>
      )}
      {newAccount && (
        <>
          <div className="ag-fields-row">
            <label>
              MASCA email
              <input
                aria-label="MASCA email"
                type="email"
                autoComplete="off"
                value={email}
                placeholder="name@masca.org.au"
                onChange={(e) => onEmail(e.target.value)}
              />
            </label>
            <label>
              Name
              <input
                aria-label="Name"
                maxLength={80}
                value={name}
                placeholder="Optional name"
                onChange={(e) => onName(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="ag-text"
            onClick={() => {
              onEmail("");
              onName("");
              setNewAccount(false);
            }}
          >
            Choose an existing teammate instead
          </button>
          <p className="ag-field-hint">
            They’ll use their individual MASCA Google account to sign in.
            Existing accounts are reused.
          </p>
        </>
      )}
    </div>
  );
}
