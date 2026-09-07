import { describe, expect, it, vi } from "vitest";

// The collection's afterChange/afterDelete hooks call revalidatePath; outside
// a real Next request there is no cache to invalidate, so stub it and assert
// on the calls instead.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import configPromise from "@payload-config";
import { toCommitteeMember } from "@/utils/committee";
import { getCommitteeGroups } from "@/utils/committeeGroups";
import {
  COMMITTEE_DEPARTMENT_OPTIONS,
  COMMITTEE_DEPARTMENTS,
} from "@/utils/committeeDepartments";
import type { Committee } from "@/payload-types";

const getCommitteeCollection = async () => {
  const config = await configPromise;
  const committee = config.collections.find((c) => c.slug === "committee");
  if (!committee) throw new Error("committee collection not found");
  return committee;
};

const getField = async (name: string) => {
  const committee = await getCommitteeCollection();
  const field = committee.fields.find((f) => "name" in f && f.name === name);
  if (!field) throw new Error(`field ${name} not found`);
  return field;
};

describe("committee collection (Payload-served committee page)", () => {
  it("mirrors the member shape: required name/role/department/year, optional bio/uni/course/linkedin", async () => {
    for (const name of ["name", "role", "department", "year"]) {
      const field = await getField(name);
      expect("required" in field && field.required, `${name} required`).toBe(true);
    }
    for (const name of ["bio", "university", "course", "linkedin_url"]) {
      const field = await getField(name);
      expect("required" in field && field.required, `${name} optional`).toBeFalsy();
    }
    for (const name of ["university", "course"]) {
      const field = await getField(name);
      expect(field.type, `${name} is text`).toBe("text");
    }
  });

  it("offers the fixed MASCA departments plus an explicit legacy review bucket", async () => {
    const department = await getField("department");
    expect(department.type).toBe("select");
    expect("options" in department && department.options).toEqual(
      COMMITTEE_DEPARTMENT_OPTIONS,
    );
    expect("defaultValue" in department && department.defaultValue).toBe("unassigned");
  });

  it("orders by drag-and-drop instead of a manual order field", async () => {
    const committee = await getCommitteeCollection();
    expect(committee.orderable).toBe(true);
    expect(committee.defaultSort).toBe("_order");
    // The old numeric field is gone — `_order` is injected by Payload itself.
    const order = committee.fields.find((f) => "name" in f && f.name === "order");
    expect(order).toBeUndefined();
  });

  it("relates the portrait to the Media collection and requires it", async () => {
    const portrait = await getField("portrait");
    expect(portrait.type).toBe("upload");
    expect("relationTo" in portrait && portrait.relationTo).toBe("media");
    expect("required" in portrait && portrait.required).toBe(true);
  });

  it("validates the year format so bad terms are rejected at save time", async () => {
    const year = await getField("year");
    if (!("validate" in year) || typeof year.validate !== "function")
      throw new Error("year has no validate function");
    expect(year.validate("2026/2027" as never, {} as never)).toBe(true);
    expect(year.validate("2026" as never, {} as never)).not.toBe(true);
    expect(year.validate("26/27" as never, {} as never)).not.toBe(true);
    expect(year.validate("" as never, {} as never)).not.toBe(true);
  });

  it("validates linkedin_url as an https URL but allows it to be empty", async () => {
    const linkedin = await getField("linkedin_url");
    if (!("validate" in linkedin) || typeof linkedin.validate !== "function")
      throw new Error("linkedin_url has no validate function");
    expect(
      linkedin.validate("https://www.linkedin.com/in/example" as never, {} as never),
    ).toBe(true);
    expect(linkedin.validate(undefined as never, {} as never)).toBe(true);
    expect(linkedin.validate("" as never, {} as never)).toBe(true);
    expect(linkedin.validate("not a url" as never, {} as never)).not.toBe(true);
    expect(linkedin.validate("http://insecure.example" as never, {} as never)).not.toBe(true);
  });

  it("is publicly readable", async () => {
    const committee = await getCommitteeCollection();
    const canRead = committee.access.read({ req: { user: null } } as never);
    expect(canRead).toBe(true);
  });

  it("revalidates the committee page (and homepage teaser) on change and delete", async () => {
    const committee = await getCommitteeCollection();
    const afterChange = committee.hooks?.afterChange ?? [];
    const afterDelete = committee.hooks?.afterDelete ?? [];
    expect(afterChange.length).toBeGreaterThan(0);
    expect(afterDelete.length).toBeGreaterThan(0);

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterChange) await hook({} as never);
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain("/committee");
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain("/");

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterDelete) await hook({} as never);
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain("/committee");
  });
});

