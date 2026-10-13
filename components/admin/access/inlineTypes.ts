import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import type { CommitteeArea } from "@/features/access/committeePolicy";
import type { AccessMutation } from "@/features/access/workspaces/mutations";
export type InlineContext = {
  snapshot: AccessGraphSnapshot;
  workspaceId?: string;
  area?: CommitteeArea;
  personId?: string;
};
export type InlineEditorState = (
  | { kind: "workspace" | "person" }
  | { kind: "tools"; workspaceId: string }
  | {
      kind: "member";
      workspaceId: string;
      area?: CommitteeArea;
      personId?: string;
      manager?: boolean;
    }
  | {
      kind: "renew" | "remove";
      workspaceId: string;
      personId: string;
      area?: CommitteeArea;
      areaOnly?: boolean;
    }
  | {
      kind: "details";
      workspaceId?: string;
      area?: CommitteeArea;
      personId: string;
    }
) & { snapshot: AccessGraphSnapshot; group?: "people" | "table" };
export type EditorProps = {
  onSave: (input: AccessMutation) => Promise<void>;
  onCancel: () => void;
  onReview: () => Promise<AccessGraphSnapshot>;
  busy: boolean;
};
export class AccessSaveError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
