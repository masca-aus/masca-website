import type { Metadata } from "next";

import PublicLayout from "./(frontend)/layout";
import NotFound from "./(frontend)/not-found";

export const metadata: Metadata = {
  title: "404 · A little detour | MASCA",
  description: "This page has gone jalan-jalan. Find your way home, or explore a little of Malaysia and Australia with MASCA.",
  robots: { index: false, follow: true },
};

// Unmatched URLs bypass both root layouts. Reuse the public document here
// so the complete 404, fonts, navigation and footer also render without JS.
export default function GlobalNotFound() {
  return (
    <PublicLayout>
      <NotFound />
    </PublicLayout>
  );
}
