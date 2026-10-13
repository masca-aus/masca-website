"use client";
import { useAuth, useField, useDocumentInfo } from "@payloadcms/ui";
import {
  accessibleCommittees,
  committeeMode,
  type CommitteeArea,
} from "@/features/access/committeePolicy";
import type { ApprovedAccount } from "@/features/access/workspacePolicy";
import { WorkspaceSelect } from "./WorkspaceSelect";
export function WorkspaceOwner({ path }: { path: string }) {
  const { user } = useAuth(),
    account = user as unknown as ApprovedAccount;
  const { id, collectionSlug } = useDocumentInfo();
  const { value, setValue } = useField<string>({ path });
  if (!committeeMode(account)) return null;
  const ids = accessibleCommittees(
    account,
    collectionSlug as CommitteeArea,
    "create",
  );
  const options = (
    id && value && !ids.includes(value) ? [value, ...ids] : ids
  ).map((id) => ({
    id,
    name:
      account.workspaceNames?.[id] ??
      (id.startsWith("ws-") ? "Shared workspace" : id),
  }));
  return (
    <div className="access-owner">
      <label>Workspace</label>
      <WorkspaceSelect
        value={value ?? ""}
        options={options}
        onChange={setValue}
        disabled={!!id}
      />
    </div>
  );
}
