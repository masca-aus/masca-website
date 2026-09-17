import { isIP } from "node:net";

import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { createEventSubmission, type EventSubmissionPayload } from "@/features/events/createEventSubmission";
import { parseEventSubmission } from "@/features/events/eventSubmission";
import { consumeSubmissionAttempt } from "@/features/events/submissionRateLimit";

export const runtime = "nodejs";

type SubmitEventResponse =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function submissionKey(request: NextRequest): string {
  // Trust Vercel's platform header. Missing or invalid values share one bucket.
  const forwarded = request.headers.get("x-vercel-forwarded-for");
  if (!forwarded || forwarded.length > 256) return "unknown";
  const ip = forwarded.split(",", 1)[0].trim();
  return isIP(ip) ? ip : "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse<SubmitEventResponse>> {
  if (!consumeSubmissionAttempt(submissionKey(request))) {
    return NextResponse.json(
      { ok: false, message: "Too many submission attempts. Please try again in an hour." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "We could not read your submission. Please try again." },
      { status: 400 },
    );
  }

  try {
    const result = parseEventSubmission(formData);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Please check the highlighted fields.", fieldErrors: result.fieldErrors },
        { status: 422 },
      );
    }

    const payload = await getPayload({ config });
    await createEventSubmission({
      // Temporary until Task 6 regenerates Payload types for the registered Events collection.
      payload: payload as unknown as EventSubmissionPayload,
      data: result.data,
      poster: result.poster,
    });

    return NextResponse.json(
      { ok: true, message: "Your event has been submitted and is pending review." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "We could not save your submission. Please try again later." },
      { status: 503 },
    );
  }
}
