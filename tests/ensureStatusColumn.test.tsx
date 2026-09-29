// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EnsureStatusColumn } from '@/components/admin/EnsureStatusColumn';
const h = vi.hoisted(() => ({ columns: [{ accessor: 'title', active: true }, { accessor: 'cmsStatus', active: false }], toggleColumn: vi.fn() }));
vi.mock('@payloadcms/ui', () => ({ useTableColumns: () => h }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('adds the unified status to old preferences without resetting other columns', () => {
 const view = render(<EnsureStatusColumn />);
 view.rerender(<EnsureStatusColumn />);
 expect(h.toggleColumn).toHaveBeenCalledExactlyOnceWith('cmsStatus');
});
it('leaves an existing unified status column alone', () => {
 h.columns = [{ accessor: 'title', active: true }, { accessor: 'cmsStatus', active: true }];
 render(<EnsureStatusColumn />);
 expect(h.toggleColumn).not.toHaveBeenCalled();
});
