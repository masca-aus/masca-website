import { sendSubmissionReceipt } from '@/features/submissions/listingEmailActions';
import { isIP } from "node:net";

import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { createCareerSubmission } from "@/features/careers/createCareerSubmission";
import { parseCareerSubmission } from "@/features/careers/careerSubmission";
import { consumeSubmissionAttempt } from "@/features/events/submissionRateLimit";

export const runtime = "nodejs";

type SubmitCareerResponse =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function submissionKey(request: NextRequest): string {
  // Trust Vercel's platform header. Missing or invalid values share one bucket.
  const forwarded = request.headers.get("x-vercel-forwarded-for");
  if (!forwarded || forwarded.length > 256) return "unknown";
  const ip = forwarded.split(",", 1)[0].trim();
  return isIP(ip) ? ip : "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse<SubmitCareerResponse>> {
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
    const result = parseCareerSubmission(formData);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Please check the highlighted fields.", fieldErrors: result.fieldErrors },
        { status: 422 },
      );
    }

    const payload = await getPayload({ config });
    const submitted = await createCareerSubmission(payload, result.data);

    await sendSubmissionReceipt(payload, 'careers', submitted.id);

    return NextResponse.json(
      { ok: true, message: "Your opportunity has been received. The Careers team will review it before publication." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "We could not save your submission. Please try again later." },
      { status: 503 },
    );
  }
}
