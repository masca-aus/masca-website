import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export function googleSettings() {
  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_AUTH_ORIGIN: origin,
  } = process.env;
  if (!clientId || !clientSecret || !origin)
    throw new Error("Google sign-in is not configured.");
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    (url.protocol !== "https:" && url.hostname !== "localhost")
  )
    throw new Error("Invalid sign-in origin.");
  return {
    clientId,
    clientSecret,
    origin,
    callback: `${origin}/api/auth/google/callback`,
  };
}
export async function beginGoogleLogin(secret: string) {
  const settings = googleSettings();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const transaction = await new SignJWT({ state, nonce, verifier })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("masca-google-transaction")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.callback,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    hd: "masca.org.au",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), transaction };
}
export async function finishGoogleLogin(
  code: string,
  state: string,
  transaction: string,
  secret: string,
) {
  const settings = googleSettings();
  const { payload: flow } = await jwtVerify(
    transaction,
    new TextEncoder().encode(secret),
    { algorithms: ["HS256"], audience: "masca-google-transaction" },
  );
  if (
    !state ||
    flow.state !== state ||
    typeof flow.verifier !== "string" ||
    typeof flow.nonce !== "string"
  )
    throw new Error("Invalid sign-in transaction.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.callback,
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google sign-in failed.");
  const result = await response.json();
  if (typeof result.id_token !== "string")
    throw new Error("Missing identity token.");
  const { payload: identity } = await jwtVerify(result.id_token, googleKeys, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: settings.clientId,
    requiredClaims: [
      "exp",
      "iat",
      "sub",
      "email",
      "email_verified",
      "hd",
      "nonce",
    ],
  });
  if (
    identity.nonce !== flow.nonce ||
    identity.hd !== "masca.org.au" ||
    identity.email_verified !== true ||
    typeof identity.email !== "string"
  )
    throw new Error("Use your approved MASCA Workspace account.");
  return {
    sub: identity.sub!,
    email: identity.email,
    email_verified: true,
    hd: "masca.org.au",
  };
}
