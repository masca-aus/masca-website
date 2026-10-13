import type { CommitteeAccount } from "./committeePolicy.ts";
export function committeeAccessEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.COMMITTEE_ACCESS_ENABLED === "true";
}
/** Current server configuration, never a client-submitted access model. */
export function withCommitteeMode<T extends CommitteeAccount>(
  account: T,
  env: Record<string, string | undefined> = process.env,
): T {
  return {
    ...account,
    accessModel: committeeAccessEnabled(env) ? "committee" : "legacy",
  };
}
