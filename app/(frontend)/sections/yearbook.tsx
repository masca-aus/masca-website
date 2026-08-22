import Button from "@/components/Button"
import { getCommittee, getCommitteeYears } from "@/utils/committee"

import YearbookStack from "./yearbookStack"

export default async function YearbookSection() {
  const members = await getCommittee()
  const years = getCommitteeYears(members)
  const latestYear = years[0]

  const featured = members.filter((m) => m.year === latestYear).slice(0, 5)

  if (featured.length === 0) return null

  return (
    <section className="bg-gray-100">
      <div className="container section-pad grid grid-cols-1 lg:grid-cols-2 items-center gap-24 lg:gap-16">

        {/* Left: the pitch */}
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4">
            <span className="eyebrow text-red-600">The Yearbook</span>
            <h2 className="title text-blue-600">The Class of {latestYear}</h2>
          </header>

          <p className="font-secondary text-blue-600 italic text-xl leading-snug">
            “Elected each year — by students, for students.”
          </p>

          <p className="text-gray-700">
            Every chapter, every event, every late-night welfare call traces back to a
            committee of Malaysian students who put their hands up. Meet the people steering
            MASCA this year — the friendly faces behind the council.
          </p>

          <Button href="/committee" className="self-start mt-4">
            Flip through the yearbook <span aria-hidden>&rarr;</span>
          </Button>
        </div>

        <YearbookStack members={featured} />

      </div>
    </section>
  )
}
