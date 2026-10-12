"use client";
import { PresenceStrip, type PresencePerson } from "./PresenceStrip";
import { useEffect, useState } from "react";
import { api, calendarAPI, RequestError } from "./api";
export function RoomPresence() {
  const [people, setPeople] = useState<PresencePerson[]>([]);
  useEffect(() => {
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    const clientId = crypto.randomUUID();
    const sync = async () => {
      try {
        const result = await api<{ participants: PresencePerson[] }>(
          `${calendarAPI}/collaboration`,
          { clientId, postId: null, cursor: null },
        );
        if (alive)
          setPeople(
            Array.from(
              new Map(result.participants.map((p) => [p.userId, p])).values(),
            ),
          );
      } catch (e) {
        if (alive) setPeople([]);
        if (e instanceof RequestError && [401, 403].includes(e.status)) return;
      }
      if (alive)
        timer = setTimeout(() => void sync(), document.hidden ? 10000 : 4000);
    };
    void sync();
    return () => {
      alive = false;
      clearTimeout(timer);
      void api(`${calendarAPI}/collaboration`, {
        clientId,
        postId: null,
        cursor: null,
        leave: true,
      }).catch(() => {});
    };
  }, []);
  return <PresenceStrip people={people} />;
}
