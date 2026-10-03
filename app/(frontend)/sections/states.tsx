import AustraliaChapterMap from "../_components/AustraliaChapterMap"

export default function StatesSection() {
  return (
    <section id="states" className="bg-white">
      <div className="container section-pad flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">States and Territories</span>
          <h2 className="title text-blue-600">Find your state, find your people</h2>
        </header>

        <p className="text-gray-700">
          Each chapter is run by student leaders on the ground — local events,
          welfare contacts, and ways to get involved, wherever you land.
        </p>

        <div className="mx-auto w-full max-w-[760px] rounded-2xl bg-blue-600 px-5 py-7 shadow-brand sm:px-10 sm:py-9">
          <p className="mb-2 text-center text-xs font-semibold tracking-wide text-white/80">
            Choose a chapter to find its Instagram
          </p>
          <AustraliaChapterMap />
        </div>
      </div>
    </section>
  )
}
