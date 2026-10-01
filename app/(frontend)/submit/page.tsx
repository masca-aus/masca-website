import type { Metadata } from "next";
import { BriefcaseBusiness, CalendarDays } from "lucide-react";
import Button from "@/components/Button";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Post on our page",
  description: "Share an event or job with Malaysian students across Australia. Choose a submission type and send it to MASCA for review.",
  path: "/submit",
});

const options = [
  { title: "Careers", icon: BriefcaseBusiness, description: "Help students find their next opportunity. Share a job, internship or graduate role.", href: "/submit/career", action: "Post a job", color: "bg-yellow-100" },
  { title: "Events", icon: CalendarDays, description: "Bring the community together. Share a student society event, workshop or celebration.", href: "/submit/event", action: "Post an event", color: "bg-red-100" },
];
const steps = [
  { title: "Choose a category", description: "Select Events or Careers below." },
  { title: "Add your details", description: "Complete the form and check your submission." },
  { title: "We review it", description: "The MASCA team checks your submission before it can be published." },
];

export default function SubmitPage() {
  return <main id="main">
    <section className="bg-blue-600 pt-48 pb-24">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">Share with the community</span>
        <h1 className="title text-white">Post on our page</h1>
        <p className="max-w-2xl text-blue-100 md:text-lg">Reach Malaysian students across Australia. Choose what you’d like to share and we’ll guide you through the rest.</p>
      </div>
    </section>
    <section className="container section-pad" aria-labelledby="submission-type">
      <h2 id="submission-type" className="text-h2 font-bold text-blue-600">What would you like to post?</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {options.map(({ title, icon: Icon, description, href, action, color }) => <article key={title} className="flex flex-col items-start gap-5 rounded-2xl border border-blue-100 bg-white p-6 md:p-8">
          <span className={`rounded-xl p-3 text-blue-600 ${color}`}><Icon size={28} aria-hidden="true" /></span>
          <h3 className="text-h3 font-bold text-blue-600">{title}</h3>
          <p className="grow text-gray-700">{description}</p>
          <Button href={href} variant="accent">{action} <span aria-hidden>&rarr;</span></Button>
        </article>)}
      </div>
      <div className="mt-12 rounded-2xl bg-blue-50 p-6 md:p-8">
        <h2 className="text-h3 font-bold text-blue-600">How it works</h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          {steps.map(({ title, description }, index) => <li key={title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-yellow-500" aria-hidden="true">{index + 1}</span>
            <div><h3 className="font-bold text-blue-600">{title}</h3><p className="mt-2 text-body-sm text-gray-700">{description}</p></div>
          </li>)}
        </ol>
        <p className="mt-8 text-body-sm text-gray-500">Submitting does not publish your post automatically. Only approved submissions appear on the website.</p>
      </div>
    </section>
  </main>;
}
