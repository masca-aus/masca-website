import { BriefcaseBusiness, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";

const options = [
  { label: "Post a job", description: "Jobs, internships and graduate opportunities.", href: "/submit/career", icon: BriefcaseBusiness },
  { label: "Post an event", description: "Student events, workshops and celebrations.", href: "/submit/event", icon: CalendarDays },
];

export default function PostOnOurPageSection() {
  return (
    <section className="bg-blue-600 section-pad" aria-labelledby="post-on-our-page">
      <div className="container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <span className="eyebrow text-yellow-500">Share with the community</span>
          <h2 id="post-on-our-page" className="title text-white">Post on our page</h2>
          <p className="max-w-xl text-body text-blue-100">Have something for Malaysian students in Australia? Share your next event or job opportunity with the MASCA community.</p>
          <p className="text-body-sm text-blue-100">Our team reviews every submission before it appears on the website.</p>
        </div>
        <div className="grid gap-4">
          {options.map(({ label, description, href, icon: Icon }) => (
            <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-6 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-500 motion-reduce:transition-none">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-blue-600"><Icon size={24} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block text-h3 font-bold">{label}</span><span className="mt-1 block text-body-sm text-blue-100">{description}</span></span>
              <ArrowRight className="size-5 shrink-0 text-yellow-500" aria-hidden="true" />
            </Link>
          ))}
          <Link href="/submit" className="justify-self-start rounded text-body-sm font-bold text-yellow-500 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-500">How posting works <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
