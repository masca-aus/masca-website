import { getPayload, createLocalReq } from "payload";
import config from "@payload-config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { privateStorage } from "@/features/mediaCalendar/assets";
import {
  mayReadLibraryFile,
  privateMediaPrefix,
} from "@/features/access/committeeMedia";
import type {
  CommitteeAccount,
  CommitteeScope,
} from "@/features/access/committeePolicy";
import { validSharing } from "@/features/access/committeePolicy";
import { committeeAccessEnabled } from "@/features/access/committeeEnvironment";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};
export async function GET(request: Request) {
  try {
    const filename = new URL(request.url).searchParams.get("filename");
    if (!filename || filename.length > 300 || /[\\/\x00-\x1f]/.test(filename))
      return new Response("File not found.", { status: 404, headers });
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "media",
      where: {
        or: [
          { filename: { equals: filename } },
          { "sizes.admin-preview.filename": { equals: filename } },
        ],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as (typeof result.docs)[number] & {
      owningScope: CommitteeScope;
    };
    if (!doc || (doc.prefix && doc.prefix !== privateMediaPrefix))
      return new Response("File not found.", { status: 404, headers });
    const { user } = await payload.auth({ headers: request.headers });
    let allowed = mayReadLibraryFile(
      user as unknown as CommitteeAccount | null,
      {
        owningScope: doc.owningScope,
        accessPublished: doc.accessPublished ?? false,
        sharedWith: validSharing(doc.sharedWith) ? doc.sharedWith : [],
      },
    );
    if (!allowed) {
      for (const [collection, field] of [
        ["events", "poster"],
        ["committee", "portrait"],
        ["sponsors", "logo"],
      ] as const) {
        const found = await payload.find({
          collection,
          where: { [field]: { equals: doc.id } },
          depth: 0,
          limit: 1,
          overrideAccess: false,
          disableErrors: true,
          draft: false,
        });
        if (
          found.docs.some(
            (parent) =>
              (parent as { _status?: string })._status === "published" ||
              (!committeeAccessEnabled() &&
                collection === "sponsors" &&
                parent.accessPublished === true),
          )
        )
          allowed = true;
        if (!allowed && user) {
          const draftParents = await payload.find({
            collection,
            where: { [field]: { equals: doc.id } },
            depth: 0,
            limit: 1,
            overrideAccess: false,
            disableErrors: true,
            draft: true,
            req: await createLocalReq({ user }, payload),
          });
          allowed = draftParents.docs.length > 0;
        }
      }
    }
    if (!allowed)
      return new Response("File not found.", { status: 404, headers });
    const { s3, bucket } = privateStorage();
    const object = await s3.send(
      new GetObjectCommand({
        Bucket:
          doc.prefix === privateMediaPrefix
            ? bucket
            : process.env.S3_BUCKET || "media",
        Key:
          doc.prefix === privateMediaPrefix
            ? `${privateMediaPrefix}/${filename}`
            : filename,
      }),
    );
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes)
      return new Response("File not found.", { status: 404, headers });
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return new Response("File could not load.", { status: 503, headers });
  }
}
