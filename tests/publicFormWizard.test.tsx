// @vitest-environment jsdom
import React, { useRef } from 'react';
import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PublicFormWizard } from '../components/forms/PublicFormWizard';
afterEach(cleanup);
function Example({submit}:{submit:()=>void}) {const ref=useRef<HTMLFormElement>(null);return <PublicFormWizard innerRef={ref} steps={['Details']} action="/test" pending={false} response={null} onSubmit={submit}><fieldset><label htmlFor="title">Title</label><input id="title" name="title" required/></fieldset><button type="submit">Send</button></PublicFormWizard>;}
it('requires the current fields and reviews before sending', async()=>{
 const submit=vi.fn();render(<Example submit={submit}/>);
 fireEvent.click(screen.getByText('Continue →'));expect(screen.queryByText('Check your details')).toBeNull();expect(submit).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'A community opportunity'}});
 fireEvent.click(screen.getByText('Continue →'));
 expect(screen.getByText('Check your details')).toBeTruthy();expect(screen.getByText('A community opportunity')).toBeTruthy();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Back'));await waitFor(()=>expect(screen.getByLabelText('Title').getAttribute('name')).toBe('title'));
 expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('A community opportunity');
 fireEvent.click(screen.getByText('Continue →'));fireEvent.click(screen.getByText('Send'));expect(submit).toHaveBeenCalledOnce();
});
