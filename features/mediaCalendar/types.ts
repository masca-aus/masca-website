import type { ApprovedAccount } from "../access/workspacePolicy";
export type CalendarAccess = {
  view: boolean;
  edit: boolean;
  approve: boolean;
  designation: "member" | "chair" | null;
};
export type CalendarUser = Omit<ApprovedAccount, "grants"> & {
  id: string | number;
  grants?: ApprovedAccount["grants"];
  calendarAccess?: CalendarAccess | null;
};
export type Category = {
  id: string;
  name: string;
  color: string;
  archived: boolean;
};
export type PostStatus =
  "draft" | "in_review" | "changes_requested" | "approved" | "posted";
export type Asset = {
  id: string;
  postId: string;
  name: string;
  mime: string;
  size: number;
  key: string;
  ready: boolean;
  thumbnailKey?: string;
  createdBy: string;
  createdAt: string;
};
export type Comment = {
  id: string;
  author: string;
  body: string;
  mentions: string[];
  resolved: boolean;
  createdAt: string;
};
export type Post = {
  id: string;
  title: string;
  type: "feed" | "carousel" | "reel" | "story";
  category: string | null;
  plannedAt: string | null;
  preparationDate: string | null;
  creator: string;
  owner: string;
  collaborators: string[];
  checklist: { text: string; done: boolean }[];
  links: string[];
  onHold: boolean;
  holdReason: string;
  status: PostStatus;
  version: number;
  contentRevision: number;
  caption: string;
  captionState: string;
  contributors: string[];
  assets: string[];
  approval: { by: string; at: string; revision: number } | null;
  publishedURL: string;
  createdAt: string;
  updatedAt: string;
  checkpointAt: string;
  comments: Comment[];
};
export type Card = Pick<
  Post,
  | "id"
  | "title"
  | "type"
  | "category"
  | "plannedAt"
  | "status"
  | "onHold"
  | "version"
  | "owner"
> & { thumbnail: string | null };
export type CalendarNotification = {
  id: string;
  postId: string;
  message: string;
  read: boolean;
  createdAt: string;
};
export type Member = {
  id: string;
  name: string;
  edit: boolean;
  approve: boolean;
};
