// @vitest-environment jsdom
import React from 'react';import {it,expect,afterEach,vi} from 'vitest';import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {PeopleAccess} from '../components/admin/PeopleAccess';import {accessFixture} from './helpers/accessFixture';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('opens the authorised inline access overview from the CMS page',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json({...accessFixture,viewer:{id:'1',create:false,configure:false,appoint:false},workspaces:[accessFixture.workspaces[0]]}));
 render(<PeopleAccess/>);fireEvent.click(await screen.findByRole('button',{name:'Open MASA'}));expect(screen.getByRole('heading',{name:'Events'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Open Queensland'})).toBeNull();
});
