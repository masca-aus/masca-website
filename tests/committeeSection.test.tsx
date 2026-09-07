import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import CommitteeSection from "@/app/(frontend)/committee/CommitteeSection"
import type { CommitteeMember } from "@/utils/committee"

const members: CommitteeMember[] = [
  {
    id: "1",
    name: "First Chair",
    role: "National Chairperson",
    department: "chairs",
    img: "/first-chair.jpg",
    year: "2026",
  },
  {
    id: "2",
    name: "Second Chair",
    role: "Deputy National Chairperson",
    department: "chairs",
    img: "/second-chair.jpg",
    year: "2026",
  },
]

describe("public committee section", () => {
  it("shows the department and its members without a public member count", () => {
    const html = renderToStaticMarkup(
      <CommitteeSection members={members} years={["2026"]} />,
    )

    expect(html).toContain("Chairs")
    expect(html).toContain("First Chair")
    expect(html).toContain("Second Chair")
    expect(html).not.toContain(">2 members<")
  })
})
