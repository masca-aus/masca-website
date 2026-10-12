/** Remove private drafts on logout without disturbing unrelated browser preferences. */
export function clearCalendarRecovery(storage: Storage) {
  try {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    for (const key of keys)
      if (key?.startsWith("masca-caption:") || key?.startsWith("masca-calendar-deleted-copy:"))
        storage.removeItem(key);
  } catch {
    // A browser that denies storage access must still allow sign-out.
  }
}
