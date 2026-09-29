import { describe, expect, it, vi } from "vitest";

import { createEventSubmission } from "@/features/events/createEventSubmission";
import type { EventSubmissionInput } from "@/features/events/eventSubmission";

vi.mock("server-only", () => ({}));

const data: EventSubmissionInput = {
  title: "Malaysian Students Welcome Night",
  organisation: "MASCA Victoria",
  description: "An evening for Malaysian students to meet new friends and mentors.",
  startDate: "2026-10-01T08:00:00.000Z",
  venue: "Student Pavilion, Carlton",
  state: "VIC",
  contactName: "Aisha Rahman",
  contactEmail: "aisha@example.org",
};

describe("createEventSubmission", () => {
  it("uploads the poster first with event-derived alt text and links it to the pending draft", async () => {
    const payload = {
      create: vi.fn().mockResolvedValueOnce({ id: 17 }).mockResolvedValueOnce({ id: 42 }),
    };
    const poster = new File(["poster bytes"], "welcome.webp", { type: "image/webp" });

    const result = await createEventSubmission({ payload, data, poster });

    expect(payload.create).toHaveBeenNthCalledWith(1, {
      collection: "media",
      overrideAccess: true,
      data: { alt: "Malaysian Students Welcome Night" },
      file: {
        data: Buffer.from("poster bytes"),
        mimetype: "image/webp",
        name: "welcome.webp",
        size: 12,
      },
    });
    expect(payload.create).toHaveBeenLastCalledWith({
      collection: "events",
      overrideAccess: true,
      draft: true,
      data: { ...data, poster: 17, reviewStatus: "pending", _status: "draft" },
    });
    expect(result).toEqual({ id: 42 });
  });

  it("overrides forged status input and ignores extra fields and poster references", async () => {
    const payload = { create: vi.fn().mockResolvedValue({ id: "event-id" }) };
    const forgedData = {
      ...data,
      reviewStatus: "approved",
      _status: "published",
      poster: 99,
      internalNotes: "forged reviewer notes",
      overrideAccess: false,
    };

    expect(await createEventSubmission({ payload, data: forgedData })).toEqual({ id: "event-id" });
    expect(payload.create).toHaveBeenCalledExactlyOnceWith({
      collection: "events",
      overrideAccess: true,
      draft: true,
      data: { ...data, reviewStatus: "pending", _status: "draft" },
    });
  });

  it("preserves validated optional event fields without creating media", async () => {
    const payload = { create: vi.fn().mockResolvedValue({ id: 42 }) };

    await createEventSubmission({
      payload,
      data: { ...data, endDate: "2026-10-01T11:00:00.000Z", ticketURL: "https://example.org/tickets" },
    });

    expect(payload.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      collection: "events",
      data: expect.objectContaining({ endDate: "2026-10-01T11:00:00.000Z", ticketURL: "https://example.org/tickets" }),
    }));
  });

  it("does not create an event when the media upload fails", async () => {
    const payload = { create: vi.fn().mockRejectedValue(new Error("Upload failed")) };

    await expect(createEventSubmission({
      payload,
      data,
      poster: new File(["image"], "poster.png", { type: "image/png" }),
    })).rejects.toThrow("Upload failed");

    expect(payload.create).toHaveBeenCalledTimes(1);
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({ collection: "media" }));
  });
});
