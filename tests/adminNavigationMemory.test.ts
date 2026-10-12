import { describe, expect, it } from 'vitest';
import { createAdminNavigationMemory } from '@/components/admin/adminNavigation';

describe('returning to CMS lists', () => {
  it('remembers the exact branch, filters, page and scroll without caching records', () => {
    const memory = createAdminNavigationMemory();
    memory.remember('/admin/collections/events?branch=QLD&page=3&where[_status][equals]=draft', 420);
    expect(memory.get('/admin/collections/events')).toEqual({ href: '/admin/collections/events?branch=QLD&page=3&where[_status][equals]=draft', scrollY: 420 });
    memory.remember('/admin?branch=NSW&view=metrics', 80);
    expect(memory.get('/admin')).toEqual({ href: '/admin?branch=NSW&view=metrics', scrollY: 80 });
  });
  it('does not replace explicit filters or reuse a different collection or session', () => {
    const memory = createAdminNavigationMemory();
    memory.remember('/admin/collections/events?page=3', 100);
    expect(memory.get('/admin/collections/events?where[_status][equals]=published')).toBeUndefined();
    expect(memory.get('/admin/collections/careers')).toBeUndefined();
    expect(createAdminNavigationMemory().get('/admin/collections/events')).toBeUndefined();
  });
  it('ignores editor and authentication URLs and updates the latest list visit', () => {
    const memory = createAdminNavigationMemory();
    memory.remember('/admin/collections/events/17', 200);
    memory.remember('/admin/logout', 0);
    expect(memory.get('/admin/collections/events')).toBeUndefined();
    expect(memory.get('/admin/logout')).toBeUndefined();
    memory.remember('/admin/collections/events?page=3', 300);
    memory.remember('/admin/collections/events?page=1', 0);
    expect(memory.get('/admin/collections/events')).toEqual({ href:'/admin/collections/events?page=1', scrollY:0 });
  });
});
