import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, getPayload } = vi.hoisted(() => ({ create: vi.fn(), getPayload: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({ getPayload }));
vi.mock("@payload-config", () => ({ default: { testConfig: true } }));

let POST: typeof import("@/app/(frontend)/api/submit-event/route").POST;
let consumeSubmissionAttempt: typeof import("@/features/events/submissionRateLimit").consumeSubmissionAttempt;

const contactName = "Private Contact Person";
const contactEmail = "private-contact@example.org";
const diagnostics = "database password=secret-credential SELECT failed stack trace";

const validFormData = (overrides: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "Malaysian Students Welcome Night",
    organisation: "MASCA Victoria",
    description: "An evening for Malaysian students to meet new friends and mentors.",
    startDate: "2026-10-01T18:00",
    venue: "Student Pavilion, Carlton",
    state: "VIC",
    contactName,
    contactEmail,
    accuracyConfirmed: "on",
    ...overrides,
  })) form.set(key, value);
  return form;
};

const request = (body = validFormData(), headers: Record<string, string> = { "x-vercel-forwarded-for": "203.0.113.1" }) =>
  new NextRequest("https://example.org/api/submit-event", { method: "POST", body, headers });

async function safeBody(response: Response, status: number) {
  expect(response.status).toBe(status);
  const text = await response.text();
  for (const secret of [contactName, contactEmail, "secret-credential", "SELECT", "stack", "database"]) {
    expect(text).not.toContain(secret);
  }
  const body = JSON.parse(text);
  expect(typeof body.message).toBe("string");
  expect(body.message.length).toBeGreaterThan(0);
  expect(Object.keys(body).every((key) => ["ok", "message", "fieldErrors"].includes(key))).toBe(true);
  expect(body.ok).toBe(status === 201);
  return body;
}

beforeEach(async () => {
  // Reload the module to reset its process-local limiter without production test hooks.
  vi.resetModules();
  vi.resetAllMocks();
  create.mockResolvedValue({ id: 42, contactName, contactEmail, internalNotes: diagnostics });
  getPayload.mockResolvedValue({ create });
  ({ POST } = await import("@/app/(frontend)/api/submit-event/route"));
  ({ consumeSubmissionAttempt } = await import("@/features/events/submissionRateLimit"));
});

describe("POST /api/submit-event", () => {
  it("returns 400 for malformed multipart data before initializing Payload", async () => {
    const malformed = new NextRequest("https://example.org/api/submit-event", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=missing" },
      body: `${contactEmail} ${diagnostics}`,
    });

    await safeBody(await POST(malformed), 400);
    expect(getPayload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 422 with safe field errors for invalid data without writing", async () => {
    const body = await safeBody(await POST(request(validFormData({ title: "", contactEmail: "private-contact@example.org invalid" }))), 422);

    expect(body.fieldErrors.title).toEqual([expect.any(String)]);
    expect(body.fieldErrors.contactEmail).toEqual([expect.any(String)]);
    expect(getPayload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns only a safe success message and persists a pending draft despite forged browser status", async () => {
    const body = await safeBody(await POST(request(validFormData({ reviewStatus: "approved", _status: "published", internalNotes: "forged" }))), 201);

    expect(Object.keys(body).sort()).toEqual(["message", "ok"]);
    expect(getPayload).toHaveBeenCalledExactlyOnceWith({ config: { testConfig: true } });
    expect(create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      collection: "events",
      overrideAccess: true,
      draft: true,
      data: expect.objectContaining({ reviewStatus: "pending", _status: "draft", contactName, contactEmail }),
    }));
    const writtenData = create.mock.calls[0][0].data;
    expect(writtenData).not.toHaveProperty("internalNotes");
    expect(JSON.stringify(writtenData)).not.toContain("203.0.113.1");
  });

  it("passes a valid multipart poster through to the service before creating the event", async () => {
    create.mockResolvedValueOnce({ id: 17 }).mockResolvedValueOnce({ id: 42 });
    const form = validFormData();
    form.set("poster", new File(["poster"], "poster.png", { type: "image/png" }));

    await safeBody(await POST(request(form)), 201);

    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ collection: "media", file: expect.objectContaining({ data: Buffer.from("poster") }) }));
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ collection: "events", data: expect.objectContaining({ poster: 17 }) }));
  });

  it("blocks the sixth attempt before parsing its body, even when previous attempts were invalid", async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await POST(request(validFormData({ title: "" })))).status).toBe(422);
    }
    const sixth = request();
    const parse = vi.spyOn(sixth, "formData");

    await safeBody(await POST(sixth), 429);
    expect(parse).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    await safeBody(await POST(request(validFormData(), { "x-vercel-forwarded-for": "203.0.113.2" })), 201);
  });

  it("uses the first Vercel IP consistently when later forwarded values change", async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await POST(request(validFormData({ title: "" }), { "x-vercel-forwarded-for": `203.0.113.1, 203.0.113.${attempt + 2}` }));
    }
    await safeBody(await POST(request()), 429);
  });

  it("shares a bounded fallback for missing or invalid Vercel IPs and ignores spoofed generic headers", async () => {
    const headers: Record<string, string>[] = [
      {},
      { "x-forwarded-for": "203.0.113.10" },
      { "x-vercel-forwarded-for": "invalid-a" },
      { "x-vercel-forwarded-for": "invalid-b" },
      { "x-vercel-forwarded-for": "a".repeat(1000) },
    ];
    for (const header of headers) await POST(request(validFormData({ title: "" }), header));

    await safeBody(await POST(request(validFormData(), { "x-forwarded-for": "203.0.113.11" })), 429);
  });

  it.each(["initialization", "event write", "media upload"])("returns a safe 503 when %s fails", async (stage) => {
    const error = new Error(`${diagnostics} ${contactName} ${contactEmail}`);
    const form = validFormData();
    if (stage === "initialization") getPayload.mockRejectedValue(error);
    else create.mockRejectedValue(error);
    if (stage === "media upload") form.set("poster", new File(["poster"], "poster.webp", { type: "image/webp" }));

    const body = await safeBody(await POST(request(form)), 503);
    expect(Object.keys(body).sort()).toEqual(["message", "ok"]);
    if (stage === "media upload") {
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: "media" }));
    }
  });
});

describe("preview submission rate limiter", () => {
  it("allows five attempts per key while keeping keys independent", () => {
    for (let attempt = 0; attempt < 5; attempt++) expect(consumeSubmissionAttempt("one", 1000)).toBe(true);
    expect(consumeSubmissionAttempt("one", 1000)).toBe(false);
    expect(consumeSubmissionAttempt("two", 1000)).toBe(true);
  });

  it("expires attempts individually at the rolling hour boundary", () => {
    for (const time of [0, 100, 200, 300, 400]) expect(consumeSubmissionAttempt("one", time)).toBe(true);
    expect(consumeSubmissionAttempt("one", 3_599_999)).toBe(false);
    expect(consumeSubmissionAttempt("one", 3_600_000)).toBe(true);
    expect(consumeSubmissionAttempt("one", 3_600_001)).toBe(false);
    expect(consumeSubmissionAttempt("one", 3_600_100)).toBe(true);
  });

  it("defaults to the current time while remaining deterministic under a controlled clock", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      for (let attempt = 0; attempt < 5; attempt++) expect(consumeSubmissionAttempt("one")).toBe(true);
      expect(consumeSubmissionAttempt("one")).toBe(false);
      now.mockReturnValue(3_601_000);
      expect(consumeSubmissionAttempt("one")).toBe(true);
    } finally {
      now.mockRestore();
    }
  });
});
