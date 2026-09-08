import Link from "next/link";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
};

export default function LegalPage({
  eyebrow,
  title,
  summary,
  children,
}: LegalPageProps) {
  return (
    <main id="main" className="bg-white">
      <header className="bg-blue-600 pb-20 pt-44 sm:pb-24 sm:pt-48">
        <div className="container">
          <span className="eyebrow text-yellow-500">{eyebrow}</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-blue-100 sm:text-lg">
            {summary}
          </p>
        </div>
      </header>

      <div className="container grid gap-12 py-14 sm:py-20 lg:grid-cols-[240px_minmax(0,760px)] lg:gap-20">
        <aside className="self-start rounded-2xl border border-blue-100 bg-blue-50 p-5 lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">
            Effective date
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-700">
            8 September 2026
          </p>
          <div className="my-5 h-px bg-blue-100" />
          <p className="text-sm leading-6 text-gray-700">
            Questions or requests? Email{" "}
            <a
              href="mailto:hello@masca.org.au"
              className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-500"
            >
              hello@masca.org.au
            </a>
            .
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex text-sm font-bold text-blue-600 hover:text-blue-500"
          >
            Contact MASCA <span aria-hidden="true">&nbsp;&rarr;</span>
          </Link>
        </aside>

        <article className="min-w-0 flex flex-col gap-12 text-base leading-7 text-gray-700 lg:gap-14 [&_section]:scroll-mt-28 [&_h2]:mb-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-blue-700 sm:[&_h2]:text-3xl [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-blue-700 [&_p+p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_a]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4 hover:[&_a]:text-blue-500">
          {children}
        </article>
      </div>
    </main>
  );
}
