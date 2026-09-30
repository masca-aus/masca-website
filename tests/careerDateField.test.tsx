// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { CareerDateField, careerCalendarDate, careerCalendarValue } from '../components/admin/CareerDateField';
const setValue = vi.fn();
vi.mock('@payloadcms/ui', () => ({ useField: () => ({ value: '2026-09-30', setValue, disabled: false }) }));
afterEach(() => { cleanup(); setValue.mockClear(); });
it('round trips calendar days without changing them into UTC timestamps', () => {
 expect(careerCalendarValue(careerCalendarDate('2026-09-30')!)).toBe('2026-09-30');
 expect(careerCalendarDate('2026-02-30')).toBeNull();
});
it('uses a calendar trigger instead of free text and allows rolling applications', () => {
 render(<CareerDateField {...({ path: 'closes', field: { label: 'Closing date' } } as ComponentProps<typeof CareerDateField>)} />);
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(screen.getByRole('button', { name: 'Choose closing date' })).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Use rolling applications' }));
 expect(setValue).toHaveBeenCalledWith('');
});
