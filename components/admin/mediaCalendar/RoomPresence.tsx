"use client";
import {
  PresenceStrip,
  type PresencePerson,
  type CollaborationConnection,
} from "./PresenceStrip";
import { useEffect, useState } from "react";
import { api, calendarAPI, RequestError } from "./api";
export function RoomPresence() {
  const [people, setPeople] = useState<PresencePerson[]>([]);
  const [connection, setConnection] =
    useState<CollaborationConnection>("connecting");
  useEffect(() => {
    let alive = true,
      timer: ReturnType<typeof setTimeout>,
      stale: ReturnType<typeof setTimeout>;
    const clientId = crypto.randomUUID();
    const sync = async () => {
      try {
        const result = await api<{ participants: PresencePerson[] }>(
          `${calendarAPI}/collaboration`,
          { clientId, postId: null, cursor: null },
        );
        if (alive) {
          setConnection("live");
          clearTimeout(stale);
          stale = setTimeout(() => {
            if (alive) {
              setPeople([]);
              setConnection("reconnecting");
            }
          }, 15000);
          setPeople(result.participants);
        }
      } catch (e) {
        clearTimeout(stale);
        if (alive) {
          setPeople([]);
          setConnection(
            e instanceof RequestError && [401, 403].includes(e.status)
              ? "unavailable"
              : "reconnecting",
          );
        }
        if (e instanceof RequestError && [401, 403].includes(e.status)) return;
      }
      if (alive)
        timer = setTimeout(() => void sync(), document.hidden ? 10000 : 4000);
    };
    void sync();
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(stale);
      void api(`${calendarAPI}/collaboration`, {
        clientId,
        postId: null,
        cursor: null,
        leave: true,
      }).catch(() => {});
    };
  }, []);
  return <PresenceStrip people={people} connection={connection} />;
}
