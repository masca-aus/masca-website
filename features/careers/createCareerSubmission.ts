import 'server-only';
import type { Payload } from 'payload';
import { publicCareerSubmission } from '../access/publicSubmissionContext.ts';
import { melbourneToday } from '../../utils/careers.ts';
import type { CareerSubmissionInput } from './careerSubmission.ts';
export async function createCareerSubmission(payload:Payload,data:CareerSubmissionInput) {
 return payload.create({collection:'careers',overrideAccess:true,draft:true,
  context:{publicCareerSubmission},
  data:{...data,added:melbourneToday(),featured:false,owningScope:'National',submittedForReview:true,_status:'draft'} as never,
 });
}
