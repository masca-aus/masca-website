import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import CareSubsectionTabs from "@/app/(frontend)/care/CareSubsectionTabs";
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
  if (!pathway || pathway.children.length) notFound();

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
      <CareSubsectionTabs title={pathway.title} subsections={pathway.subsections} />
    </main>
  );
}
