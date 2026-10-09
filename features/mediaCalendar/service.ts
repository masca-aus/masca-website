import * as Y from "yjs";
import { randomUUID } from "node:crypto";
import type { CalendarUser, Post } from "./types.ts";
import { mayApprove, mayUseCalendar } from "./policy.ts";
import { CalendarError, patchSchema, type Action } from "./validation.ts";
export function newPost(user: CalendarUser, input: unknown): Post {
  if (!mayUseCalendar(user, "edit"))
    throw new CalendarError("Calendar editing access is required.", 403);
  const patch = patchSchema.parse(input),
    now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Untitled post",
    type: "feed",
    category: null,
    plannedAt: null,
    preparationDate: null,
    creator: String(user.id),
    owner: String(user.id),
    collaborators: [],
    checklist: [],
    links: [],
    onHold: false,
    holdReason: "",
    status: "draft",
    version: 1,
    contentRevision: 1,
    caption: "",
    captionState: Buffer.from(Y.encodeStateAsUpdate(new Y.Doc())).toString(
      "base64",
    ),
    contributors: [String(user.id)],
    assets: [],
    approval: null,
    publishedURL: "",
    createdAt: now,
    updatedAt: now,
    checkpointAt: now,
    comments: [],
    ...patch,
  };
}
const editable = (p: Post) => {
  if (p.status === "in_review")
    throw new CalendarError("Withdraw review before editing content.", 409);
  if (p.status === "posted")
    throw new CalendarError(
      "This post is posted. Duplicate it to make changes.",
      409,
    );
};
function contentChanged(p: Post, user: CalendarUser) {
  p.contentRevision++;
  p.contributors = Array.from(new Set([...p.contributors, String(user.id)]));
  if (p.status === "approved") {
    p.status = "draft";
    p.approval = null;
  }
}
/** Must run while holding the database row lock. Asset ownership/completion is checked by repository. */
export function applyAction(p: Post, user: CalendarUser, a: Action): boolean {
  if (!mayUseCalendar(user, "view"))
    throw new CalendarError("Calendar access is required.", 403);
  const isDiscussion = a.action === "comment" || a.action === "resolve";
  if (
    !isDiscussion &&
    a.action !== "approve" &&
    a.action !== "changes" &&
    !mayUseCalendar(user, "edit")
  )
    throw new CalendarError("Calendar editing access is required.", 403);
  const now = new Date().toISOString();
  let changed = true;
  if (p.deletedAt && a.action !== "restore")
    throw new CalendarError(
      "This post was deleted. Restore it before making changes.",
      409,
    );
  if (a.action === "draft" || a.action === "delete" || a.action === "restore") {
    if (p.version !== a.expectedVersion)
      throw new CalendarError(
        "This post changed. Reload it before trying again.",
        409,
      );
    if (a.action === "draft") {
      if (p.status === "posted") editable(p);
      p.status = "draft";
      p.approval = null;
    } else if (a.action === "delete") p.deletedAt = now;
    else {
      if (!p.deletedAt)
        throw new CalendarError("This post has already been restored.", 409);
      p.deletedAt = null;
    }
  } else if (a.action === "patch") {
    if (p.status === "posted") editable(p);
    if (p.version !== a.expectedVersion)
      throw new CalendarError(
        "This post changed. Reload it before saving your details.",
        409,
      );
    const patch = patchSchema.parse(a.patch);
    const modifiesContent = ["assets", "type", "title"].some(
      (k) =>
        k in patch &&
        JSON.stringify(patch[k as keyof typeof patch]) !==
          JSON.stringify(p[k as keyof Post]),
    );
    if (modifiesContent) {
      editable(p);
      contentChanged(p, user);
    }
    Object.assign(p, patch);
  } else if (a.action === "caption") {
    editable(p);
    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, Buffer.from(p.captionState, "base64"));
      const before = Buffer.from(Y.encodeStateVector(doc)).toString("base64");
      Y.applyUpdate(doc, Buffer.from(a.update, "base64"));
      if (
        doc.share.size > 1 ||
        [...doc.share.keys()].some((key) => key !== "caption")
      )
        throw new Error();
      const text = doc.getText("caption").toString();
      if (text.length > 20000)
        throw new CalendarError(
          "Draft captions must be under 20,000 characters.",
        );
      const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
      if (state.length > 140000)
        throw new CalendarError(
          "Caption history is too large. Copy your caption into a new draft.",
        );
      changed = state !== p.captionState;
      if (changed) {
        if (
          text !== p.caption ||
          before !== Buffer.from(Y.encodeStateVector(doc)).toString("base64")
        )
          contentChanged(p, user);
        p.caption = text;
        p.captionState = state;
      }
    } catch (e) {
      if (e instanceof CalendarError) throw e;
      throw new CalendarError("The caption update could not be read.");
    } finally {
      doc.destroy();
    }
  } else if (a.action === "comment") {
    p.comments.push({
      id: randomUUID(),
      author: String(user.id),
      body: a.body,
      mentions: a.mentions,
      resolved: false,
      createdAt: now,
    });
  } else if (a.action === "resolve") {
    const c = p.comments.find((c) => c.id === a.commentId);
    if (!c) throw new CalendarError("Comment not found.", 404);
    if (c.author !== String(user.id) && !mayUseCalendar(user, "edit"))
      throw new CalendarError(
        "Only the author or an editor can resolve this comment.",
        403,
      );
    c.resolved = a.resolved;
  } else {
    if (a.expectedRevision !== p.contentRevision)
      throw new CalendarError(
        "The content changed. Please review the current revision.",
        409,
      );
    switch (a.action) {
      case "review":
        if (!["draft", "changes_requested"].includes(p.status))
          throw new CalendarError(
            "This post is already under review or approved.",
            409,
          );
        if (!p.assets.length)
          throw new CalendarError("Add media before requesting review.");
        if (p.caption.length > 2200)
          throw new CalendarError(
            "Instagram captions must be 2,200 characters or fewer before review.",
          );
        if (p.onHold)
          throw new CalendarError("Remove the hold before requesting review.");
        p.status = "in_review";
        p.approval = null;
        break;
      case "approve":
        if (p.status !== "in_review")
          throw new CalendarError("This post is not awaiting review.", 409);
        if (!mayApprove(user, p))
          throw new CalendarError(
            "Approval needs another media member or chair who did not contribute to this content.",
            403,
          );
        if (p.onHold)
          throw new CalendarError("Remove the hold before approving.");
        p.status = "approved";
        p.approval = {
          by: String(user.id),
          at: now,
          revision: p.contentRevision,
        };
        break;
      case "withdraw":
        if (p.status !== "in_review")
          throw new CalendarError("This post is not under review.", 409);
        p.status = "draft";
        break;
      case "changes":
        if (!mayUseCalendar(user, "approve"))
          throw new CalendarError("Review access is required.", 403);
        if (p.status !== "in_review" || !a.message?.trim())
          throw new CalendarError(
            "Add a comment explaining the requested changes.",
          );
        p.status = "changes_requested";
        p.approval = null;
        p.comments.push({
          id: randomUUID(),
          author: String(user.id),
          body: a.message,
          mentions: [],
          resolved: false,
          createdAt: now,
        });
        break;
      case "posted":
        if (
          p.status !== "approved" ||
          p.approval?.revision !== p.contentRevision ||
          p.onHold
        )
          throw new CalendarError(
            "Approve the current content and remove any hold before marking it posted.",
          );
        p.status = "posted";
        p.publishedURL = a.url ?? "";
        break;
      case "duplicate":
        return false; // repository creates a fresh draft instead
    }
  }
  if (changed) {
    p.version++;
    p.updatedAt = now;
  }
  return changed;
}
