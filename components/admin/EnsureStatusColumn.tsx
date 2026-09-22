'use client';
import { useEffect, useRef } from 'react';
import { useTableColumns } from '@payloadcms/ui';

/** Carry existing users' column preferences forward to the simplified status. */
export function EnsureStatusColumn() {
  const { columns, toggleColumn } = useTableColumns();
  const attempted = useRef(false);
  useEffect(() => {
    const status = columns.find(column => column.accessor === 'cmsStatus');
    if (!attempted.current && status && !status.active) {
      attempted.current = true;
      void toggleColumn('cmsStatus');
    }
  }, [columns, toggleColumn]);
  return null;
}
