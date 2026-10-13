import { committeeAccessEnabled } from "./committeeEnvironment.ts";
import {
  mayAccessResource,
  type CommitteeAccount,
  type CommitteeScope,
  type SharingGrant,
  type CommitteeResource,
} from "./committeePolicy.ts";
export const privateMediaPrefix = "committee-private";
export function libraryBucket(
  env: Record<string, string | undefined> = process.env,
) {
  if (!committeeAccessEnabled(env)) return env.S3_BUCKET || "media";
  const bucket =
    env[
      env.VERCEL_ENV === "production"
        ? "CALENDAR_PRIVATE_BUCKET"
        : "CALENDAR_PRIVATE_PREVIEW_BUCKET"
    ];
  if (!bucket || bucket === (env.S3_BUCKET || "media"))
    throw new Error(
      "Committee uploads require the private media bucket before activation.",
    );
  return bucket;
}
export function libraryFileURL(
  filename: string,
  prefix: string | undefined,
  publicURL: (filename: string) => string,
) {
  return committeeAccessEnabled() || prefix === privateMediaPrefix
    ? `/api/committee-media?filename=${encodeURIComponent(filename)}`
    : publicURL(filename);
}
export function mayReadLibraryFile(
  account: CommitteeAccount | null,
  doc: {
    owningScope: CommitteeScope;
    sharedWith?: SharingGrant[];
    accessPublished?: boolean;
    prefix?: string;
  },
) {
  return (
    doc.accessPublished === true ||
    mayAccessResource(account, { ...doc, area: "media" }, "view")
  );
}

/** A visible parent gives attachment access, never media-library browsing. */
export function mayReadReferencedMedia(
  account: CommitteeAccount | null,
  parents: CommitteeResource[],
) {
  return parents.some((parent) => mayAccessResource(account, parent, "view"));
}

/** Storage keys and immutable bytes must not be editable through document JSON. */
export function guardLibraryUpload(
  data: Record<string, unknown>,
  original: Record<string, unknown> | undefined,
  hasFile: boolean,
  operation: "create" | "update",
  enabled: boolean,
) {
  if (!enabled) return data;
  if (operation === "create") {
    if (!hasFile) throw new Error("Choose an image file to upload.");
    return { ...data, prefix: privateMediaPrefix };
  }
  if (hasFile)
    throw new Error(
      "Upload a new image so published attachments and their approvals stay unchanged.",
    );
  for (const key of [
    "filename",
    "prefix",
    "url",
    "thumbnailURL",
    "mimeType",
    "filesize",
    "width",
    "height",
    "sizes",
  ])
    if (
      key in data &&
      JSON.stringify(data[key]) !== JSON.stringify(original?.[key])
    )
      throw new Error(
        "File details are maintained by the upload service. Upload a new image to replace this one.",
      );
  return data;
}
