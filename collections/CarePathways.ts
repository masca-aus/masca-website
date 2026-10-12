import { revalidatePath } from "next/cache.js";
import type { Access, CollectionConfig } from "payload";
import {
  mayManageSharedContent,
  type ApprovedAccount,
} from "../features/access/workspacePolicy.ts";

const authenticated: Access = ({ req }) =>
  process.env.WORKSPACE_AUTH_ENABLED === "true"
    ? mayManageSharedContent(req.user as ApprovedAccount | null)
    : Boolean(req.user);

export const CarePathways: CollectionConfig = {
  slug: "care-pathways",
  labels: { singular: "Care section", plural: "Cares" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "entryType", "parent"],
    description:
      "Choose whether you are adding a parent category or a child section. Child sections can be added under an existing parent category.",
    hideAPIURL: true,
    components: {
      beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
      edit: {
        beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
      },
    },
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: "id",
  fields: [
    {
      name: "entryType",
      label: "What would you like to add?",
      type: "select",
      required: true,
      options: [
        { label: "Parent category", value: "parent" },
        { label: "Child section", value: "child" },
      ],
      admin: {
        position: "main",
        description: "Choose a parent category or a child section beneath an existing category.",
      },
    },
    {
      name: "title",
      type: "text",
      required: true,
      maxLength: 90,
      admin: {
        condition: (_, siblingData) => siblingData.entryType === "parent" || siblingData.entryType === "child",
        description: "The title of this category or section.",
      },
    },
    {
      name: "shortDescription",
      type: "textarea",
      required: true,
      maxLength: 320,
      admin: {
        condition: (_, siblingData) => siblingData.entryType === "parent" || siblingData.entryType === "child",
        description: "A short description shown on the Cares page.",
      },
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "care-pathways",
      required: true,
      filterOptions: { entryType: { equals: "parent" } },
      admin: {
        condition: (_, siblingData) => siblingData.entryType === "child",
        description: "Choose an existing parent category for this child section.",
      },
    },
    {
      name: "detail",
      label: "Details",
      type: "textarea",
      maxLength: 5000,
      admin: {
        condition: (_, siblingData) => siblingData.entryType === "child",
        description:
          "Optional longer information shown on this section's own page.",
      },
    },
    {
      name: "linkUrl",
      label: "Existing page link (optional)",
      type: "text",
      validate: (value: unknown) => {
        if (typeof value !== "string" || !value.trim()) return true;
        return /^\/(?!\/)/.test(value.trim()) || /^https:\/\//i.test(value.trim())
          ? true
          : "Use a page path or a secure https:// link.";
      },
      admin: {
        condition: (_, siblingData) => siblingData.entryType === "child",
        description:
          "Link to an existing page such as /care/healthcare or a secure external https:// page. Leave blank to use this section's generated detail page.",
      },
    },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const rawType = Object.prototype.hasOwnProperty.call(data, "entryType")
        ? data.entryType
        : originalDoc?.entryType;
      if (rawType !== "parent" && rawType !== "child") {
        throw new Error("Choose whether this item is a parent category or a child section.");
      }
      const rawParent = Object.prototype.hasOwnProperty.call(data, "parent")
        ? data.parent
        : originalDoc?.parent;
      if (rawType === "parent") {
        data.parent = null;
        return data;
      }
      if (rawParent === null || rawParent === undefined || rawParent === "") {
        throw new Error("Choose an existing parent category for this child section.");
      }
      const parentId =
        typeof rawParent === "number"
          ? rawParent
          : rawParent && typeof rawParent === "object" && "id" in rawParent && typeof rawParent.id === "number"
            ? rawParent.id
            : null;
      if (!parentId) throw new Error("Choose an existing parent category for this child section.");
      const selectedParent = await req.payload.findByID({
        collection: "care-pathways",
        id: parentId,
        depth: 0,
        overrideAccess: true,
      });
      if (selectedParent.entryType !== "parent") {
        throw new Error("Child sections can only be added beneath a parent category.");
      }
      const recordId = typeof originalDoc?.id === "number" ? originalDoc.id : undefined;
      if (recordId && originalDoc?.entryType === "parent") {
        const existingChildren = await req.payload.find({
          collection: "care-pathways",
          where: { parent: { equals: recordId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (existingChildren.docs.length) {
          throw new Error("A parent category with child sections cannot be changed to a child section.");
        }
      }
      let current: number | null = parentId;
      const visited = new Set<number>(typeof originalDoc?.id === "number" ? [originalDoc.id] : []);
      for (let depth = 0; current && depth < 100; depth += 1) {
        if (visited.has(current)) {
          throw new Error("Choose a parent that is not this section or one of its descendants.");
        }
        visited.add(current);
        const ancestor = await req.payload.findByID({
          collection: "care-pathways",
          id: current,
          depth: 0,
          overrideAccess: true,
        });
        const parent = ancestor.parent;
        current =
          typeof parent === "number"
            ? parent
            : parent && typeof parent === "object" && "id" in parent && typeof parent.id === "number"
              ? parent.id
              : null;
      }
      if (current) throw new Error("Cares sections cannot be nested more than 100 levels deep.");
      return data;
    }],
    afterChange: [({ doc }) => {
      for (const path of ["/care", `/care/pathways/${doc.id}`]) {
        try {
          revalidatePath(path);
        } catch {
          // Payload scripts and migrations run outside a Next.js request.
        }
      }
      return doc;
    }],
    afterDelete: [({ doc }) => {
      try {
        revalidatePath("/care");
      } catch {
        // Payload scripts and migrations run outside a Next.js request.
      }
      return doc;
    }],
  },
};
