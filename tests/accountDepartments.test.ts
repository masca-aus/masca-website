import { describe, expect, it } from 'vitest';
import type { Field } from 'payload';
import { configureWorkspace } from '@/features/access/configureWorkspace';
const users = configureWorkspace([{ slug: 'users', fields: [] }])[0];
const member = { id: 1, email: 'member@masca.org.au', status: 'active', role: 'editor', grants: [], departments: ['chairs'] };
describe('account department assignments', () => {
  it('offers optional multiple departments and restricts assignment to active administrators', async () => {
    const fields = users.fields.flatMap((field: Field) => 'fields' in field ? field.fields : [field]);
    const field = fields.find((field: Field) => 'name' in field && field.name === 'departments');
    expect(field).toMatchObject({ type: 'select', hasMany: true });
    if (!field || !('access' in field)) throw new Error('Missing department access');
    expect(await field.access?.update?.({ req: { user: member } } as never)).toBe(false);
    expect(await field.access?.create?.({ req: { user: { ...member, role: 'administrator' } } } as never)).toBe(true);
    expect(await field.access?.update?.({ req: { user: { ...member, role: 'administrator', status: 'suspended' } } } as never)).toBe(false);
    expect(field).not.toHaveProperty('required', true);
  });
});
