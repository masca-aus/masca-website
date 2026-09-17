// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EventActionMenu } from '@/components/admin/EventActionMenu';
afterEach(cleanup);
it('supports keyboard navigation and Escape without firing an action', () => {
 const choose = vi.fn();
 render(<EventActionMenu label="Event lifecycle" text="Active" options={[{value:'end',label:'End event'},{value:'archive',label:'Archive event'}]} onChoose={choose} />);
 const trigger = screen.getByRole('button');
 fireEvent.keyDown(trigger,{key:'ArrowDown'});
 expect(document.activeElement).toBe(screen.getByRole('menuitem',{name:'End event'}));
 fireEvent.keyDown(document.activeElement!,{key:'ArrowDown'});
 expect(document.activeElement).toBe(screen.getByRole('menuitem',{name:'Archive event'}));
 fireEvent.keyDown(document.activeElement!,{key:'Escape'});
 expect(screen.queryByRole('menu')).toBeNull(); expect(document.activeElement).toBe(trigger); expect(choose).not.toHaveBeenCalled();
});
it('selects an action once and dismisses outside clicks without selection', () => {
 const choose = vi.fn();
 render(<EventActionMenu label="Event lifecycle" text="Active" options={[{value:'end',label:'End event'}]} onChoose={choose} />);
 fireEvent.click(screen.getByRole('button')); fireEvent.pointerDown(document.body);
 expect(screen.queryByRole('menu')).toBeNull(); expect(choose).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button')); fireEvent.click(screen.getByRole('menuitem'));
 expect(choose).toHaveBeenCalledExactlyOnceWith('end'); expect(screen.queryByRole('menu')).toBeNull();
});
