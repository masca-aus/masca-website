import { revalidatePath } from "next/cache.js";

import type { Access, CollectionConfig, FieldAccess, Where } from "payload";

import { EVENT_STATES } from "../features/events/eventSubmission.ts";

export const isPublicEventRead = ({
  req,
}: Parameters<Access>[0]): true | Where =>
  req.user
    ? true
    : {
        and: [
          { reviewStatus: { equals: "approved" } },
          { _status: { equals: "published" } },
        ],
      };

export const isAuthenticatedEventAccess: Access = ({ req }) => Boolean(req.user);

export const isAuthenticatedEventFieldRead: FieldAccess = ({ req }) =>
  Boolean(req.user);

const safeRevalidatePath = (path: string) => {
  try {
    revalidatePath(path);
  } catch {
    // Local API writes outside Next have no cache to invalidate.
  }
};

const revalidateEventPages = () => {
  safeRevalidatePath("/events");
  safeRevalidatePath("/");
};

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    hideAPIURL: true,
    components: {
      views: {
        edit: {
          versions: {
            tab: { label: "Change history" },
          },
        },
      },
    },
    defaultColumns: [
      "title",
      "organisation",
      "startDate",
      "reviewStatus",
      "_status",
    ],
  },
  access: {
    read: isPublicEventRead,
    create: isAuthenticatedEventAccess,
    update: isAuthenticatedEventAccess,
    delete: isAuthenticatedEventAccess,
  },
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
  lockDocuments: false,
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "organisation",
      type: "text",
      required: true,
    },
    {
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: "startDate",
      type: "date",
      required: true,
    },
    {
      name: "endDate",
      type: "date",
    },
    {
      name: "venue",
      type: "text",
      required: true,
    },
    {
      name: "state",
      type: "select",
      required: true,
      options: EVENT_STATES.map(({ label, value }) => ({ label, value })),
    },
    {
      name: "ticketURL",
      type: "text",
    },
    {
      name: "poster",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "contactName",
      type: "text",
      required: true,
      access: {
        read: isAuthenticatedEventFieldRead,
      },
    },
    {
      name: "contactEmail",
      type: "email",
      required: true,
      access: {
        read: isAuthenticatedEventFieldRead,
      },
    },
    {
      name: "internalNotes",
      type: "textarea",
      access: {
        read: isAuthenticatedEventFieldRead,
      },
    },
    {
      name: "reviewedAt",
      type: "date",
      access: {
        read: isAuthenticatedEventFieldRead,
      },
    },
    {
      name: "reviewStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      admin: {
        className: "masca-event-review-decision",
        description: "Final workflow decision. Choose Approved or Rejected after reviewing the event.",
        components: {
          Cell: "/components/admin/EventStatusCell#EventReviewStatusCell",
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateEventPages],
    afterDelete: [revalidateEventPages],
  },
};
