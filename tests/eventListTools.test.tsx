// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({params:new URLSearchParams('search=welcome&where[owningScope][equals]=QLD&page=3'),push:vi.fn()}));
vi.mock('next/navigation',()=>({useSearchParams:()=>state.params,useRouter:()=>({push:state.push}),usePathname:()=>'/admin/collections/events'}));
vi.mock('@payloadcms/ui',()=>({useAuth:()=>({user:{id:1}})}));
vi.mock('@/components/admin/ListingTutorial',()=>({ListingTutorial:()=>null}));
vi.mock('@/components/admin/EnsureStatusColumn',()=>({EnsureStatusColumn:()=>null}));
vi.mock('next/dynamic',()=>({default:()=>function Report(){return <div>Report panel mounted</div>}}));
import { EventListTools } from '@/components/admin/EventListTools';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('changes a branch through the keyboard-accessible picker without losing search',()=>{
 render(<EventListTools/>);
 fireEvent.click(screen.getByRole('combobox',{name:/Branch/}));
 fireEvent.click(screen.getByRole('option',{name:'Victoria'}));
 const query=new URL(state.push.mock.calls[0][0],'https://cms.example').searchParams;
 expect(query.get('where[owningScope][equals]')).toBe('VIC');expect(query.get('search')).toBe('welcome');expect(query.has('page')).toBe(false);
});
it('does not mount report tools until requested and keeps them mounted after closing',()=>{
 render(<EventListTools/>);
 expect(screen.queryByText('Report panel mounted')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Reports'}));expect(screen.getByText('Report panel mounted')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Reports'}));expect(screen.getByText('Report panel mounted')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Reports'}).getAttribute('aria-expanded')).toBe('false');
});
