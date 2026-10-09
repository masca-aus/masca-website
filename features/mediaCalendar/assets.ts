import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { transaction, table, lockedPost, savePost } from "./repository.ts";
import { calendarSchema } from "./schema.ts";
import type { CalendarUser, Asset } from "./types.ts";
import { CalendarError } from "./validation.ts";
import { validateUpload, validSignature } from "./uploadPolicy.ts";
import { applyAction } from "./service.ts";
export function privateStorage() {
  const bucket =
    process.env[
      calendarSchema() === "media_calendar"
        ? "CALENDAR_PRIVATE_BUCKET"
        : "CALENDAR_PRIVATE_PREVIEW_BUCKET"
    ];
  if (!bucket || bucket === (process.env.S3_BUCKET || "media"))
    throw new CalendarError(
      "Private media storage needs setup. Your draft is saved; uploads will be available once the private bucket is connected.",
      503,
    );
  return {
    bucket,
    s3: new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    }),
  };
}
export async function initUpload(
  actor: CalendarUser,
  postId: string,
  name: string,
  mime: string,
  size: number,
) {
  validateUpload(name, mime, size);
  const { s3, bucket } = privateStorage();
  return transaction(actor, "edit", async (c, user) => {
    const p = await lockedPost(c, postId);
    if (["in_review", "posted"].includes(p.status))
      throw new CalendarError(
        "This post is locked. Withdraw review or duplicate it before adding media.",
        409,
      );
    const pending = await c.query(
      `SELECT count(*)::int AS n FROM ${table("assets")} WHERE post_id=$1 AND data->>'ready'='false' AND COALESCE(data->>'cancelled','false')='false' AND (data->>'createdAt')::timestamptz>now()-interval '1 day'`,
      [postId],
    );
    if (p.assets.length + pending.rows[0].n >= 10)
      throw new CalendarError("A post can contain up to 10 media files.");
    const id = randomUUID(),
      asset: Asset = {
        id,
        postId,
        name: name.split(/[\\/]/).pop()!,
        mime,
        size,
        key: `${calendarSchema()}/${postId}/${id}`,
        ready: false,
        createdBy: String(user.id),
        createdAt: new Date().toISOString(),
      };
    await c.query(
      `INSERT INTO ${table("assets")}(id,post_id,data) VALUES($1,$2,$3)`,
      [id, postId, JSON.stringify(asset)],
    );
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: asset.key,
        ContentType: mime,
      }),
      { expiresIn: 300 },
    );
    return { id, url };
  });
}
async function assetFor(
  actor: CalendarUser,
  id: string,
  capability: "view" | "edit",
) {
  return transaction(actor, capability, async (c) => {
    const r = await c.query(`SELECT data FROM ${table("assets")} WHERE id=$1`, [
      id,
    ]);
    if (!r.rows.length) throw new CalendarError("Media not found.", 404);
    return r.rows[0].data as Asset & { cancelled?: boolean };
  });
}
export async function finishUpload(
  actor: CalendarUser,
  id: string,
  expectedVersion: number,
) {
  const a = await assetFor(actor, id, "edit");
  if (a.cancelled || Date.now() - Date.parse(a.createdAt) > 86400000)
    throw new CalendarError("This upload expired. Add the file again.");
  const { s3, bucket } = privateStorage();
  if (a.ready)
    return transaction(actor, "edit", (c) => lockedPost(c, a.postId));
  const object = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: a.key }),
  );
  if (object.ContentLength !== a.size || object.ContentType !== a.mime)
    throw new CalendarError(
      "The uploaded file did not match its expected type or size.",
    );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || bytes.length !== a.size || !validSignature(a.mime, bytes))
    throw new CalendarError(
      "The file contents do not match the selected image or video format.",
    );
  let thumbnail: Buffer | undefined;
  if (a.mime.startsWith("image/")) {
    try {
      thumbnail = await sharp(bytes, { limitInputPixels: 40000000 })
        .resize(640, 640, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
    } catch {
      throw new CalendarError(
        "This image could not be opened. Choose a valid image under 40 megapixels.",
      );
    }
  }
  return transaction(actor, "edit", async (c, user) => {
    const p = await lockedPost(c, a.postId);
    const current = await c.query(
      `SELECT data FROM ${table("assets")} WHERE id=$1 FOR UPDATE`,
      [id],
    );
    if (!current.rows.length || Date.now() - Date.parse(a.createdAt) > 86400000)
      throw new CalendarError(
        "This upload expired. Please add the file again.",
      );
    if (current.rows[0]?.data.cancelled)
      throw new CalendarError("This upload was cancelled.");
    if (p.assets.includes(id)) return p;
    if (p.assets.length >= 10)
      throw new CalendarError("This post already has 10 files.");
    applyAction(p, user, {
      action: "patch",
      expectedVersion,
      patch: {
        assets: [...p.assets, id],
        ...(p.assets.length && p.type === "feed"
          ? { type: "carousel" as const }
          : {}),
      },
    });
    // Upload URLs only address staging keys. Completed objects cannot be rewritten by a still-valid PUT URL.
    const finalKey = `${a.key}/final/${randomUUID()}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        ContentType: a.mime,
        Body: bytes,
      }),
    );
    const thumbnailKey = thumbnail ? `${finalKey}/preview.webp` : undefined;
    if (thumbnail)
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          ContentType: "image/webp",
          Body: thumbnail,
        }),
      );
    await c.query(`UPDATE ${table("assets")} SET data=$2 WHERE id=$1`, [
      id,
      JSON.stringify({
        ...a,
        key: finalKey,
        stagingKey: a.key,
        thumbnailKey,
        ready: true,
      }),
    ]);
    await savePost(c, p);
    await c.query(
      `INSERT INTO ${table("revisions")}(post_id,author,action,data) VALUES($1,$2,'media',$3)`,
      [p.id, String(user.id), JSON.stringify({ ...p, comments: [] })],
    );
    return p;
  });
}
export async function cancelUpload(actor: CalendarUser, id: string) {
  return transaction(actor, "edit", async (c) => {
    const r = await c.query(
      `SELECT data FROM ${table("assets")} WHERE id=$1 FOR UPDATE`,
      [id],
    );
    if (r.rows[0]?.data && !r.rows[0].data.ready)
      await c.query(
        `UPDATE ${table("assets")} SET data=data||'{"cancelled":true}'::jsonb WHERE id=$1`,
        [id],
      );
  });
}
export async function assetURL(
  actor: CalendarUser,
  id: string,
  download = false,
  thumbnail = false,
) {
  const a = await assetFor(actor, id, "view");
  if (!a.ready || a.cancelled)
    throw new CalendarError("This media is still uploading.", 409);
  if (thumbnail && !a.thumbnailKey)
    throw new CalendarError(
      "A thumbnail is not available for this media.",
      404,
    );
  const { s3, bucket } = privateStorage();
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: thumbnail ? a.thumbnailKey : a.key,
      ResponseContentDisposition: download
        ? `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`
        : "inline",
    }),
    { expiresIn: 60 },
  );
}
