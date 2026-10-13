"use client";
import { useAuth } from "@payloadcms/ui";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  LoaderCircle,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { managedCommittees } from "@/features/access/delegatedAccessClient";
import {
  activeMemberships,
  committeeAreas,
  type CommitteeAccount,
  type CommitteeMembership,
  type CommitteeScope,
} from "@/features/access/committeePolicy";
import {
  isWorkspaceEmail,
  normalizedEmail,
} from "@/features/access/workspacePolicy";
import {
  memberAreaLabels,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import { CalendarSelect } from "./mediaCalendar/CalendarSelect";
import { MembershipEditor } from "./CommitteeMemberships";
import { CommitteeTermReminders } from "./CommitteeTermReminders";
import { AdminLink as Link } from "./AdminNavigationContext";
import "./committeeAccess.css";
type Person = { id: string; email: string; membership: CommitteeMembership };
export function PeopleAccess() {
  const { user } = useAuth(),
    account = user as unknown as CommitteeAccount;
  const committees = managedCommittees(account);
  const [committee, setCommittee] = useState<CommitteeScope | undefined>(
    committees[0],
  );
  const [people, setPeople] = useState<Person[]>([]),
    [selected, setSelected] = useState<Person | null>(null),
    [membership, setMembership] = useState<CommitteeMembership | null>(null),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [confirmRemoval, setConfirmRemoval] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const managerTerm =
    account?.role === "administrator"
      ? undefined
      : activeMemberships(account).find(
          (item) => item.committee === committee && item.manager,
        )?.expiresAt;
  async function refresh() {
    try {
      const response = await fetch(
          `/api/people-access?committee=${committee}`,
          { cache: "no-store" },
        ),
        body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPeople(body.people);
    } catch {
      setError(
        "The member list could not refresh. Reload this page to try again.",
      );
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    if (committee)
      void fetch(`/api/people-access?committee=${committee}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = await response.json();
          if (!controller.signal.aborted) {
            if (response.ok) setPeople(body.people);
            else setError(body.error ?? "Members could not be loaded.");
          }
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError("Members could not be loaded. Please try again.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => controller.abort();
  }, [committee]);
  const composingId=membership?.id;
  useEffect(() => {
    if (composingId && !selected)
      emailInput.current?.focus({ preventScroll: true });
  }, [composingId, selected]);
  function close() {
    if (busy) return;
    setMembership(null);
    setSelected(null);
    setConfirmRemoval(false);
    setError("");
  }
  function invite() {
    setSelected(null);
    setEmail("");
    setError("");
    setNotice("");
    setConfirmRemoval(false);
    if (committee)
      setMembership({
        id: crypto.randomUUID(),
        committee,
        roles: {},
        manager: false,
        expiresAt: "",
      });
  }
  async function save(remove = false) {
    if (!committee || busy) return;
    if (!remove) {
      if (!selected && !isWorkspaceEmail(email)) {
        setError("Use an individual @masca.org.au email address.");
        emailInput.current?.focus();
        return;
      }
      if (
        !membership?.expiresAt ||
        !Number.isFinite(Date.parse(membership.expiresAt)) ||
        Date.parse(membership.expiresAt) <= Date.now()
      ) {
        setError("Choose a future committee term end date.");
        return;
      }
      if (
        managerTerm &&
        Date.parse(membership.expiresAt) > Date.parse(managerTerm)
      ) {
        setError(
          "Member access cannot extend beyond your access manager term.",
        );
        return;
      }
      if (
        !membership.manager &&
        !committeeAreas.some((area) => membership.roles[area]?.length)
      ) {
        setError("Choose at least one access area for this member.");
        return;
      }
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/people-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            committee,
            ...(selected
              ? { targetId: selected.id }
              : { email: normalizedEmail(email) }),
            membership: remove ? null : membership,
          }),
        }),
        body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setNotice(
        remove
          ? `Membership removed from ${committee}. Their other committee access is unchanged.`
          : selected
            ? "Member access updated."
            : "Member added. They can sign in with their MASCA Google account.",
      );
      setMembership(null);
      setSelected(null);
      setConfirmRemoval(false);
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Member access could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!committees.length)
    return (
      <main className="committee-access access-people-page">
        <h1>People & access</h1>
        <p>Your account does not manage a committee.</p>
      </main>
    );
  const ready =
    membership &&
    !!membership.expiresAt &&
    (membership.manager ||
      committeeAreas.some((area) => membership.roles[area]?.length)) &&
    (selected || isWorkspaceEmail(email));
  return (
    <main className="committee-access access-people-page">
      <Link href="/admin" className="access-back">
        <ArrowLeft size={15} />
        Dashboard
      </Link>
      <header className="access-people-heading">
        <div>
          <h1>People & access</h1>
          <p>Add teammates and manage access for your committee.</p>
        </div>
        {!membership && (
          <button
            type="button"
            className="access-primary"
            disabled={busy}
            onClick={invite}
          >
            <Plus size={16} />
            Add member
          </button>
        )}
      </header>
      <CommitteeTermReminders />
      <div className="access-people-toolbar">
        <CalendarSelect
          label="Committee"
          value={committee ?? ""}
          disabled={busy}
          options={committees.map((scope) => ({ value: scope, label: scope }))}
          onChange={(scope) => {
            setCommittee(scope as CommitteeScope);
            setSelected(null);
            setMembership(null);
            setPeople([]);
            setError("");
            setNotice("");
            setLoading(true);
            setConfirmRemoval(false);
          }}
        />
        <span>
          {people.length} {people.length === 1 ? "member" : "members"}
        </span>
      </div>
      {notice && (
        <p role="status" className="access-notice">
          <Check size={16} />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="access-error">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      {membership && (
        <form
          className="access-member-form"
          aria-label={selected ? "Edit member" : "Add member"}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header>
            <div>
              <h2>{selected ? "Edit member" : "Add member"}</h2>
              <p>
                {selected
                  ? selected.email
                  : "Use their individual MASCA Google account."}
              </p>
            </div>
            <button
              type="button"
              className="access-icon-button"
              disabled={busy}
              aria-label="Close member form"
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          {!selected && (
            <div className="access-email-field">
              <label htmlFor="member-email">MASCA email</label>
              <input
                id="member-email"
                ref={emailInput}
                type="email"
                autoComplete="email"
                spellCheck={false}
                disabled={busy}
                placeholder="name@masca.org.au"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
              />
              <span>
                No invitation email is sent. First sign-in activates the
                account.
              </span>
            </div>
          )}
          <MembershipEditor
            value={membership}
            disabled={busy}
            maxExpiresAt={managerTerm}
            managerEditable={account.role === "administrator"}
            onChange={(value) => {
              setMembership(value);
              setError("");
            }}
          />
          <footer>
            <span>
              {committee} access only. Other memberships are preserved.
            </span>
            <div>
              <button type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                className="access-primary"
                disabled={busy || !ready}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={15} className="access-spin" />
                    Saving…
                  </>
                ) : selected ? (
                  "Save member"
                ) : (
                  "Add member"
                )}
              </button>
            </div>
          </footer>
          {selected && (
            <details className="access-remove-settings">
              <summary>Remove committee access</summary>
              <p>
                This removes their {committee} membership. Their posts, history
                and other committee access are kept.
              </p>
              {confirmRemoval ? (
                <div className="access-actions">
                  <button
                    type="button"
                    disabled={busy}
                    className="access-danger"
                    onClick={() => void save(true)}
                  >
                    Confirm removal
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmRemoval(false)}
                  >
                    Keep membership
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmRemoval(true)}
                >
                  Remove membership
                </button>
              )}
            </details>
          )}
        </form>
      )}
      <section
        className="access-member-list"
        aria-label={`${committee} members`}
        aria-busy={loading}
      >
        {loading ? (
          <div className="access-list-loading">
            <LoaderCircle size={18} className="access-spin" />
            <span>Loading members…</span>
          </div>
        ) : !people.length ? (
          <div className="access-list-empty">
            <UsersRound size={28} />
            <h2>No members yet</h2>
            <p>Add a teammate to give them access to {committee}.</p>
          </div>
        ) : (
          people.map((person) => {
            const areas = committeeAreas.filter(
                (area) => person.membership.roles[area]?.length,
              ),
              current = Date.parse(person.membership.expiresAt) > now;
            return (
              <article key={person.id} className="access-person">
                <span className="access-person__avatar" aria-hidden="true">
                  {person.email.slice(0, 2).toUpperCase()}
                </span>
                <div className="access-person__details">
                  <strong>{person.email}</strong>
                  <span>
                    {areas.length
                      ? areas.map((area) => memberAreaLabels[area]).join(" · ")
                      : "Access management only"}
                  </span>
                  <small>
                    Term ends {memberTermLabel(person.membership.expiresAt)} ·
                    AEST
                  </small>
                </div>
                <span className="access-person__term" data-expired={!current}>
                  {current ? "Current term" : "Expired term"}
                </span>
                <button
                  type="button"
                  disabled={
                    busy ||
                    String(account.id) === person.id ||
                    (person.membership.manager &&
                      account.role !== "administrator")
                  }
                  onClick={() => {
                    setSelected(person);
                    setMembership(person.membership);
                    setError("");
                    setNotice("");
                    setConfirmRemoval(false);
                  }}
                >
                  Edit access
                </button>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
