const flagshipEvents = [
  { id: 1, name: "Malaysia Night 2026", location: "KLCC", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
  { id: 2, name: "Malaysia Night 2026", location: "KLCC", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
  { id: 3, name: "Malaysia Night 2026", location: "KLCC", date: "12 Mar", state: "VIC", price: "$35", registerOpen: true }, 
]

export default function EventShowcaseSection() {
  return (
    <section>

      <div className="flex flex-col gap-6 container py-32">
        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">What&apos;s on this month</span>
          <span className="title text-blue-600">Our flagship event</span>
        </header>

        <p className="text-gray-700">From Malaysia Night galas to study sessions and durian-tasting socials. <br/> Pick something, bring a friend, jom!</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {flagshipEvents.map((event) => (
              <EventCard key={ event.id } event={ event } />
          ))}
        </div>
      </div>

    </section>
  )
}

interface EventData {
  id: number;
  name: string;
  location: string;
  date: string;
  state: string;
  price: string;
  registerOpen: boolean;
}

function EventCard({ event }: { event: EventData }) {
return (
    <article className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
      { event.name }
    </article>
  );
}


