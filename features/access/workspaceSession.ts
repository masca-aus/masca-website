import { createHmac } from 'node:crypto';
import { jwtVerify, SignJWT } from "jose";
import { parseCookies, type AuthStrategy } from "payload";
import type { ApprovedAccount } from "./workspacePolicy.ts";
export const workspaceStrategy: AuthStrategy = {
  name: "workspace-google",
  authenticate: async ({ headers, payload }) => {
    try {
      const origin = headers.get("origin");
      if (origin && origin !== process.env.GOOGLE_AUTH_ORIGIN)
        return { user: null };
      const token = parseCookies(headers).get(
        `${payload.config.cookiePrefix}-token`,
      );
      if (!token) return { user: null };
      const { payload: claims } = await jwtVerify(
        token,
        sessionKey(payload.secret),
        {
          algorithms: ["HS256"],
          audience: "masca-cms",
          issuer: process.env.GOOGLE_AUTH_ORIGIN,
        },
      );
      if (typeof claims.id !== "number") return { user: null };
      const user = await payload.findByID({
        collection: "users",
        id: claims.id,
        overrideAccess: true,
        depth: 0,
      });
      const account = user as unknown as ApprovedAccount & {
        sessionRevision: string;
      };
      if (
        account.status !== "active" ||
        !account.sessionRevision ||
        claims.revision !== account.sessionRevision
      )
        return { user: null };
      return {
        user: { ...user, collection: "users", _strategy: "workspace-google" },
      };
    } catch {
      return { user: null };
    }
  },
};
export async function signWorkspaceSession(
  id: number,
  revision: string,
  secret: string,
) {
  return new SignJWT({ id, collection: "users", revision })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(process.env.GOOGLE_AUTH_ORIGIN!)
    .setAudience("masca-cms")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey(secret));
}

function sessionKey(secret:string) { return createHmac("sha256", secret).update("masca-workspace-session-v1").digest(); }
