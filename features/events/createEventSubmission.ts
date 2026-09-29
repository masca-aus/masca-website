import "server-only";

import type { File as PayloadFile } from "payload";

import type { EventSubmissionInput } from "./eventSubmission";

export interface EventSubmissionPayload {
  create(options:
    | {
        collection: "media";
        overrideAccess: true;
        data: { alt: string };
        file: PayloadFile;
      }
    | {
        collection: "events";
        overrideAccess: true;
        draft: true;
        data: EventSubmissionInput & {
          poster?: number | string;
          reviewStatus: "pending";
          _status: "draft";
        };
      }
  ): Promise<{ id: number | string }>;
}

/** Accept only the normalized output of parseEventSubmission. */
export async function createEventSubmission({
  payload,
  data,
  poster,
}: {
  payload: EventSubmissionPayload;
  data: EventSubmissionInput;
  poster?: File;
}): Promise<{ id: number | string }> {
  let posterID: number | string | undefined;
  if (poster) {
    const media = await payload.create({
      collection: "media",
      overrideAccess: true,
      data: { alt: data.title },
      file: {
        data: Buffer.from(await poster.arrayBuffer()),
        mimetype: poster.type,
        name: poster.name,
        size: poster.size,
      },
    });
    posterID = media.id;
  }

  const event = await payload.create({
    collection: "events",
    overrideAccess: true,
    draft: true,
    data: {
      title: data.title,
      organisation: data.organisation,
      description: data.description,
      startDate: data.startDate,
      ...(data.endDate ? { endDate: data.endDate } : {}),
      venue: data.venue,
      state: data.state,
      ...(data.ticketURL ? { ticketURL: data.ticketURL } : {}),
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      ...(posterID !== undefined ? { poster: posterID } : {}),
      reviewStatus: "pending",
      _status: "draft",
    },
  });

  return { id: event.id };
}
