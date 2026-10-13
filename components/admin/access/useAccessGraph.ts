"use client";
import { useEffect, useState } from "react";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
export function useAccessGraph(initialSnapshot?: AccessGraphSnapshot) {
  const [snapshot, setSnapshot] = useState(initialSnapshot ?? null),
    [loading, setLoading] = useState(!initialSnapshot),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (initialSnapshot) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/workspace-access", { cache: "no-store", signal: c.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error ?? "Could not load access.");
        if (
          !Array.isArray(body.workspaces) ||
          !Array.isArray(body.people) ||
          !Array.isArray(body.memberships)
        )
          throw Error("Access could not be loaded.");
        if (!c.signal.aborted) setSnapshot(body);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load access.");
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [attempt, initialSnapshot]);
  return {
    snapshot,
    loading,
    error,
    retry: () => setAttempt((v) => v + 1),
    applySnapshot: setSnapshot,
  };
}
