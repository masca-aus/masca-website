import type { CollectionAfterOperationHook, CollectionBeforeOperationHook, CollectionConfig, PayloadRequest, Where, findOperation } from 'payload';
import { EVENT_STATES } from '../events/eventSubmission.ts';
import { COMMITTEE_DEPARTMENT_OPTIONS } from '../../utils/committeeDepartments.js';
export type SearchCollection = 'events' | 'careers' | 'committee' | 'sponsors';
export const adminSearchFields: Record<SearchCollection, string[]> = {
 events: ['title','organisation','description','venue','streetAddress','venueDetails'],
 careers: ['title','company','city','state','country','industry','description','tags','eligibility'],
 committee: ['name','role','university','course','year'],
 sponsors: ['name'],
};
export const searchTerms = (search: string) => { const words=search.trim().split(/\s+/u).filter(Boolean); return words.filter((word,index)=>words.findIndex(other=>other.toLowerCase()===word.toLowerCase())===index); };
const literal = (word: string) => word.replace(/[\\%_]/g, '\\$&');
export function searchWhere(collection: SearchCollection, search: string): Where {
 const terms=searchTerms(search);
 if (!terms.length) return {};
 return { and: terms.map(word => {
  const or: Where[] = adminSearchFields[collection].map(field => ({ [field]: { contains: literal(word) } }));
  const lower=word.toLocaleLowerCase('en-AU');
  const choices=collection==='committee' ? COMMITTEE_DEPARTMENT_OPTIONS.filter(option => `${option.label} ${option.value}`.toLowerCase().includes(lower)).map(option=>option.value)
   : collection==='events' ? EVENT_STATES.filter(option=>`${option.label} ${option.value}`.toLowerCase().includes(lower)).map(option=>option.value) : [];
  if(choices.length) or.push({[collection==='committee'?'department':'state']:{in:choices}});
  return {or};
 }) };
}
export function rankMatches<T extends Record<string, unknown>>(docs: T[], titleField: string, terms: string[]): T[] {
 const words=terms.map(word=>word.toLocaleLowerCase('en-AU'));
 const phrase=words.join(' ');
 const score=(doc:T) => { const title=String(doc[titleField]??'').toLocaleLowerCase('en-AU'); return (title===phrase?1000:title.includes(phrase)?100:0)+words.filter(word=>title.includes(word)).length; };
 return [...docs].sort((a,b)=>score(b)-score(a));
}
type BaseFilter=NonNullable<NonNullable<CollectionConfig['admin']>['baseFilter']>;
type FindArguments=Parameters<typeof findOperation>[0];
type Plan={collection:SearchCollection;terms:string[];title:string;search:string;rank:boolean};
const pending=new WeakMap<PayloadRequest,Plan>();
const ranking=new WeakMap<object,{plan:Plan;original:FindArguments}>();

/** Add search to the existing list boundary, preserving archive and other filters. */
export function withAdminSearch(collection:SearchCollection, base?:BaseFilter):BaseFilter {
 return async args => {
  const constraint=await base?.(args) || {};
  const search=typeof args.req.query?.search==='string'?args.req.query.search:'';
  const terms=searchTerms(search);
  if(!args.req.user || !terms.length) return constraint;
  const config=args.req.payload.collections[collection].config;
  // An explicit column sort or a saved non-default sort wins over relevance.
  const rank=(!args.req.query?.sort || args.req.query.sort===config.defaultSort) && !args.req.query?.groupBy && (!args.sort || args.sort===config.defaultSort);
  pending.set(args.req,{collection,terms,search,rank,title:collection==='events'||collection==='careers'?'title':'name'});
  return {and:[constraint,searchWhere(collection,search)]};
 };
}
export function removeNativePhrase(where: Where | undefined, collection: SearchCollection, search: string): Where | undefined {
 const last=where?.and?.at(-1);
 const expected=adminSearchFields[collection];
 if(last?.or?.length===expected.length && last.or.every((part,index)=>{
  const keys=Object.keys(part);
  const condition=part[expected[index]];
  return keys.length===1 && condition && typeof condition==='object' && !Array.isArray(condition) && Object.keys(condition).length===1 && 'like' in condition && condition.like===search;
 })) return {...where,and:where!.and!.slice(0,-1)};
 return where;
}
const beforeSearch:CollectionBeforeOperationHook=({args,operation,req})=>{
 const plan=pending.get(req);
 if(operation!=='read'||!plan||args.collection.config.slug!==plan.collection||'id' in args) return;
 pending.delete(req);
 const findArgs=args as FindArguments;
 // Payload appends its phrase search last. The main list uses our cross-field
 // words instead; drawers without a main-list plan retain native search.
 findArgs.where=removeNativePhrase(findArgs.where,plan.collection,plan.search);
 if(!plan.rank) return;
 ranking.set(findArgs,{plan,original:{...findArgs}});
 // Rank lightweight candidates before pagination; hydrate only the requested page.
 findArgs.pagination=false; findArgs.limit=0; findArgs.page=1; findArgs.includeLockStatus=false; findArgs.select={[plan.title]:true};
};
const afterSearch:CollectionAfterOperationHook=async ({args,operation,result,req})=>{
 const state=ranking.get(args);
 if(operation!=='find'||!state) return result;
 ranking.delete(args);
 const {plan,original}=state;
 const found=result as {docs:Array<Record<string,unknown>&{id:string|number}>};
 const docs=rankMatches(found.docs,plan.title,plan.terms);
 const limit=original.limit && original.limit>0 ? original.limit : 10;
 const page=Math.max(1,original.page||1);
 const ids=docs.slice((page-1)*limit,page*limit).map(doc=>doc.id);
 const hydrated=ids.length ? await req.payload.find({collection:plan.collection,req,overrideAccess:original.overrideAccess,draft:original.draft,depth:original.depth,locale:req.locale,fallbackLocale:req.fallbackLocale,
  select:original.select,populate:original.populate,joins:original.joins,includeLockStatus:original.includeLockStatus,showHiddenFields:original.showHiddenFields,trash:original.trash,
  pagination:false,where:{and:[original.where||{},{id:{in:ids}}]},sort:original.sort,
 }) : {docs:[]};
 const ordered=ids.flatMap(id=>hydrated.docs.filter(doc=>doc.id===id));
 const totalPages=Math.max(1,Math.ceil(docs.length/limit));
 return {...result,docs:ordered,totalDocs:docs.length,totalPages,limit,page,pagingCounter:(page-1)*limit+1,hasPrevPage:page>1,hasNextPage:page<totalPages,prevPage:page>1?page-1:null,nextPage:page<totalPages?page+1:null} as typeof result;
};
export const adminSearchHooks={beforeOperation:[beforeSearch],afterOperation:[afterSearch]};
