import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | MASCA",
  description: ""
};

export default function AboutUsPage() {
  return (
    <main style={{ paddingTop: 120 }}>
      <h1 style={{ textAlign: "center", padding: "2rem" }}>About Us Page</h1>
    </main>
  )
}
