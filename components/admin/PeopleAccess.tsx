"use client";
import { CommitteeTermReminders } from "./CommitteeTermReminders";
import "./committeeAccess.css";
import { useAuth } from "@payloadcms/ui";
import { useEffect, useState } from "react";
import { managedCommittees } from "@/features/access/delegatedAccessClient";
import type {
  CommitteeAccount,
  CommitteeMembership,
  CommitteeScope,
} from "@/features/access/committeePolicy";
import { CalendarSelect } from "./mediaCalendar/CalendarSelect";
import { MembershipEditor } from "./CommitteeMemberships";
import { AdminLink as Link } from "./AdminNavigationContext";
type Person = { id: string; email: string; membership: CommitteeMembership };
export function PeopleAccess() {
  const { user } = useAuth(),
    account = user as unknown as CommitteeAccount;
  const committees = managedCommittees(account),
    [committee, setCommittee] = useState<CommitteeScope | undefined>(
      committees[0],
    );
  const [people, setPeople] = useState<Person[]>([]),
    [selected, setSelected] = useState<Person | null>(null),
    [email, setEmail] = useState(""),
    [membership, setMembership] = useState<CommitteeMembership | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    if (!committee) return;
    const response = await fetch(`/api/people-access?committee=${committee}`, {
        cache: "no-store",
      }),
      body = await response.json();
    if (response.ok) setPeople(body.people);
    else setMessage(body.error);
  }
  useEffect(() => {
    let active = true;
    if (committee)
      fetch(`/api/people-access?committee=${committee}`, { cache: "no-store" })
        .then(async (response) => {
          const body = await response.json();
          if (active) {
            if (response.ok) setPeople(body.people);
            else setMessage(body.error);
          }
        })
        .catch(() => {
          if (active) setMessage("People could not be loaded.");
        });
    return () => {
      active = false;
    };
  }, [committee]);
  function invite() {
    if (committee) {
      setSelected(null);
      setEmail("");
      setMembership({
        id: crypto.randomUUID(),
        committee,
        roles: {},
        manager: false,
        expiresAt: "",
      });
      setMessage("");
    }
  }
  async function save(remove = false) {
    if (!committee || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/people-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            committee,
            ...(selected ? { targetId: selected.id } : { email }),
            membership: remove ? null : membership,
          }),
        }),
        body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage(
        remove
          ? "Membership removed. Other committee memberships are preserved."
          : "Committee access saved. This person will sign in again.",
      );
      setMembership(null);
      setSelected(null);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Access could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!committees.length)
    return (
      <main className="committee-access" style={{ padding: "2rem" }}>
        <h1>People & access</h1>
        <p>Your account does not manage a committee.</p>
      </main>
    );
  return (
    <main
      className="committee-access"
      style={{ padding: "2rem", maxWidth: 1100 }}
    >
      <Link href="/admin">Dashboard</Link>
      <h1>People & access</h1>
      <CommitteeTermReminders />
      <p>
        Invite individual MASCA accounts, assign area roles and renew explicit
        term dates. Only platform administrators appoint managers or suspend
        whole accounts.
      </p>
      <CalendarSelect
        label="Committee"
        value={committee ?? ""}
        options={committees.map((s) => ({ value: s, label: s }))}
        onChange={(selected) => {
          setCommittee(selected as CommitteeScope);
          setSelected(null);
          setMembership(null);
          setPeople([]);
          setMessage("");
        }}
      />
      <button type="button" onClick={invite}>
        Invite person
      </button>
      {message && <p role="status">{message}</p>}
      <table>
        <thead>
          <tr>
            <th>Person</th>
            <th>Term ends</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>{person.email}</td>
              <td>{new Date(person.membership.expiresAt).toLocaleString()}</td>
              <td>
                <button
                  type="button"
                  disabled={
                    String(account.id) === person.id ||
                    (person.membership.manager &&
                      account.role !== "administrator")
                  }
                  onClick={() => {
                    setSelected(person);
                    setMembership(person.membership);
                    setMessage("");
                  }}
                >
                  Update / renew
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {membership && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h2>{selected ? selected.email : "Invite a MASCA account"}</h2>
          {!selected && (
            <label>
              Email{" "}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <MembershipEditor
            value={membership}
            onChange={setMembership}
            managerEditable={account.role === "administrator"}
          />
          <button disabled={busy || !membership.expiresAt} type="submit">
            Save committee access
          </button>
          {selected && (
            <button
              disabled={busy}
              type="button"
              onClick={() => void save(true)}
            >
              Remove membership
            </button>
          )}
          <button type="button" onClick={() => setMembership(null)}>
            Cancel
          </button>
        </form>
      )}
    </main>
  );
}
