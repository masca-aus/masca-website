import config from "@payload-config";
import { getPayload } from "payload";
import type { CarePathway } from "@/payload-types";
import { defaultCarePathways } from "./carePathwayDefaults";

export type PublicCareSubsection = {
  id: string;
  title: string;
  shortDescription: string;
  detail: string;
  image: { url: string; alt: string } | null;
  links: { id: string; label: string; url: string }[];
};

export type PublicCarePathway = {
  id: number;
  title: string;
  shortDescription: string;
  children: PublicCarePathway[];
  subsections: PublicCareSubsection[];
};

type CarePathwayRecord = Omit<CarePathway, "parent" | "subsections"> & {
  parent?: number | { id?: number } | null;
  subsections?: CarePathway["subsections"];
};

function relationId(parent: CarePathwayRecord["parent"]): number | null {
  if (typeof parent === "number") return parent;
  return parent && typeof parent === "object" && typeof parent.id === "number"
    ? parent.id
    : null;
}

function buildTree(records: CarePathwayRecord[]): PublicCarePathway[] {
  const nodes = new Map<number, PublicCarePathway>();
  for (const record of records) {
    nodes.set(record.id, {
      id: record.id,
      title: record.title ?? "",
      shortDescription: record.shortDescription ?? "",
      children: [],
      subsections: (Array.isArray(record.subsections) ? record.subsections : []).map((section, index) => {
        const media = section.image;
        const links = Array.isArray(section.links) ? section.links : [];
        return {
          id: section.id || `${record.id}-${index}`,
          title: section.title,
          shortDescription: section.shortDescription ?? "",
          detail: section.detail ?? "",
          image: media && typeof media === "object" && media.url ? { url: media.url, alt: media.alt } : null,
          links: links.map((link, linkIndex) => ({
            id: link.id || `${record.id}-${index}-${linkIndex}`,
            label: link.label,
            url: link.url,
          })),
        };
      }),
    });
  }

  const roots: PublicCarePathway[] = [];
  for (const record of records) {
    const node = nodes.get(record.id);
    if (!node) continue;
    const parent = nodes.get(relationId(record.parent) ?? -1);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (items: PublicCarePathway[]) => {
    items.sort((left, right) => left.id - right.id);
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

function fallbackTree(): PublicCarePathway[] {
  let id = 1;
  const mapNode = (node: (typeof defaultCarePathways)[number]): PublicCarePathway => ({
    id: id++,
    title: node.title,
    shortDescription: node.shortDescription,
    children: (node.children ?? []).map(mapNode),
    subsections: [],
  });
  return defaultCarePathways.map(mapNode);
}

export async function getPublicCarePathways(): Promise<PublicCarePathway[]> {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "care-pathways",
      sort: "id",
      limit: 1000,
      depth: 1,
    });
    if (result.docs.length) return buildTree(result.docs as CarePathwayRecord[]);
  } catch (error) {
    console.error("Could not load Cares pathways from the CMS.", error);
  }

  return fallbackTree();
}

export async function getPublicCarePathway(id: number): Promise<PublicCarePathway | null> {
  const roots = await getPublicCarePathways();
  const visit = (nodes: PublicCarePathway[]): PublicCarePathway | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const child = visit(node.children);
      if (child) return child;
    }
    return null;
  };
  return visit(roots);
}
