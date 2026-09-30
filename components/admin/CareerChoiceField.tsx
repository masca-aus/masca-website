'use client';
import {useField} from '@payloadcms/ui';
import type {TextFieldClientComponent,SelectFieldClientComponent} from 'payload';
import {ChoiceSelect} from '@/components/forms/ChoiceSelect';
import {COUNTRIES,INDUSTRIES,stateChoices,AU_STATES} from '@/features/forms/options';
export const CareerChoiceField:TextFieldClientComponent=({path,field,readOnly})=>{
 const {value,setValue,disabled,showError,errorMessage}=useField<string>({path});
 const country=useField<string>({path:'country'});
 const label=typeof field.label==='string'?field.label:field.name.charAt(0).toUpperCase()+field.name.slice(1);
 const options=field.name==='country'?COUNTRIES:field.name==='industry'?INDUSTRIES:stateChoices(country.value);
 return <div className={`field-type ${field.admin?.className||''}`} style={{marginBottom:'1.5rem'}}><ChoiceSelect label={label} value={value||''} options={options} disabled={!!(readOnly||disabled)} required={field.required} error={showError?errorMessage:undefined} onChange={setValue}/></div>;
};
export const EventStateField:SelectFieldClientComponent=({path,field,readOnly})=>{
 const {value,setValue,disabled,showError,errorMessage}=useField<string>({path});
 return <div className={`field-type ${field.admin?.className||''}`} style={{marginBottom:'1.5rem'}}><ChoiceSelect label="State or territory" value={value||''} options={AU_STATES} disabled={!!(readOnly||disabled)} required error={showError?errorMessage:undefined} onChange={setValue}/></div>;
};
