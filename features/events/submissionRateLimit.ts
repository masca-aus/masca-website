import "server-only";

const HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ACTIVE_KEYS = 1000;
const attemptsByKey = new Map<string, number[]>();

/** Preview only: each process has its own rolling window, reset on restart. */
export function consumeSubmissionAttempt(key: string, now = Date.now()): boolean {
  const cutoff = now - HOUR_MS;
  for (const [storedKey, attempts] of attemptsByKey) {
    const active = attempts.filter((attempt) => attempt > cutoff);
    if (active.length === 0) attemptsByKey.delete(storedKey);
    else attemptsByKey.set(storedKey, active);
  }

  const existingAttempts = attemptsByKey.get(key);
  // Fail closed for new keys at capacity without evicting existing limits.
  if (!existingAttempts && attemptsByKey.size >= MAX_ACTIVE_KEYS) return false;

  const attempts = existingAttempts ?? [];
  if (attempts.length >= MAX_ATTEMPTS) return false;

  attempts.push(now);
  attemptsByKey.set(key, attempts);
  return true;
}
