'use client';
import { SelectField } from '@payloadcms/ui';
import type { SelectFieldClientComponent } from 'payload';
export const EventReviewField: SelectFieldClientComponent = props => <details className="masca-submission-review">
  <summary>Submission review</summary>
  <p>Use this for submitted events that need a review decision. Publishing approves the event automatically.</p>
  <SelectField {...props} />
</details>;
