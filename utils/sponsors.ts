import { readdirSync } from "node:fs";
import { join } from "node:path";

const SPONSORS_DIR = join(process.cwd(), "public", "sponsors");

/**
 * Lists the sponsor logo SVGs in /public/sponsors as web paths
 * (e.g. "/sponsors/red-bull-logo.svg"), sorted by filename.
 *
 * Uses `fs`, so it runs on the server only — call it from a Server Component
 * and pass the result down to the (client) marquee. Drop a new .svg in the
 * folder and it shows up on the next build / dev refresh; no code change.
 */
export function getSponsorLogos(): string[] {
  return readdirSync(SPONSORS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".svg"))
    .sort()
    .map((file) => `/sponsors/${encodeURIComponent(file)}`);
}