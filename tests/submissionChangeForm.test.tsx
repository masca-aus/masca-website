// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {SubmissionChangeForm} from '../components/SubmissionChangeForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.history.replaceState(null,'','/');});
it('requires the private link rather than asking for a public listing ID',async()=>{
 render(<SubmissionChangeForm/>);expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByRole('textbox')).toBeNull();
});
it('submits the message against the private token without modifying the listing',async()=>{
 window.history.replaceState(null,'','/#token=private-token');const calls:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));calls.push(body);return {ok:true,json:async()=>body.action==='inspect'?{title:'Community night',open:null}:{message:'Your change request has been received.'}};});
 render(<SubmissionChangeForm/>);const textbox=await screen.findByRole('textbox',{name:'What would you like us to update?'});
 fireEvent.change(textbox,{target:{value:'Please change the venue to the library.'}});fireEvent.click(screen.getByRole('button',{name:'Send change request'}));
 expect(await screen.findByRole('status')).toBeTruthy();expect(calls[1]).toEqual({token:'private-token',action:'submit',message:'Please change the venue to the library.'});
});
it('shows an existing request instead of accepting a second open request',async()=>{
 window.history.replaceState(null,'','/#token=private-token');vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>({title:'Community night',open:{message:'Change the venue please.',createdAt:'2026-10-08'}})}));
 render(<SubmissionChangeForm/>);expect(await screen.findByText('Your request is awaiting review')).toBeTruthy();expect(screen.queryByRole('textbox')).toBeNull();
});
