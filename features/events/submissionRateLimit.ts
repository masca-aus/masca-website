import "server-only";

const HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptsByKey = new Map<string, number[]>();

/** Preview only: each process has its own rolling window, reset on restart. */
export function consumeSubmissionAttempt(key: string, now = Date.now()): boolean {
  const cutoff = now - HOUR_MS;
  for (const [storedKey, attempts] of attemptsByKey) {
    const active = attempts.filter((attempt) => attempt > cutoff);
    if (active.length === 0) attemptsByKey.delete(storedKey);
    else attemptsByKey.set(storedKey, active);
  }

  const attempts = attemptsByKey.get(key) ?? [];
  if (attempts.length >= MAX_ATTEMPTS) return false;

  attempts.push(now);
  attemptsByKey.set(key, attempts);
  return true;
}
