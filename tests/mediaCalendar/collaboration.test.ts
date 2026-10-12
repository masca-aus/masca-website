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
it("converges four simultaneous caption contributors without losing their text", () => {
  const p = newPost(user, {});
  const documents = Array.from({ length: 4 }, () => new Y.Doc());
  const names = ["Sarah", "Amir", "Mei", "Ravi"];
  for (let i = 0; i < 4; i++)
    documents[i].getText("caption").insert(0, `${names[i]} `);
  for (const i of [2, 0, 3, 1])
    applyAction(
      p,
      { ...user, id: String(i + 1) },
      {
        action: "caption",
        update: Buffer.from(Y.encodeStateAsUpdate(documents[i])).toString(
          "base64",
        ),
      },
    );
  for (const doc of documents) {
    Y.applyUpdate(doc, Buffer.from(p.captionState, "base64"));
    expect(doc.getText("caption").toString()).toBe(p.caption);
  }
  for (const name of names) expect(p.caption).toContain(name);
  documents.forEach((doc) => doc.destroy());
});
