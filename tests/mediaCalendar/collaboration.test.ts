import { it, expect } from "vitest";
import * as Y from "yjs";
import { newPost, applyAction } from "../../features/mediaCalendar/service";
import {
  presenceSchema,
  memberName,
} from "../../features/mediaCalendar/collaboration";
import type { CalendarUser } from "../../features/mediaCalendar/types";
const user: CalendarUser = {
  id: "1",
  email: "media.one@masca.org.au",
  status: "active",
  role: "editor",
  calendarAccess: {
    view: true,
    edit: true,
    approve: false,
    designation: "member",
  },
};
it("merges simultaneous unicode inserts and deletes after disconnection", () => {
  const p = newPost(user, {}),
    a = new Y.Doc(),
    b = new Y.Doc();
  a.getText("caption").insert(0, "Hello 🇲🇾");
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  applyAction(p, user, {
    action: "caption",
    update: Buffer.from(Y.encodeStateAsUpdate(a)).toString("base64"),
  });
  a.getText("caption").insert(0, "A ");
  b.getText("caption").delete(0, 5);
  b.getText("caption").insert(0, "B");
  applyAction(
    p,
    { ...user, id: "2" },
    {
      action: "caption",
      update: Buffer.from(Y.encodeStateAsUpdate(b)).toString("base64"),
    },
  );
  applyAction(p, user, {
    action: "caption",
    update: Buffer.from(Y.encodeStateAsUpdate(a)).toString("base64"),
  });
  Y.applyUpdate(a, Buffer.from(p.captionState, "base64"));
  Y.applyUpdate(b, Buffer.from(p.captionState, "base64"));
  expect(a.getText("caption").toString()).toBe(b.getText("caption").toString());
  expect(p.caption).toContain("🇲🇾");
});
it("bounds cursor messages and derives names from verified users", () => {
  expect(
    presenceSchema.safeParse({ clientId: "wrong", cursor: null }).success,
  ).toBe(false);
  expect(memberName(user)).toBe("media one");
  expect(
    presenceSchema.safeParse({
      clientId: crypto.randomUUID(),
      cursor: { anchor: "a".repeat(1025), head: "" },
    }).success,
  ).toBe(false);
});
