import { readdirSync } from "node:fs";
import { join } from "node:path";

import { type Peep } from "@/components/WalkingCrowd";

const CASTS_DIR = join(process.cwd(), "public", "casts");

/**
 * Auto-discovers the walking crowd from /public/casts/ as {@link Peep}s.
 *
 * Uses `fs`, so it runs on the server only — call it from a Server Component
 * (e.g. the root layout) and pass the result to <WalkingCrowd>. Drop a new SVG
 * into the folder and it joins the crowd on the next build / dev refresh.
 */
export function getCastPeeps(): Peep[] {
  return readdirSync(CASTS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".svg"))
    .sort()
    .map((file) => ({
      name: file.replace(/\.svg$/i, ""),
      src: encodeURI(`/casts/${file}`), // encode spaces, e.g. "Jin Hong.svg"
    }));
}