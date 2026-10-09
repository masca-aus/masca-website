"use client";
import { useEffect, useState } from "react";
import { api, calendarAPI, RequestError } from "./api";
type Person = { userId: string; name: string; color: string };
export function RoomPresence() {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    const clientId = crypto.randomUUID();
    const sync = async () => {
      try {
        const result = await api<{ participants: Person[] }>(
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
  return (
    <div
      className="mc-room-presence"
      aria-label="People online in the media calendar"
    >
      {people.slice(0, 5).map((p) => (
        <span key={p.userId} title={p.name} style={{ background: p.color }}>
          {p.name.slice(0, 2).toUpperCase()}
        </span>
      ))}
      {people.length > 0 && <small>{people.length} online</small>}
    </div>
  );
}
