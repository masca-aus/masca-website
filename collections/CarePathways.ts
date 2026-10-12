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

export const CARE_PATHWAYS = [
  { value: "wellbeing", label: "Wellbeing" },
  { value: "finance", label: "Finance" },
  { value: "settling", label: "Settling in" },
  { value: "academic", label: "Academic" },
] as const;

export const CarePathways: CollectionConfig = {
  slug: "care-pathways",
  labels: { singular: "Care pathway", plural: "Cares" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["category", "title", "sortOrder"],
    description:
      "Manage the four starting points on the Cares page. Update each title and short description, then add, reorder or remove the resources shown inside it.",
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
      name: "category",
      type: "select",
      required: true,
      unique: true,
      options: CARE_PATHWAYS.map(({ value, label }) => ({ value, label })),
      admin: {
        description:
          "Choose one of the four pathways. Only one pathway of each kind can be created.",
      },
    },
    { name: "title", type: "text", required: true, maxLength: 80 },
    {
      name: "shortDescription",
      type: "textarea",
      required: true,
      maxLength: 260,
      admin: { description: "A short introduction shown on the pathway card." },
    },
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 1,
      admin: { description: "Lower numbers appear first." },
    },
    {
      name: "subsections",
      label: "Resources and next steps",
      type: "array",
      minRows: 1,
      labels: { singular: "Resource", plural: "Resources" },
      fields: [
        { name: "title", type: "text", required: true, maxLength: 90 },
        {
          name: "detail",
          type: "textarea",
          required: true,
          maxLength: 320,
        },
        {
          name: "linkUrl",
          label: "Link (optional)",
          type: "text",
          validate: (value: unknown) => {
            if (typeof value !== "string" || !value.trim()) return true;
            return /^\/(?!\/)/.test(value.trim()) || /^https:\/\//i.test(value.trim())
              ? true
              : "Use a page path or a secure https:// link.";
          },
          admin: {
            description:
              "Use a page path such as /care/healthcare or a full https:// link. Leave blank to link to MASCA support.",
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [({ doc }) => {
      try {
        revalidatePath("/care");
      } catch {
        // Payload scripts and migrations run outside a Next.js request.
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
