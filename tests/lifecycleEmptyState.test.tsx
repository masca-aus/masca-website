import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({params:new URLSearchParams(), list:{collectionSlug:'events',data:{docs:[] as unknown[]},query:{search:'',where:{}}}}));
vi.mock('next/navigation',()=>({useSearchParams:()=>state.params}));
vi.mock('@payloadcms/ui',()=>({useListQuery:()=>state.list,Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}));
import { LifecycleEmptyState } from '@/components/admin/LifecycleEmptyState';
beforeEach(()=>{state.params=new URLSearchParams();state.list={collectionSlug:'events',data:{docs:[]},query:{search:'',where:{}}};});
it('explains an empty current event list without fabricating a create permission',()=>{
 const html=renderToStaticMarkup(<LifecycleEmptyState/>);
 expect(html).toContain('No current events'); expect(html).not.toContain('/create');
});
it('shows a useful review empty state',()=>{
 state.params=new URLSearchParams('where[submittedForReview][equals]=true&where[_status][equals]=draft');
 expect(renderToStaticMarkup(<LifecycleEmptyState/>)).toContain('Nothing awaiting review');
});
it('clears a failed search while retaining the branch',()=>{
 state.params=new URLSearchParams('search=missing&where[owningScope][equals]=QLD');state.list.query.search='missing';
 const html=renderToStaticMarkup(<LifecycleEmptyState/>);
 expect(html).toContain('No matching events');expect(html).toContain('Clear search &amp; filters');
 expect(html).toContain('QLD');expect(html).not.toContain('search=missing');
});
it('never replaces a populated list',()=>{state.list.data.docs=[{id:1}];expect(renderToStaticMarkup(<LifecycleEmptyState/>)).toBe('');});
