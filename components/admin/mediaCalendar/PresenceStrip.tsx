"use client";
type Person = {
  userId: string;
  name: string;
  color: string;
  postId?: string | null;
};
export function PresenceStrip({
  people,
  postId,
}: {
  people: Person[];
  postId?: string;
}) {
  const present = Array.from(
    new Map(
      people
        .filter((p) => !postId || p.postId === postId)
        .map((p) => [p.userId, p]),
    ).values(),
  );
  const initials = (name: string) => {
    const words = name.trim().split(/\s+/);
    return (
      words.length > 1 ? words[0][0] + words.at(-1)![0] : name.slice(0, 2)
    ).toUpperCase();
  };
  return (
    <div
      className={postId ? "mc-presence" : "mc-room-presence"}
      aria-label={
        postId
          ? "People viewing this post"
          : "People online in the media calendar"
      }
    >
      {present.slice(0, 5).map((p) => (
        <span key={p.userId} title={p.name} style={{ background: p.color }}>
          {initials(p.name)}
        </span>
      ))}
      {present.length > 5 && (
        <span title={`${present.length - 5} more people`}>
          +{present.length - 5}
        </span>
      )}
      {(postId || present.length > 0) && (
        <small>
          {postId
            ? present.length > 1
              ? `${present.length} people in this post`
              : present.length === 1
                ? "Only you here for now"
                : "Connecting…"
            : `${present.length} online`}
        </small>
      )}
    </div>
  );
}
