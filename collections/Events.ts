import { adminSearchFields, adminSearchHooks, withAdminSearch } from '../features/admin/adminSearch.ts';
import { cmsStatusField } from '../features/admin/cmsStatusField.ts';
import { revalidatePath } from "next/cache.js";

import type { Access, CollectionAfterChangeHook, CollectionConfig, FieldAccess, FieldHook, Where } from "payload";

import { eventListFilter, eventLifecycleAction, lifecycleIDs } from "../features/events/eventLifecycle.ts";
import { eventReport } from "../features/events/eventReports.ts";
import { EVENT_STATES } from "../features/events/eventSubmission.ts";
import { EVENT_EDITOR_STEPS } from "../features/events/eventEditor.ts";
import { eventQuickAction, validateQuickPublish } from "../features/events/eventQuickActions.ts";
import { eventDeleteAccess, deleteEventLifecycle } from '../features/events/eventDeletion.ts';
import { editorSection } from "../utils/editorSection.ts";

export const isPublicEventRead = async ({
  req,
}: Parameters<Access>[0]): Promise<true | Where> =>
  req.user
    ? true
    : {
        and: [
          { id: { not_in: (await lifecycleIDs(req.payload, "archived", req)).concat(-1) } },
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
    listSearchableFields: adminSearchFields.events, baseFilter: withAdminSearch('events', eventListFilter),
    description:
      "Manage events for MASCA students. Save a private draft or publish when ready.",
    hideAPIURL: true,
    components: {
      afterListTable: ["/components/admin/LifecycleEmptyState#LifecycleEmptyState"],
      beforeList: ["/components/admin/EventListTools#EventListTools"],
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
      "cmsStatus",
    ],
  },
  access: {
    read: isPublicEventRead,
    create: isAuthenticatedEventAccess,
    update: isAuthenticatedEventAccess,
    delete: eventDeleteAccess,
  },
  versions: {
    drafts: true,
    maxPerDoc: 0,
  },
  lockDocuments: false,
  endpoints: [{ path: '/report', method: 'get', handler: eventReport }, { path: '/:id/lifecycle', method: 'post', handler: eventLifecycleAction }, { path: '/:id/quick-status', method: 'post', handler: eventQuickAction }],
  fields: [
    cmsStatusField('events'),
    { name: 'lifecycle', type: 'text', virtual: true, label: 'Event stage',
      admin: { disableListColumn: true, components: { Field: false, Cell: '/components/admin/EventLifecycleCell#EventLifecycleCell' }, disableBulkEdit: true },
      hooks: { afterRead: [async ({ data, req }: Parameters<FieldHook>[0]) => {
        if (!req.user || !data?.id) return undefined;
        const rows = await req.payload.find({ collection: 'event-lifecycle', where: { event: { equals: data.id } }, limit: 1, depth: 0, req, overrideAccess: true });
        return rows.docs[0]?.status ?? 'active';
      }] },
    },
    {
      name: '_status', label: 'Publication', type: 'select', options: [], // Payload supplies the built-in publication options during sanitization.
      admin: { disableListColumn: true, components: { Field: false, Cell: '/components/admin/EventStatusCell#EventPublicationStatusCell' }, disableBulkEdit: true },
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
      admin: { components: { Field: "/components/admin/OrganisationSearchField#OrganisationSearchField" } },
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
      label: "Venue name",
      type: "text",
      required: true,
      admin: { description: "The name of the place, such as Great Court, University of Queensland. For an online event, enter Online." },
    },
    {
      name: "streetAddress",
      label: "Street address",
      type: "text",
      admin: { description: "Street number and name, suburb and postcode. Leave blank for online events." },
    },
    {
      name: "venueDetails",
      label: "Venue details",
      type: "textarea",
      admin: { description: "Optional details for attendees: room, floor, entrance, meeting point or accessibility instructions." },
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
      label: "Review",
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
        disableListColumn: true,
        isClearable: false,
        description: "Publishing automatically approves this event. Choose Rejected to keep a submission off the website.",
        components: {
          Cell: "/components/admin/EventStatusCell#EventReviewStatusCell",
          Field: "/components/admin/EventReviewField#EventReviewField",
        },
      },
    },
    {
      name: 'eventEditorFooter', type: 'ui',
      admin: { components: { Field: '/components/admin/EventEditorFields#EventEditorFooter' }, disableListColumn: true, disableBulkEdit: true },
    },
  ].map((field) => {
    const step = EVENT_EDITOR_STEPS.findIndex(({ fields }) => fields.includes('name' in field ? field.name : ''));
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
    ...adminSearchHooks,
    beforeDelete: [deleteEventLifecycle],
    beforeChange: [validateQuickPublish],
    afterChange: [revalidatePublishedEvent],
    afterDelete: [revalidateEventPages],
  },
};
