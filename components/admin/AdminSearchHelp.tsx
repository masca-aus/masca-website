'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
const hints: Record<string,string> = {
 events:'Search events, organisations, descriptions or locations',
 careers:'Search jobs, companies, locations, industries or tags',
 committee:'Search names, roles, departments or universities',
 sponsors:'Search sponsor names',
};
export function AdminSearchHelp() {
 const pathname=usePathname();
 useEffect(()=>{
  const label=hints[pathname.split('/')[3]];
  if(!label) return;
  const update=()=>{
   const input=document.querySelector<HTMLInputElement>('#search-filter-input');
   if(input && input.placeholder!==label) input.placeholder=label;
   if(input && input.getAttribute('aria-label')!==label) input.setAttribute('aria-label',label);
  };
  update();
  const observer=new MutationObserver(update);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['placeholder','aria-label']});
  return ()=>observer.disconnect();
 },[pathname]);
 return null;
}
