import type { Metadata } from 'next';
import Button from '@/components/Button';
import { pageMetadata } from '@/utils/seo';
import { CareerSubmissionForm } from './CareerSubmissionForm';
export const metadata: Metadata = pageMetadata({title:'Submit a career opportunity',description:'Share a job or internship with MASCA for review.',path:'/submit/career'});
export default function CareerSubmitPage() { return <main id="main">
<section className="flex min-h-80 flex-col justify-center bg-blue-600 pt-48 pb-32"><div className="container flex flex-col gap-6"><span className="eyebrow text-yellow-500">opportunities for our community</span><h1 className="max-w-3xl text-4xl text-white md:text-5xl lg:text-6xl">Share an <span className="font-accent font-normal text-yellow-500">opportunity</span></h1><p className="max-w-xl text-blue-100/80 md:text-lg">Help Malaysian students discover their next step. Our team reviews every role before publication.</p></div></section>
<section className="container section-pad"><div className="mb-10 flex flex-wrap gap-3"><Button href="/submit" variant="ghost">← Post on our page</Button><Button href="/careers" variant="ghost">Browse jobs</Button></div><CareerSubmissionForm/></section></main>; }
