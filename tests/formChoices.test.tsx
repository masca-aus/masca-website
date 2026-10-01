// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {PublicChoice} from '../components/forms/ChoiceSelect';
import {LocationFields} from '../components/forms/LocationFields';
import {COUNTRIES,INDUSTRIES} from '../features/forms/options';
afterEach(cleanup);
it('searches categories and serializes the selected value',()=>{
 const {container}=render(<form><PublicChoice label="Industry" name="industry" options={INDUSTRIES}/></form>);
 fireEvent.click(screen.getByRole('combobox',{name:'Industry'}));fireEvent.change(screen.getByRole('textbox',{name:'Search Industry'}),{target:{value:'Engineering'}});
 fireEvent.click(screen.getByRole('option',{name:'Engineering'}));expect(new FormData(container.querySelector('form')!).get('industry')).toBe('Engineering');
 fireEvent.reset(container.querySelector('form')!);expect(new FormData(container.querySelector('form')!).get('industry')).toBe('');
});
it('country changes clear the public state and show the matching options',()=>{
 const {container}=render(<form><LocationFields/></form>);
 fireEvent.click(screen.getByRole('combobox',{name:'Country *'}));fireEvent.click(screen.getByRole('option',{name:'Australia'}));
 fireEvent.click(screen.getByRole('combobox',{name:'State or region'}));fireEvent.click(screen.getByRole('option',{name:'Queensland'}));
 expect(new FormData(container.querySelector('form')!).get('state')).toBe('QLD');
 fireEvent.click(screen.getByRole('combobox',{name:'Country *'}));fireEvent.click(screen.getByRole('option',{name:'Malaysia'}));
 expect(new FormData(container.querySelector('form')!).get('state')).toBe('');
 fireEvent.click(screen.getByRole('combobox',{name:'State or region'}));expect(screen.getByRole('option',{name:'Selangor'})).toBeTruthy();expect(screen.queryByRole('option',{name:'Queensland'})).toBeNull();
});
it('preserves pre-existing values outside the suggested categories',()=>{
 const {container}=render(<form><PublicChoice label="Country" name="country" defaultValue="Singapore" options={COUNTRIES}/></form>);
 expect(new FormData(container.querySelector('form')!).get('country')).toBe('Singapore');
});
it('opens upward near the bottom and constrains the complete panel',()=>{
 const {container}=render(<PublicChoice label="Industry" options={INDUSTRIES}/>);
 const button=screen.getByRole('combobox',{name:'Industry'});
 button.getBoundingClientRect=()=>({top:window.innerHeight-70,bottom:window.innerHeight-20,left:20,right:320,width:300,height:50,x:20,y:window.innerHeight-70,toJSON(){}});
 fireEvent.click(button);
 const panel=container.querySelector<HTMLElement>('.masca-choice__panel')!;
 expect(panel.dataset.above).toBe('true');
 expect(parseFloat(panel.style.maxHeight)).toBeLessThanOrEqual(340);
 expect(panel.style.top).toBe('auto');
});
