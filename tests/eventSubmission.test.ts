import { describe, expect, it } from "vitest";

import {
  EVENT_STATES,
  isAllowedPoster,
  parseEventSubmission,
} from "@/features/events/eventSubmission";

const validFormData = (overrides: Record<string, FormDataEntryValue> = {}) => {
  const values: Record<string, FormDataEntryValue> = {
    title: "Malaysian Students Welcome Night",
    organisation: "MASCA Victoria",
    description: "An evening for Malaysian students to meet new friends and mentors.",
    startDate: "2026-10-01T18:00",
    endDate: "2026-10-01T21:00",
    venue: "Student Pavilion, Carlton",
    state: "VIC",
    ticketURL: "https://example.org/tickets",
    contactName: "Aisha Rahman",
    contactEmail: "aisha@example.org",
    accuracyConfirmed: "on",
    ...overrides,
  };

  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
};

describe("event submission validation", () => {
  it("parses a valid event into normalized input and preserves an allowed poster", () => {
    const poster = new File(["image"], "poster.webp", { type: "image/webp" });
    const result = parseEventSubmission(validFormData({ poster }));

    expect(result).toEqual({
      ok: true,
      data: {
        title: "Malaysian Students Welcome Night",
        organisation: "MASCA Victoria",
        description: "An evening for Malaysian students to meet new friends and mentors.",
        startDate: new Date(2026, 9, 1, 18).toISOString(),
        endDate: new Date(2026, 9, 1, 21).toISOString(),
        venue: "Student Pavilion, Carlton",
        state: "VIC",
        ticketURL: "https://example.org/tickets",
        contactName: "Aisha Rahman",
        contactEmail: "aisha@example.org",
      },
      poster,
    });
  });

  it("omits empty optional fields", () => {
    const result = parseEventSubmission(validFormData({ endDate: "", ticketURL: "" }));

    expect(result).toEqual({
      ok: true,
      data: {
        title: "Malaysian Students Welcome Night",
        organisation: "MASCA Victoria",
        description: "An evening for Malaysian students to meet new friends and mentors.",
        startDate: new Date(2026, 9, 1, 18).toISOString(),
        venue: "Student Pavilion, Carlton",
        state: "VIC",
        contactName: "Aisha Rahman",
        contactEmail: "aisha@example.org",
      },
    });
  });

  it("rejects a missing accuracy confirmation", () => {
    const result = parseEventSubmission(validFormData({ accuracyConfirmed: "" }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        accuracyConfirmed: ["Please confirm the event details are accurate."],
      },
    });
  });

  it("rejects a non-HTTPS ticket URL", () => {
    const result = parseEventSubmission(validFormData({ ticketURL: "http://example.org" }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: { ticketURL: ["Use a secure https:// link."] },
    });
  });

  it("rejects an end date before the start date", () => {
    const result = parseEventSubmission(
      validFormData({ startDate: "2026-10-01T18:00", endDate: "2026-10-01T17:59" }),
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: { endDate: ["End date must be after the start date."] },
    });
  });

  it("rejects an invalid state", () => {
    const result = parseEventSubmission(validFormData({ state: "NZ" }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: { state: ["Select an Australian state or territory."] },
    });
  });

  it("rejects a poster over 5 MB", () => {
    const poster = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "poster.png", {
      type: "image/png",
    });
    const result = parseEventSubmission(validFormData({ poster }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: { poster: ["Poster must be 5 MB or smaller."] },
    });
  });

  it("rejects a non-image poster", () => {
    const poster = new File(["not an image"], "poster.pdf", { type: "application/pdf" });
    const result = parseEventSubmission(validFormData({ poster }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: { poster: ["Upload a JPEG, PNG or WebP image."] },
    });
  });

  it("allows only JPEG, PNG and WebP posters at or below the shared size limit", () => {
    expect(isAllowedPoster(new File(["image"], "poster.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isAllowedPoster(new File(["image"], "poster.png", { type: "image/png" }))).toBe(true);
    expect(isAllowedPoster(new File(["image"], "poster.webp", { type: "image/webp" }))).toBe(true);
    expect(
      isAllowedPoster(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "poster.jpg", { type: "image/jpeg" }),
      ),
    ).toBe(false);
  });

  it("exports the Australian states and territories", () => {
    expect(EVENT_STATES.map((state) => state.value)).toEqual([
      "VIC",
      "NSW",
      "QLD",
      "WA",
      "SA",
      "TAS",
      "ACT",
      "NT",
    ]);
  });
});
