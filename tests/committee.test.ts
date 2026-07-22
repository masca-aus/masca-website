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
  it("mirrors the member shape: required name/role/year/order/bio, optional linkedin_url", async () => {
    for (const name of ["name", "role", "year", "bio"]) {
      const field = await getField(name);
      expect("required" in field && field.required, `${name} required`).toBe(true);
    }
    const order = await getField("order");
    expect(order.type).toBe("number");
    expect("required" in order && order.required).toBe(true);

    const linkedin = await getField("linkedin_url");
    expect("required" in linkedin && linkedin.required).toBeFalsy();
  });

  it("relates the portrait to the Media collection and requires it", async () => {
    const portrait = await getField("portrait");
    expect(portrait.type).toBe("upload");
    expect("relationTo" in portrait && portrait.relationTo).toBe("media");
    expect("required" in portrait && portrait.required).toBe(true);
  });

  it("validates the year format so the schema cannot drift like Notion could", async () => {
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

  it("is publicly readable and sorted by order in the admin list", async () => {
    const committee = await getCommitteeCollection();
    const canRead = committee.access.read({ req: { user: null } } as never);
    expect(canRead).toBe(true);
    expect(committee.defaultSort).toBe("order");
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
    name: "Ava Tan",
    role: "President",
    portrait: {
      id: 1,
      alt: "Ava Tan",
      url: "https://test-project.storage.supabase.co/storage/v1/object/public/media/ava.jpg",
      updatedAt: "2026-07-22T00:00:00.000Z",
      createdAt: "2026-07-22T00:00:00.000Z",
    },
    year: "2026/2027",
    order: 1,
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
      img: "https://test-project.storage.supabase.co/storage/v1/object/public/media/ava.jpg",
      year: "2026/2027",
      order: 1,
      linkedin_url: "https://www.linkedin.com/in/example-ava",
      bio: "Leads MASCA's national strategy.",
    });
  });

  it("coalesces a missing linkedin_url to undefined so the UI hides the link", () => {
    const member = toCommitteeMember({ ...doc, linkedin_url: null });
    expect(member.linkedin_url).toBeUndefined();
  });

  it("degrades to an empty img rather than crashing when the portrait is unpopulated", () => {
    const member = toCommitteeMember({ ...doc, portrait: 1 });
    expect(member.img).toBe("");
  });
});
