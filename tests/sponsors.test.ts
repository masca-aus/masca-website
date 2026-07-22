import { describe, expect, it, vi } from "vitest";

// The collection's afterChange/afterDelete hooks call revalidatePath; outside
// a real Next request there is no cache to invalidate, so stub it and assert
// on the calls instead.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import configPromise from "@payload-config";
import { toSponsor } from "@/utils/sponsors";
import type { Sponsor as SponsorDoc } from "@/payload-types";

const getSponsorsCollection = async () => {
  const config = await configPromise;
  const sponsors = config.collections.find((c) => c.slug === "sponsors");
  if (!sponsors) throw new Error("sponsors collection not found");
  return sponsors;
};

const getField = async (name: string) => {
  const sponsors = await getSponsorsCollection();
  const field = sponsors.fields.find((f) => "name" in f && f.name === name);
  if (!field) throw new Error(`field ${name} not found`);
  return field;
};

describe("sponsors collection (Payload-served marquee)", () => {
  it("mirrors the sponsor shape: required name and date", async () => {
    const name = await getField("name");
    expect(name.type).toBe("text");
    expect("required" in name && name.required, "name required").toBe(true);

    const date = await getField("date");
    expect(date.type).toBe("date");
    expect("required" in date && date.required, "date required").toBe(true);
  });

  it("relates the logo to the Media collection and requires it", async () => {
    const logo = await getField("logo");
    expect(logo.type).toBe("upload");
    expect("relationTo" in logo && logo.relationTo).toBe("media");
    expect("required" in logo && logo.required).toBe(true);
  });

  it("is publicly readable and sorted newest first, like the old Notion source", async () => {
    const sponsors = await getSponsorsCollection();
    const canRead = sponsors.access.read({ req: { user: null } } as never);
    expect(canRead).toBe(true);
    expect(sponsors.defaultSort).toBe("-date");
  });

  it("revalidates the marquee-bearing homepage on change and delete", async () => {
    const sponsors = await getSponsorsCollection();
    const afterChange = sponsors.hooks?.afterChange ?? [];
    const afterDelete = sponsors.hooks?.afterDelete ?? [];
    expect(afterChange.length).toBeGreaterThan(0);
    expect(afterDelete.length).toBeGreaterThan(0);

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterChange) await hook({} as never);
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain("/");

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterDelete) await hook({} as never);
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toContain("/");
  });
});

describe("toSponsor (Payload doc → marquee shape)", () => {
  const doc: SponsorDoc = {
    id: 3,
    name: "Teh Tarik Co",
    logo: {
      id: 1,
      alt: "Teh Tarik Co",
      url: "https://test-project.storage.supabase.co/storage/v1/object/public/media/teh-tarik.png",
      updatedAt: "2026-07-22T00:00:00.000Z",
      createdAt: "2026-07-22T00:00:00.000Z",
    },
    date: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    createdAt: "2026-07-22T00:00:00.000Z",
  };

  it("maps a populated doc, pulling img from the logo's Supabase URL", () => {
    expect(toSponsor(doc)).toEqual({
      id: "3",
      name: "Teh Tarik Co",
      date: "2026-07-01T00:00:00.000Z",
      img: "https://test-project.storage.supabase.co/storage/v1/object/public/media/teh-tarik.png",
    });
  });

  it("degrades to an empty img rather than crashing when the logo is unpopulated", () => {
    const sponsor = toSponsor({ ...doc, logo: 1 });
    expect(sponsor.img).toBe("");
  });
});
