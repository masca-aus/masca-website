'use client';
import {useEffect,useRef,useState} from 'react';
import {ChoiceSelect} from './ChoiceSelect';
import {COUNTRIES,stateChoices} from '@/features/forms/options';
export function LocationFields({errors}:{errors?:Record<string,string[]>}) {
 const [country,setCountry]=useState('');const [state,setState]=useState('');const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setCountry('');setState('');};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 const notify=()=>requestAnimationFrame(()=>root.current?.querySelector('select')?.dispatchEvent(new Event('change',{bubbles:true})));
 return <div ref={root} className="grid gap-6 md:col-span-2 md:grid-cols-2"><ChoiceSelect label="Country" name="country" required value={country} options={COUNTRIES} error={errors?.country?.[0]} onChange={next=>{setCountry(next);setState('');notify();}}/><ChoiceSelect label="State or region" name="state" value={state} disabled={!country} options={stateChoices(country)} error={errors?.state?.[0]} onChange={next=>{setState(next);notify();}}/></div>;
}
