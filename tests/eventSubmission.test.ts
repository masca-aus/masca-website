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
        startDate: "2026-10-01T08:00:00.000Z",
        endDate: "2026-10-01T11:00:00.000Z",
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
    const result = parseEventSubmission(
      validFormData({
        endDate: "",
        ticketURL: "",
        poster: new File([], "", { type: "" }),
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        title: "Malaysian Students Welcome Night",
        organisation: "MASCA Victoria",
        description: "An evening for Malaysian students to meet new friends and mentors.",
        startDate: "2026-10-01T08:00:00.000Z",
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

  it("accepts true as an accuracy confirmation", () => {
    const result = parseEventSubmission(validFormData({ accuracyConfirmed: "true" }));

    expect(result).toMatchObject({
      ok: true,
      data: { title: "Malaysian Students Welcome Night" },
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

  it("converts event-local times using the selected Australian state timezone", () => {
    const brisbane = parseEventSubmission(
      validFormData({ state: "QLD", startDate: "2026-12-01T18:00", endDate: "" }),
    );
    const sydney = parseEventSubmission(
      validFormData({ state: "NSW", startDate: "2026-12-01T18:00", endDate: "" }),
    );
    const adelaide = parseEventSubmission(
      validFormData({ state: "SA", startDate: "2026-10-01T18:00", endDate: "" }),
    );

    expect(brisbane).toMatchObject({
      ok: true,
      data: { startDate: "2026-12-01T08:00:00.000Z" },
    });
    expect(sydney).toMatchObject({
      ok: true,
      data: { startDate: "2026-12-01T07:00:00.000Z" },
    });
    expect(adelaide).toMatchObject({
      ok: true,
      data: { startDate: "2026-10-01T08:30:00.000Z" },
    });
  });

  it("rejects nonexistent Sydney daylight-saving wall times", () => {
    const result = parseEventSubmission(
      validFormData({ state: "NSW", startDate: "2026-10-04T02:30", endDate: "" }),
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: { startDate: ["Enter a valid start date."] },
    });
  });

  it("chooses the earlier instant for ambiguous Sydney daylight-saving wall times", () => {
    const result = parseEventSubmission(
      validFormData({ state: "NSW", startDate: "2026-04-05T02:30", endDate: "" }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: { startDate: "2026-04-04T15:30:00.000Z" },
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
