export const ANNIVERSARY_REPLAY_EVENT = "masca:replay-anniversary";

let pendingReplay = false;

export function requestAnniversaryReplay() {
  pendingReplay = true;
  window.dispatchEvent(new Event(ANNIVERSARY_REPLAY_EVENT));
}

export function subscribeAnniversaryReplay(onReplay: () => void) {
  let active = true;
  const replay = () => {
    pendingReplay = false;
    onReplay();
  };
  window.addEventListener(ANNIVERSARY_REPLAY_EVENT, replay);
  if (pendingReplay) {
    // Deliver an early click after subscription, including Strict Mode setup.
    queueMicrotask(() => {
      if (active && pendingReplay) replay();
    });
  }
  return () => {
    active = false;
    window.removeEventListener(ANNIVERSARY_REPLAY_EVENT, replay);
  };
}
