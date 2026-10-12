import config from "@payload-config";
import { getPayload } from "payload";
import type { CarePathway } from "@/payload-types";
import { defaultCarePathways } from "./carePathwayDefaults";

export type PublicCarePathway = Pick<
  CarePathway,
  "id" | "title" | "shortDescription" | "detail" | "linkUrl"
> & { children: PublicCarePathway[] };

type CarePathwayRecord = Omit<PublicCarePathway, "children"> & {
  parent?: number | { id?: number } | null;
};

function relationId(parent: CarePathwayRecord["parent"]): number | null {
  if (typeof parent === "number") return parent;
  return parent && typeof parent === "object" && typeof parent.id === "number"
    ? parent.id
    : null;
}

function buildTree(records: CarePathwayRecord[]): PublicCarePathway[] {
  const nodes = new Map<number, PublicCarePathway>();
  for (const record of records) nodes.set(record.id, { ...record, children: [] });

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
    detail: node.detail ?? null,
    linkUrl: node.linkUrl ?? null,
    children: (node.children ?? []).map(mapNode),
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
      depth: 0,
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
