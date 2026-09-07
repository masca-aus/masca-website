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

        <article className="legal-copy min-w-0 text-gray-700">{children}</article>
      </div>
    </main>
  );
}
