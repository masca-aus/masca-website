import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (term.length < 2) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });

  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "organisations",
      where: {
        and: [
          { listed: { equals: true } },
          { or: [
            { name: { contains: term } },
            { abbreviation: { contains: term } },
            { university: { contains: term } },
            { aliases: { contains: term } },
          ] },
        ],
      },
      limit: 10,
      depth: 0,
      sort: "name",
      select: { name: true, abbreviation: true, university: true, state: true },
      overrideAccess: true,
    });

    return NextResponse.json(docs.map(({ id, name, abbreviation, university, state }) => ({
      id, name, abbreviation, university, state,
    })), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Organisation search is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
