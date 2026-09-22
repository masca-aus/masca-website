import { cmsStatusField } from '../features/admin/cmsStatusField.ts';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache.js';
import { ValidationError, type Access, type CollectionConfig, type Field, type FieldHook, type Where } from 'payload';
import { JOB_TYPES, JOB_TYPE_LABEL, WORK_MODES, WORK_MODE_LABEL, INTERNATIONAL_OPTIONS, INTERNATIONAL_LABEL, STUDY_LEVELS, STUDY_LEVEL_LABEL, melbourneToday, deriveJobId } from '../utils/careers.ts';
import { CAREER_STEPS } from '../features/careers/careerEditor.ts';
import { careerPublicationErrors } from '../features/careers/careerModel.ts';
import { careerDateWhere, careerLifecycleAction, careerLifecycleIDs, careerListFilter } from '../features/careers/careerLifecycle.ts';

import { careerDeleteAccess, deleteCareerLifecycle } from '../features/careers/careerDeletion.ts';

import { careerQuickAction } from '../features/careers/careerQuickActions.ts';

const authenticated: Access = ({ req }) => Boolean(req.user);
export const publicCareerAccess: Access = async ({ req }): Promise<true | Where> => req.user ? true : { and: [
  { _status: { equals: 'published' } },
  { id: { not_in: (await careerLifecycleIDs(req.payload, ['closed', 'archived'], req)).concat(-1) } },
  careerDateWhere(),
] };
const optionList = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map(value => ({ value, label: labels[value] }));

