import { expect, it } from "vitest";
import type { Field, CollapsibleField } from "payload";
import { configureWorkspace } from "../features/access/configureWorkspace";
it("puts member identity before committee access and preserves every field's root path in collapsed account settings", () => {
  const collection = configureWorkspace([{ slug: "users", fields: [] }])[0];
  const visible = collection.fields.filter(
    (field) => !(field.admin && "hidden" in field.admin && field.admin.hidden),
  );
  expect("name" in visible[1] && visible[1].name).toBe("email");
  const paths: string[] = [];
  function walk(fields: Field[]) {
    for (const field of fields) {
      if ("name" in field) paths.push(field.name);
      if ("fields" in field) walk(field.fields);
    }
  }
  walk(collection.fields);
  for (const name of [
    "email",
    "role",
    "status",
    "committeeMemberships",
    "committeeAccessRevision",
    "permissions",
    "calendarAccess",
  ])
    expect(paths.filter((path) => path === name)).toHaveLength(1);
  const settings = collection.fields.find(
    (field): field is CollapsibleField =>
      field.type === "collapsible" && field.label === "Account settings",
  );
  expect(settings?.admin?.initCollapsed).toBe(true);
  expect(
    settings &&
      "fields" in settings &&
      settings.fields.some((field) => "name" in field && field.name === "role"),
  ).toBe(true);
});
