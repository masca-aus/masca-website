import 'server-only';
import { getPayload } from 'payload';
import config from '@payload-config';
import { melbourneToday, sortJobs, type Job } from '../../utils/careers';
import { careerToJob } from './careerModel';

export async function getCMSCareerBoard(): Promise<{ status: 'ok'; jobs: Job[] }> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: 'careers', overrideAccess: false, draft: false, pagination: false, depth: 0,
    select: { title: true, company: true, slug: true, type: true, companyWebsite: true, logoUrl: true, country: true, state: true, city: true, workMode: true, international: true, studyLevels: true, industry: true, eligibility: true, applyUrl: true, closes: true, added: true, pay: true, description: true, tags: true, featured: true, _status: true },
  });
  const today = melbourneToday();
  return { status: 'ok', jobs: sortJobs(docs.map(doc => careerToJob({ ...doc }, today)).filter((job): job is Job => Boolean(job)), 'newest') };
}
