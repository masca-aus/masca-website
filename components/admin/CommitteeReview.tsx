"use client";
import "./committeeAccess.css";
import { useAuth, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { useState } from "react";
import {
  committeeMode,
  mayAccessResource,
  type CommitteeAccount,
  type CommitteeArea,
  type CommitteeScope,
  type SharingGrant,
} from "@/features/access/committeePolicy";
export function CommitteeReview() {
  const { user } = useAuth(),
    { id, collectionSlug } = useDocumentInfo(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const record = useFormFields(([fields]) => ({
    area: collectionSlug as CommitteeArea,
    owningScope: fields.owningScope?.value as CommitteeScope,
    creator: fields.accessCreator?.value as string,
    contributors: fields.accessContributors?.value as string[],
    sharedWith: fields.sharedWith?.value as SharingGrant[],
  }));
  const canEdit = mayAccessResource(
      user as unknown as CommitteeAccount,
      record,
      "edit",
    ),
    canApprove = mayAccessResource(
      user as unknown as CommitteeAccount,
      record,
      "approve",
    );
  if (
    !committeeMode(user as unknown as CommitteeAccount) ||
    !id ||
    !collectionSlug
  )
    return null;
  async function action(value: string) {
    setBusy(true);
    try {
      const response = await fetch(
          `/api/${collectionSlug}/${id}/access-review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: value }),
          },
        ),
        body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage(
        value === "approve"
          ? "Current revision approved. You can publish this saved revision."
          : value === "publish"
            ? "Approved revision published."
            : value === "unpublish"
              ? "Record unpublished."
              : "Current revision submitted for independent review.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Review could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="committee-access">
      <p>
        Save your draft before submitting. A different committee approver must
        review the current revision before publication. Content edits invalidate
        approval.
      </p>
      {canEdit && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action("submit")}
        >
          Submit saved revision
        </button>
      )}
      {canApprove && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action("approve")}
        >
          Approve saved revision
        </button>
      )}
      {canApprove && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action("publish")}
        >
          Publish approved revision
        </button>
      )}
      {canApprove && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action("unpublish")}
        >
          Unpublish
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
