import { expect, it } from 'vitest';
import { eventListHref, eventListSelection } from '@/components/admin/eventListNavigation';
it('keeps search, branch and sort when switching view, resetting pagination and conflicting status', () => {
 const query = new URLSearchParams('search=welcome&page=4&sort=-updatedAt&where[owningScope][equals]=QLD&where[_status][equals]=published');
 const next = new URL(eventListHref(query, { view:'review' }), 'https://cms.example');
 expect(next.searchParams.get('search')).toBe('welcome');
 expect(next.searchParams.get('where[owningScope][equals]')).toBe('QLD');
 expect(next.searchParams.get('sort')).toBe('-updatedAt');
 expect(next.searchParams.has('page')).toBe(false);
 expect(eventListSelection(next.searchParams).view).toBe('review');
 expect(next.searchParams.get('where[_status][equals]')).toBe('draft');
});
it('can leave a dashboard queue without retaining stale archived exclusions or status filters', () => {
 const query = new URLSearchParams('where[and][0][id][not_in][0]=4&where[and][0][id][not_in][1]=-1&where[and][1][owningScope][in][0]=VIC&where[_status][equals]=draft&where[submittedForReview][equals]=true');
 const next = new URL(eventListHref(query, { view:'archived' }), 'https://cms.example').searchParams;
 expect(next.get('where[and][1][owningScope][in][0]')).toBe('VIC');
 expect([...next.keys()].some(key => key.includes('[id]'))).toBe(false);
 expect(next.has('where[submittedForReview][equals]')).toBe(false);
 expect(next.has('where[_status][equals]')).toBe(false);
 expect(eventListSelection(next)).toMatchObject({view:'archived',branch:'VIC',status:'all'});
});
it('replaces nested branch filters deliberately while preserving search and status', () => {
 const query = new URLSearchParams('search=hello&where[and][1][owningScope][in][0]=VIC&where[_status][equals]=draft');
 const next=new URL(eventListHref(query,{branch:'QLD'}),'https://cms.example').searchParams;
 expect(eventListSelection(next)).toMatchObject({branch:'QLD',status:'draft'});
 expect(next.get('search')).toBe('hello');
 expect([...next.keys()].filter(key=>key.includes('[owningScope]'))).toEqual(['where[owningScope][equals]']);
});
it('clears search and extra filters without losing the branch or archived view', () => {
 const next=new URL(eventListHref(new URLSearchParams('eventView=archived&search=hi&page=4&where[owningScope][equals]=NSW&where[title][contains]=hi'),{clear:true}),'https://cms.example').searchParams;
 expect(eventListSelection(next)).toMatchObject({view:'archived',branch:'NSW'});
 expect(next.has('search')).toBe(false);
 expect(next.has('where[title][contains]')).toBe(false);
});
