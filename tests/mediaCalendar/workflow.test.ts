import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { newPost, applyAction } from "../../features/mediaCalendar/service";
import type { CalendarUser } from "../../features/mediaCalendar/types";
const author: CalendarUser = {
  id: "1",
  email: "one@masca.org.au",
  status: "active",
  role: "editor",
  calendarAccess: {
    view: true,
    edit: true,
    approve: true,
    designation: "member",
  },
};
const reviewer: CalendarUser = { ...author, id: "2" };
const update = (text: string) => {
  const d = new Y.Doc();
  d.getText("caption").insert(0, text);
  return Buffer.from(Y.encodeStateAsUpdate(d)).toString("base64");
};
describe("calendar workflow and concurrent edits", () => {
  it("rejects stale metadata and prevents direct workflow overrides", () => {
    const p = newPost(author, {});
    expect(() =>
      applyAction(p, author, {
        action: "patch",
        expectedVersion: 0,
        patch: { title: "lost" },
      }),
    ).toThrow("changed");
    expect(() =>
      applyAction(p, author, {
        action: "patch",
        expectedVersion: 1,
        patch: { status: "posted" } as never,
      }),
    ).toThrow();
  });
  it("requires media and a reviewed revision, then freezes content", () => {
    const p = newPost(author, {});
    expect(() =>
      applyAction(p, author, { action: "review", expectedRevision: 1 }),
    ).toThrow("media");
    p.assets = ["ready-asset"];
    applyAction(p, author, { action: "review", expectedRevision: 1 });
    expect(p.status).toBe("in_review");
    expect(() =>
      applyAction(p, author, { action: "caption", update: update("oops") }),
    ).toThrow("review");
    expect(() =>
      applyAction(p, author, { action: "approve", expectedRevision: 1 }),
    ).toThrow("another");
    applyAction(p, reviewer, { action: "approve", expectedRevision: 1 });
    expect(p.approval?.by).toBe("2");
    expect(() =>
      applyAction(p, reviewer, { action: "approve", expectedRevision: 1 }),
    ).toThrow();
  });
  it("preserves approval when rescheduled but invalidates it after content edits", () => {
    const p = newPost(author, {});
    p.assets = ["a"];
    p.status = "approved";
    p.approval = { by: "2", revision: 1, at: new Date().toISOString() };
    applyAction(p, author, {
      action: "patch",
      expectedVersion: 1,
      patch: { plannedAt: "2026-10-15T08:00:00.000Z" },
    });
    expect(p.status).toBe("approved");
    expect(p.contentRevision).toBe(1);
    applyAction(p, author, {
      action: "caption",
      update: update("new caption"),
    });
    expect(p.status).toBe("draft");
    expect(p.approval).toBeNull();
  });
  it("merges simultaneous caption changes without losing text or attributing replay", () => {
    const p = newPost(author, {});
    const a = update("hello");
    const b = update("world");
    applyAction(p, author, { action: "caption", update: a });
    applyAction(p, reviewer, { action: "caption", update: b });
    expect(p.caption).toContain("hello");
    expect(p.caption).toContain("world");
    expect(p.contributors).toEqual(["1", "2"]);
    const revision = p.contentRevision;
    applyAction(p, author, { action: "caption", update: a });
    expect(p.contentRevision).toBe(revision);
  });
  it("blocks any contributor approval and posted edits; duplication starts fresh", () => {
    const p = newPost(author, {});
    p.assets = ["a"];
    applyAction(p, reviewer, {
      action: "caption",
      update: update("contributed"),
    });
    applyAction(p, author, {
      action: "review",
      expectedRevision: p.contentRevision,
    });
    expect(() =>
      applyAction(p, reviewer, {
        action: "approve",
        expectedRevision: p.contentRevision,
      }),
    ).toThrow("another");
    p.status = "posted";
    expect(() =>
      applyAction(p, author, {
        action: "patch",
        expectedVersion: p.version,
        patch: { title: "change" },
      }),
    ).toThrow("posted");
  });
  it("keeps hold separate and requires approved content before manually posting", () => {
    const p = newPost(author, {});
    applyAction(p, author, {
      action: "patch",
      expectedVersion: 1,
      patch: { onHold: true, holdReason: "waiting" },
    });
    expect(p.status).toBe("draft");
    expect(() =>
      applyAction(p, author, {
        action: "posted",
        expectedRevision: 1,
        url: "",
      }),
    ).toThrow();
  });
});