export const Careers: CollectionConfig = {
  slug: 'careers', labels: { singular: 'Opportunity', plural: 'Careers' },
  admin: {
    useAsTitle: 'title', defaultColumns: ['title', 'company', 'type', 'cmsStatus', 'closes'],
    description: 'Manage opportunities for students. Save private drafts, review details and publish when ready. Rolling roles expire after 60 days; update the listed date after reconfirming availability.',
    hideAPIURL: true, baseFilter: careerListFilter,
    components: {
      beforeList: ['/components/admin/CareerListTools#CareerListTools'],
      edit: { beforeDocumentControls: ['/components/admin/DocumentBackLink#DocumentBackLink'],
        SaveDraftButton: '/components/admin/CareerEditor#CareerSaveControl', PublishButton: '/components/admin/CareerEditor#CareerPublishControl' },
      views: { edit: { default: { Component: '/components/admin/CareerEditor#CareerEditorView' }, versions: { tab: { label: 'Change history' } } } },
    },
  },
  access: { read: publicCareerAccess, readVersions: authenticated, create: authenticated, update: authenticated, delete: careerDeleteAccess },
  versions: { drafts: true, maxPerDoc: 0 },
  lockDocuments: { duration: 300 }, defaultSort: '-added',
  endpoints: [{ path: '/:id/lifecycle', method: 'post', handler: careerLifecycleAction }, { path: '/:id/quick-status', method: 'post', handler: careerQuickAction }],
  fields: ([
    cmsStatusField('careers'),
    { name: '_status', label: 'Publication', type: 'select', options: [], admin: { disableListColumn: true, components: { Field: false, Cell: '/components/admin/CareerStatusCell#CareerPublicationStatusCell' }, disableBulkEdit: true } },
    { name: 'careerWizardHeader', type: 'ui', admin: { components: { Field: '/components/admin/CareerEditor#CareerEditorHeader' }, disableListColumn: true, disableBulkEdit: true } },
    { name: 'title', type: 'text', required: true, maxLength: 120 },
    { name: 'company', type: 'text', required: true, maxLength: 80 },
    { name: 'type', type: 'select', defaultValue: 'internship', options: optionList(JOB_TYPES, JOB_TYPE_LABEL) },
    { name: 'industry', type: 'text' },
    { name: 'companyWebsite', type: 'text', label: 'Company website' },
    { name: 'logoUrl', type: 'text', label: 'Logo URL', admin: { description: 'Optional https:// image URL.' } },
    { name: 'country', type: 'text', defaultValue: 'Australia', admin: { description: 'Australia, Malaysia, or both.' } },
    { name: 'state', type: 'text', label: 'State or region', admin: { description: 'Use the state name or describe multiple locations.' } },
    { name: 'city', type: 'text' },
    { name: 'workMode', type: 'select', label: 'Work mode', options: optionList(WORK_MODES, WORK_MODE_LABEL) },
    { name: 'international', type: 'select', label: 'International students', defaultValue: 'unsure', options: optionList(INTERNATIONAL_OPTIONS, INTERNATIONAL_LABEL) },
    { name: 'studyLevels', type: 'select', label: 'Study levels', hasMany: true, defaultValue: ['any'], options: optionList(STUDY_LEVELS, STUDY_LEVEL_LABEL) },
    { name: 'eligibility', type: 'textarea', maxLength: 200 },
    { name: 'applyUrl', type: 'text', label: 'Application link or email', required: true },
    { name: 'closes', type: 'text', label: 'Closing date', admin: { description: 'YYYY-MM-DD. Leave empty for rolling applications.' } },
    { name: 'added', type: 'text', label: 'Listed date', defaultValue: () => melbourneToday(), admin: { description: 'YYYY-MM-DD. Only update after reconfirming that a role is still available.' } },
    { name: 'pay', type: 'text', maxLength: 80, admin: { description: 'For example $35/hour, RM 4,800/month, or Not disclosed.' } },
    { name: 'description', type: 'textarea', maxLength: 4000 },
    { name: 'tags', type: 'text', admin: { description: 'Optional tags separated by commas.' } },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { readOnly: true, description: 'Stable public link ID, generated automatically.' } },
    { name: 'internalNotes', type: 'textarea', label: 'Internal notes', access: { read: ({ req }) => Boolean(req.user) }, admin: { description: 'Private to signed-in CMS users. Never shown on the website.' } },
    { name: 'sourceKey', type: 'text', unique: true, access: { read: ({ req }) => Boolean(req.user), update: () => false }, admin: { hidden: true } },
    { name: 'lifecycle', type: 'text', virtual: true, label: 'Listing state', admin: { disableListColumn: true, components: { Field: false, Cell: '/components/admin/CareerLifecycleCell#CareerLifecycleCell' }, disableBulkEdit: true }, hooks: { afterRead: [async ({ data, req }: Parameters<FieldHook>[0]) => {
      if (!req.user || !data?.id) return undefined;
      const record = (await req.payload.find({ collection: 'career-lifecycle', where: { career: { equals: data.id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
      return record?.status ?? 'active';
    }] } },
    { name: 'careerWizardFooter', type: 'ui', admin: { components: { Field: '/components/admin/CareerEditor#CareerEditorFooter' }, disableListColumn: true, disableBulkEdit: true } },
  ] as Field[]).map(field => {
    const name = 'name' in field ? field.name : '';
    const step = CAREER_STEPS.findIndex(section => (section.fields as readonly string[]).includes(name));
    return step < 0 ? field : { ...field, admin: { ...field.admin, className: `masca-career-step masca-career-step-${step}` } } as Field;
  }),
  hooks: {
    beforeDelete: [deleteCareerLifecycle],
    afterDelete: [({ doc }) => { try { revalidatePath('/careers'); } catch { /* Local API has no Next cache. */ } return doc; }],
    beforeValidate: [({ data, originalDoc }) => {
      if (!data) return data;
      // Public links stay stable across title edits and version restores.
      data.slug = originalDoc?.slug || data.slug || `${deriveJobId(data.company || '', data.title || '')}-${randomUUID().slice(0, 8)}`;
      return data;
    }],
    beforeChange: [({ data, originalDoc, req }) => {
      const draft = req.query?.draft === 'true' || req.query?.draft === true;
      if (!draft && data._status === 'published') {
        const errors = careerPublicationErrors({ ...originalDoc, ...data });
        if (Object.keys(errors).length) throw new ValidationError({ collection: 'careers', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
      }
      return data;
    }],
    afterChange: [({ doc }) => { try { revalidatePath('/careers'); } catch { /* Local API has no Next cache. */ } return doc; }],
  },
};
