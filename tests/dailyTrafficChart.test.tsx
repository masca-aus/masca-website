// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DailyTrafficChart } from '@/components/admin/DailyTrafficChart';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const props = { since:'2026-10-01T02:00:00Z', until:'2026-10-03T02:00:00Z', rows:[
  {timestamp:'2026-10-01T00:00:00Z',pageviews:20,visitors:10},
  {timestamp:'2026-10-03T00:00:00Z',pageviews:0,visitors:0},
] };
it('inspects dates with arrow keys, distinguishes missing days and zero, and dismisses with Escape', () => {
 render(<DailyTrafficChart {...props}/>);
 const chart = screen.getAllByRole('slider', {name:'Daily traffic by date'})[0];
 fireEvent.focus(chart);
 expect(chart.getAttribute('aria-valuetext')).toContain('0 page views, 0 visitors');
 fireEvent.keyDown(chart,{key:'ArrowLeft'});
 expect(chart.getAttribute('aria-valuetext')).toContain('Unavailable');
 fireEvent.keyDown(chart,{key:'Home'});
 expect(chart.getAttribute('aria-valuetext')).toContain('20 page views, 10 visitors');
 expect(screen.getAllByRole('tooltip')[0].textContent).toContain('Partial day');
 fireEvent.keyDown(chart,{key:'Escape'});
 expect(screen.queryByRole('tooltip')).toBeNull();
});
it('maps pointer positions to dates, clamps the edges and clears hover on leave', () => {
 // jsdom lacks PointerEvent; use MouseEvent coordinates for the pointer event shape.
 vi.stubGlobal('PointerEvent', MouseEvent);
 const {unmount}=render(<DailyTrafficChart {...props}/>);
 const chart=screen.getAllByRole('slider')[0];
 vi.spyOn(chart,'getBoundingClientRect').mockReturnValue({left:100,width:720,top:0,height:244,right:820,bottom:244,x:100,y:0,toJSON:()=>({})});
 fireEvent.pointerMove(chart,{clientX:100});
 expect(chart.getAttribute('aria-valuetext')).toContain('20 page views');
 fireEvent.pointerMove(chart,{clientX:467});
 expect(chart.getAttribute('aria-valuetext')).toContain('Unavailable');
 fireEvent.pointerMove(chart,{clientX:900});
 expect(chart.getAttribute('aria-valuetext')).toContain('0 page views');
 fireEvent.pointerLeave(chart);
 expect(screen.queryByRole('tooltip')).toBeNull();
 unmount(); vi.unstubAllGlobals();
});
it('keeps the exact-value table available and does not add controls to failed or empty charts', () => {
 const {rerender}=render(<DailyTrafficChart {...props}/>);
 expect(screen.getByText('View daily data')).toBeTruthy();
 rerender(<DailyTrafficChart {...props} rows={[]}/>);
 expect(screen.queryByRole('slider')).toBeNull();
 rerender(<DailyTrafficChart {...props} rows={null}/>);
 expect(screen.queryByRole('slider')).toBeNull();
 expect(screen.getByRole('status').textContent).toContain('unavailable');
});
it('retains a touch readout after lifting a finger and clears it on blur', () => {
 class TouchPointerEvent extends MouseEvent { pointerType = 'touch'; }
 vi.stubGlobal('PointerEvent', TouchPointerEvent);
 render(<DailyTrafficChart {...props}/>);
 const chart=screen.getAllByRole('slider')[0];
 vi.spyOn(chart,'getBoundingClientRect').mockReturnValue({left:0,width:720,top:0,height:244,right:720,bottom:244,x:0,y:0,toJSON:()=>({})});
 fireEvent.pointerDown(chart,{clientX:42});
 expect(chart.getAttribute('aria-valuetext')).toContain('20 page views');
 fireEvent.pointerLeave(chart);
 expect(screen.getAllByRole('tooltip')[0].textContent).toContain('20');
 fireEvent.blur(chart);
 expect(screen.queryByRole('tooltip')).toBeNull();
 vi.unstubAllGlobals();
});
it('opens and closes the daily table without removing its data or moving focus', () => {
 render(<DailyTrafficChart {...props}/>);
 const toggle=screen.getByRole('button',{name:'View daily data'});
 const panel=document.getElementById(toggle.getAttribute('aria-controls')!)!;
 expect(toggle.getAttribute('aria-expanded')).toBe('false');
 expect(panel.getAttribute('aria-hidden')).toBe('true');
 expect(screen.queryByRole('table')).toBeNull();
 toggle.focus(); fireEvent.click(toggle);
 expect(toggle.getAttribute('aria-expanded')).toBe('true');
 expect(screen.getByRole('table').textContent).toContain('Unavailable');
 expect(document.activeElement).toBe(toggle);
 fireEvent.click(toggle);
 expect(panel.getAttribute('aria-hidden')).toBe('true');
 expect(panel.querySelector('table')).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
});
