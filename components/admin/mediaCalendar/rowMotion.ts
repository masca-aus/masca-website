type Size = { width: number; height: number; tracks: string | null };
const targets =
  ".mc-days, .mc-list > section[data-drop-day], .mc-unscheduled-cards";
function measure(element: HTMLElement): Size {
  const box = element.getBoundingClientRect();
  return {
    width: box.width,
    height: box.height,
    tracks: element.classList.contains("mc-days")
      ? getComputedStyle(element).gridTemplateRows.trim().replace(/\s+/g, " ")
      : null,
  };
}
function trackCount(value: string) {
  const lengths = value.split(" ");
  return lengths.every((v) => /^\d+(?:\.\d+)?px$/.test(v)) ? lengths.length : 0;
}
/** Animate actual layout dimensions; never stretch the text or image cards. */
export function createCalendarRowMotion() {
  let sizes = new Map<HTMLElement, Size>();
  const playing = new Map<HTMLElement, Animation>();
  const stop = (element: HTMLElement) => {
    const animation = playing.get(element);
    playing.delete(element);
    animation?.cancel();
    element.removeAttribute("data-row-resizing");
  };
  return {
    update(root: HTMLElement, enabled: boolean) {
      const elements = Array.from(root.querySelectorAll<HTMLElement>(targets));
      const nextSizes = new Map<HTMLElement, Size>();
      for (const element of playing.keys())
        if (!elements.includes(element)) stop(element);
      for (const element of elements) {
        const previous = sizes.get(element);
        // Read the visible intermediate dimensions before cancelling an old
        // animation, then measure the new natural layout after cancellation.
        const from = playing.has(element) ? measure(element) : previous;
        stop(element);
        const next = measure(element);
        nextSizes.set(element, next);
        if (
          !enabled ||
          !from ||
          !previous ||
          typeof element.animate !== "function" ||
          Math.abs(previous.width - next.width) > 1
        )
          continue;
        let frames: Keyframe[];
        if (from.tracks !== null && next.tracks !== null) {
          const count = trackCount(from.tracks);
          if (
            !count ||
            count !== trackCount(next.tracks) ||
            from.tracks === next.tracks
          )
            continue;
          frames = [
            { gridTemplateRows: from.tracks },
            { gridTemplateRows: next.tracks },
          ];
        } else {
          if (Math.abs(from.height - next.height) < 0.75) continue;
          frames = [
            { height: `${from.height}px` },
            { height: `${next.height}px` },
          ];
        }
        const animation = element.animate(frames, {
          duration: 220,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
        playing.set(element, animation);
        element.dataset.rowResizing = "true";
        const finished = () => {
          if (playing.get(element) !== animation) return;
          playing.delete(element);
          element.removeAttribute("data-row-resizing");
        };
        animation.onfinish = finished;
        animation.oncancel = finished;
      }
      sizes = nextSizes;
    },
    cancel() {
      for (const element of playing.keys()) stop(element);
      sizes.clear();
    },
  };
}
