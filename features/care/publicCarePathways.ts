import config from "@payload-config";
import { getPayload } from "payload";
import type { CarePathway } from "@/payload-types";
import { defaultCarePathways } from "./carePathwayDefaults";

export type PublicCarePathway = Pick<
  CarePathway,
  "category" | "title" | "shortDescription" | "sortOrder" | "subsections"
>;

export async function getPublicCarePathways(): Promise<PublicCarePathway[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "care-pathways",
      sort: "sortOrder",
      limit: 4,
      depth: 0,
    });
    if (result.docs.length) return result.docs;
  } catch (error) {
    console.error("Could not load Cares pathways from the CMS.", error);
  }

  return defaultCarePathways;
}
