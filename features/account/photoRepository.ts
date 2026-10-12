import pg from "pg";
import { randomUUID } from "node:crypto";
import { workspaceSchema } from "../access/workspaceEnvironment";
import { isWorkspaceEmail } from "../access/workspacePolicy";
import { AccountPhotoError } from "./photo";
export type PhotoActor = {
  id: number | string;
  email: string;
  status: string;
  sessionRevision?: string;
};
const globalPool = globalThis as typeof globalThis & {
  accountPhotoPool?: pg.Pool;
};
function pool() {
  return (globalPool.accountPhotoPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URI,
    max: 2,
    connectionTimeoutMillis: 10000,
  }));
}
async function transaction<T>(
  actor: PhotoActor,
  operation: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT email,status,session_revision FROM "${workspaceSchema()}".users WHERE id=$1 FOR SHARE`,
      [actor.id],
    );
    const user = rows[0];
    if (
      !user ||
      user.status !== "active" ||
      !isWorkspaceEmail(user.email) ||
      !actor.sessionRevision ||
      user.session_revision !== actor.sessionRevision
    )
      throw new AccountPhotoError("Please sign in again.", 401);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function accountPhotoInfo(actor: PhotoActor) {
  return transaction(actor, async (client) => {
    const { rows } = await client.query(
      `SELECT version FROM "${workspaceSchema()}".account_photos WHERE user_id=$1`,
      [actor.id],
    );
    return { userId: String(actor.id), photoVersion: rows[0]?.version ?? null };
  });
}
export async function readAccountPhoto(actor: PhotoActor, target: string) {
  if (!/^\d+$/.test(target))
    throw new AccountPhotoError("Photo not found.", 404);
  return transaction(actor, async (client) => {
    const { rows } = await client.query(
      `SELECT p.photo,p.version FROM "${workspaceSchema()}".account_photos p JOIN "${workspaceSchema()}".users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.status='active'`,
      [target],
    );
    if (!rows.length) throw new AccountPhotoError("Photo not found.", 404);
    return rows[0] as { photo: Buffer; version: string };
  });
}
export async function saveAccountPhoto(
  actor: PhotoActor,
  photo: Buffer | null,
) {
  return transaction(actor, async (client) => {
    if (photo === null) {
      await client.query(
        `DELETE FROM "${workspaceSchema()}".account_photos WHERE user_id=$1`,
        [actor.id],
      );
      return { userId: String(actor.id), photoVersion: null };
    }
    const version = randomUUID();
    await client.query(
      `INSERT INTO "${workspaceSchema()}".account_photos(user_id,photo,version) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET photo=$2,version=$3`,
      [actor.id, photo, version],
    );
    return { userId: String(actor.id), photoVersion: version };
  });
}
