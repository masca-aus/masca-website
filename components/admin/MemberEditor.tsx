"use client";
import {
  DefaultEditView,
  SaveButton,
  useAuth,
  useDocumentInfo,
  useFormFields,
} from "@payloadcms/ui";
import type { DocumentViewClientProps } from "payload";
import { Check, Info, UserRound } from "lucide-react";
import type { CommitteeMembership } from "@/features/access/committeePolicy";
import "./committeeAccess.css";
export function MemberEditorView(props: DocumentViewClientProps) {
  return (
    <div className="masca-member-editor">
      <DefaultEditView {...props} />
    </div>
  );
}
export function MemberSaveControl() {
  const { id, hasSavePermission } = useDocumentInfo();
  return hasSavePermission === false ? null : (
    <SaveButton label={id ? "Save member" : "Add member"} />
  );
}
export function MemberEditorHeader() {
  const { user } = useAuth();
  return (
    <section
      className="committee-access access-account-heading"
      aria-label="Member details"
    >
      <span className="access-account-heading__icon">
        <UserRound size={22} />
      </span>
      <div>
        <h2>Member details</h2>
        <p>Add an approved MASCA account. They’ll sign in with Google.</p>
      </div>
      {user?.accessModel !== "committee" && (
        <p className="access-staged-note">
          <Info size={15} />
          Committee access is awaiting rollout. Use Current access for
          permissions that apply today.
        </p>
      )}
    </section>
  );
}
export function MemberAccessSummary() {
  const { id } = useDocumentInfo();
  const { email, memberships, role, status } = useFormFields(([fields]) => ({
    email: String(fields.email?.value ?? ""),
    memberships: fields.committeeMemberships?.value,
    role: fields.role?.value,
    status: fields.status?.value,
  }));
  const members = Array.isArray(memberships)
    ? (memberships as CommitteeMembership[])
    : [];
  return (
    <aside
      className="committee-access access-final-summary"
      aria-label="Member setup summary"
    >
      <Check size={19} />
      <div>
        <strong>
          {email
            ? `${id ? "Save" : "Add"} ${email}`
            : "Add their MASCA email to get started"}
        </strong>
        <p>
          {members.length
            ? `${members.length} committee ${members.length === 1 ? "membership" : "memberships"} configured. Review the area roles and term dates above.`
            : role === "administrator"
              ? "Platform administration is separate from content access. Add committee memberships for content roles."
              : "No committee memberships configured. Add a committee to assign content access."}
        </p>
        <span>
          {status === "suspended"
            ? "This account is suspended and cannot sign in."
            : !id || status === "invited"
              ? "First sign-in activates the account. No invitation email is sent."
              : "The member uses their MASCA Google account to sign in."}
        </span>
      </div>
    </aside>
  );
}
