import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicCarePathway } from "@/features/care/publicCarePathways";
import { pageMetadata } from "@/utils/seo";

type CarePathwayPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: CarePathwayPageProps): Promise<Metadata> {
  const { id } = await params;
  const pathway = /^\d+$/.test(id) ? await getPublicCarePathway(Number(id)) : null;
  return pageMetadata({
    title: pathway?.title ?? "Cares",
    description: pathway?.shortDescription ?? "Support and resources for Malaysian students in Australia.",
    path: `/care/pathways/${id}`,
  });
}

export default async function CarePathwayPage({ params }: CarePathwayPageProps) {
  const { id } = await params;
  const pathway = /^\d+$/.test(id) ? await getPublicCarePathway(Number(id)) : null;
  if (!pathway) notFound();

  return (
    <main id="main" className="overflow-hidden bg-white">
      <section className="bg-blue-600 pb-16 pt-36 text-white md:pb-20 md:pt-44">
        <div className="container">
          <Link href="/care#choose-a-path" className="inline-flex items-center gap-2 text-sm font-bold text-yellow-500 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Cares
          </Link>
          <div className="mt-8 max-w-3xl">
            <span className="eyebrow text-yellow-500">MASCA cares · support and resources</span>
            <h1 className="mt-4 text-5xl text-white sm:text-6xl">{pathway.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">{pathway.shortDescription}</p>
          </div>
        </div>
      </section>

      {pathway.detail ? (
        <section className="container section-pad">
          <div className="mx-auto max-w-4xl whitespace-pre-line text-lg leading-relaxed text-gray-700">
            {pathway.detail}
          </div>
        </section>
      ) : null}

      {pathway.children.length ? (
        <section className="bg-blue-50">
          <div className="container section-pad">
            <div className="mx-auto max-w-6xl">
              <span className="eyebrow text-red-600">keep exploring</span>
              <h2 className="mt-4 text-blue-600">More in {pathway.title}</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pathway.children.map((child) => {
                  const href = child.linkUrl?.trim() || `/care/pathways/${child.id}`;
                  const external = href.startsWith("https://");
                  return (
                    <a key={child.id} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="group flex min-h-48 flex-col rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      <strong className="text-xl text-blue-600">{child.title}</strong>
                      <span className="mt-3 text-sm leading-relaxed text-gray-700">{child.shortDescription}</span>
                      <ArrowRight size={18} className="mt-auto pt-6 text-red-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!pathway.detail && pathway.children.length === 0 ? (
        <section className="container section-pad">
          <p className="mx-auto max-w-3xl text-center text-gray-700">More information for this section is coming soon.</p>
        </section>
      ) : null}
    </main>
  );
}
