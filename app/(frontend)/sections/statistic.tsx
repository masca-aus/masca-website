const stats = [
  { value: "14k+", label: "students reached" },
  { value: "7", label: "states and territories" },
  { value: "2001", label: "founded" },
] as const

export default function StatisticSection() {
  return (
    <section className="relative z-10">
      <div className="container pb-12 md:pb-16">
        <div className="grid grid-cols-3 gap-4 border-t border-blue-500 pt-7 md:pt-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span className="text-2xl font-semibold text-yellow-500 md:text-h2">{value}</span>
              <span className="eyebrow text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
