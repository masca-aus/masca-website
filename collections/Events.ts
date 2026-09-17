import { revalidatePath } from "next/cache.js";

import type { Access, CollectionAfterChangeHook, CollectionConfig, FieldAccess, Where } from "payload";

import { EVENT_STATES } from "../features/events/eventSubmission.ts";
import { EVENT_EDITOR_STEPS } from "../features/events/eventEditor.ts";
import { eventQuickAction, validateQuickPublish } from "../features/events/eventQuickActions.ts";
import { editorSection } from "../utils/editorSection.ts";

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

const revalidatePublishedEvent: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  // Draft writes only create versions; the current published document stays live.
  const draftWrite = req?.query?.draft === 'true' || req?.query?.draft === true;
  const unpublish = req?.query?.unpublishAllLocales === 'true' || req?.query?.unpublishAllLocales === true;
  if (!draftWrite && (unpublish || doc?._status === 'published' || previousDoc?._status === 'published')) {
    revalidateEventPages();
  }
  return doc;
};

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    description:
      "Add events for MASCA students and review submissions before they appear on the website. An event appears publicly only after it is approved and published.",
    hideAPIURL: true,
    components: {
      beforeList: ["/components/admin/DocumentBackLink#CollectionBackLink"],
      edit: {
        beforeDocumentControls: ["/components/admin/DocumentBackLink#DocumentBackLink"],
        SaveDraftButton: "/components/admin/EventSaveController#EventSaveController",
        PublishButton: "/components/admin/EventEditorView#EventPublishControl",
        UnpublishButton: "/components/admin/EventEditorView#EventUnpublishControl",
      },
      views: {
        edit: {
          default: { Component: "/components/admin/EventEditorView#EventEditorView" },
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
  endpoints: [{ path: '/:id/quick-status', method: 'post', handler: eventQuickAction }],
  fields: [
    {
      name: '_status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }],
      admin: { components: { Field: false, Cell: '/components/admin/EventStatusCell#EventPublicationStatusCell' }, disableBulkEdit: true },
    },
    {
      name: 'eventEditorHeader', type: 'ui',
      admin: { components: { Field: '/components/admin/EventEditorFields#EventEditorHeader' }, disableListColumn: true, disableBulkEdit: true },
    },
    editorSection({
      title: "Public details",
      description: "Information that visitors can see once this event is approved and published.",
    }),
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
      admin: { components: { Field: "/components/admin/EventDateRangeField#EventDateRangeField" }, date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "endDate",
      type: "date",
      admin: { components: { Field: false }, date: { pickerAppearance: "dayAndTime" } },
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
    editorSection({
      title: "Images and links",
      description: "Add the event poster and the website where students can find tickets or more details.",
    }),
    {
      name: "ticketURL",
      label: "Registration link",
      type: "text",
      admin: { description: "Optional. Use a full https:// link for tickets or event details." },
    },
    {
      name: "poster",
      type: "upload",
      displayPreview: true,
      admin: { description: "Choose an existing poster or upload an image up to 5 MB. This is the image students will see." },
      relationTo: "media",
    },
    editorSection({
      title: "Internal details",
      description: "These details help the MASCA team follow up and are never shown on the public website.",
    }),
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
      admin: { hidden: true },
      access: {
        read: isAuthenticatedEventFieldRead,
      },
    },
    editorSection({
      title: "Review and publish",
      description: "Final workflow decision. Approve or reject after review; approved events still need to be published before they appear on the website.",
      tone: "decision",
    }),
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
        isClearable: false,
        description: "Publishing automatically approves this event. Choose Rejected to keep a submission off the website.",
        components: {
          Cell: "/components/admin/EventStatusCell#EventReviewStatusCell",
        },
      },
    },
    {
      name: 'eventEditorFooter', type: 'ui',
      admin: { components: { Field: '/components/admin/EventEditorFields#EventEditorFooter' }, disableListColumn: true, disableBulkEdit: true },
    },
  ].map((field) => {
    const step = EVENT_EDITOR_STEPS.findIndex(({ fields }) => fields.includes(field.name));
    return {
      ...field,
      admin: {
        ...field.admin,
        ...(step >= 0 ? { className: `${field.admin && 'className' in field.admin ? field.admin.className : ''} masca-event-step masca-event-step-${step}` } : {}),
        ...(field.type === 'ui' && field.name.endsWith('Section') ? { className: 'masca-event-section' } : {}),
      },
    };
  }) as CollectionConfig['fields'],
  hooks: {
    beforeChange: [validateQuickPublish],
    afterChange: [revalidatePublishedEvent],
    afterDelete: [revalidateEventPages],
  },
};