describe("toCommitteeMember (Payload doc → page shape)", () => {
  const doc: Committee = {
    id: 7,
    _order: "a0",
    name: "Ava Tan",
    role: "President",
    department: "chairs",
    portrait: {
      id: 1,
      alt: "Ava Tan",
      url: "https://test-project.storage.supabase.co/storage/v1/object/public/media/ava.jpg",
      updatedAt: "2026-07-22T00:00:00.000Z",
      createdAt: "2026-07-22T00:00:00.000Z",
    },
    year: "2026/2027",
    university: "Monash University",
    course: "Bachelor of Commerce",
    linkedin_url: "https://www.linkedin.com/in/example-ava",
    bio: "Leads MASCA's national strategy.",
    updatedAt: "2026-07-22T00:00:00.000Z",
    createdAt: "2026-07-22T00:00:00.000Z",
  };

  it("maps a populated doc, pulling img from the portrait's Supabase URL", () => {
    expect(toCommitteeMember(doc)).toEqual({
      id: "7",
      name: "Ava Tan",
      role: "President",
      department: "chairs",
      img: "https://test-project.storage.supabase.co/storage/v1/object/public/media/ava.jpg",
      year: "2026/2027",
      university: "Monash University",
      course: "Bachelor of Commerce",
      linkedin_url: "https://www.linkedin.com/in/example-ava",
      bio: "Leads MASCA's national strategy.",
    });
  });

  it("coalesces missing optional fields to undefined so the UI hides them", () => {
    const member = toCommitteeMember({
      ...doc,
      linkedin_url: null,
      university: null,
      course: null,
      bio: null,
    });
    expect(member.linkedin_url).toBeUndefined();
    expect(member.university).toBeUndefined();
    expect(member.course).toBeUndefined();
    expect(member.bio).toBeUndefined();
  });

  it("degrades to an empty img rather than crashing when the portrait is unpopulated", () => {
    const member = toCommitteeMember({ ...doc, portrait: 1 });
    expect(member.img).toBe("");
  });
});

describe("getCommitteeGroups", () => {
  const member = (id: string, department: Committee["department"]) =>
    toCommitteeMember({
      id: Number(id),
      _order: id,
      name: `Member ${id}`,
      role: "Executive",
      department,
      portrait: 1,
      year: "2026/2027",
      updatedAt: "2026-07-22T00:00:00.000Z",
      createdAt: "2026-07-22T00:00:00.000Z",
    });

  it("groups members in the fixed department order while preserving member order", () => {
    const groups = getCommitteeGroups([
      member("1", "treasury"),
      member("2", "chairs"),
      member("3", "treasury"),
      member("4", "amplifies"),
    ]);

    expect(groups.map((group) => group.department)).toEqual([
      "chairs",
      "treasury",
      "amplifies",
    ]);
    expect(groups[1]?.members.map(({ id }) => id)).toEqual(["1", "3"]);
  });

  it("keeps legacy unassigned records visible at the end for safe review", () => {
    const groups = getCommitteeGroups([
      member("1", "unassigned"),
      member("2", "cares"),
    ]);

    expect(groups.map((group) => group.department)).toEqual([
      "cares",
      "unassigned",
    ]);
  });

  it("defines the seven public MASCA departments in the agreed order", () => {
    expect(COMMITTEE_DEPARTMENTS.map(({ label }) => label)).toEqual([
      "Chairs",
      "Secretariat",
      "Treasury",
      "Amplifies",
      "Careers",
      "Cares",
      "Unites",
    ]);
  });
});
