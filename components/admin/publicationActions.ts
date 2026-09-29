/** Publication actions are distinct from approval and archival state. */
export function publicationActions(status: string) {
  if (status === 'draft') return [{ value: 'published', label: 'Publish' }];
  return [
    ...(status === 'changed' ? [{ value: 'published', label: 'Publish changes' }] : []),
    { value: 'draft', label: 'Unpublish' },
  ];
}
