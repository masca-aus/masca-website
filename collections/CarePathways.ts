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
    defaultColumns: ["title", "parent", "sortOrder"],
    description:
      "Create top-level categories with no parent, then create as many nested sections as you need by choosing a parent. Every section can link to its own detail page.",
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
  defaultSort: "sortOrder",
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      maxLength: 90,
      admin: { description: "The category or section title." },
    },
    {
      name: "shortDescription",
      type: "textarea",
      required: true,
      maxLength: 320,
      admin: { description: "A short description shown on the Cares page." },
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "care-pathways",
      admin: {
        position: "sidebar",
        description:
          "Leave this blank for a top-level category. Choose a category or section to nest this item beneath it.",
      },
    },
    {
      name: "detail",
      label: "Details",
      type: "textarea",
      maxLength: 5000,
      admin: {
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
        description:
          "Link to an existing page such as /care/healthcare or a secure external https:// page. Leave blank to use this section's generated detail page.",
      },
    },
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 1,
      admin: {
        position: "sidebar",
        description: "Lower numbers appear first among the same parent.",
      },
    },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const rawParent = Object.prototype.hasOwnProperty.call(data, "parent")
        ? data.parent
        : originalDoc?.parent;
      let current =
        typeof rawParent === "number"
          ? rawParent
          : rawParent && typeof rawParent === "object" && "id" in rawParent && typeof rawParent.id === "number"
            ? rawParent.id
            : null;
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
