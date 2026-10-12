// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createCalendarRowMotion } from "../../components/admin/mediaCalendar/rowMotion";
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function fixture(kind: "grid" | "list" | "ideas" = "grid") {
  const root = document.createElement("div"),
    el = document.createElement(kind === "list" ? "section" : "div");
  if (kind === "list") {
    const list = document.createElement("div");
    list.className = "mc-list";
    el.dataset.dropDay = "2026-10-13";
    list.append(el);
    root.append(list);
  } else {
    el.className = kind === "grid" ? "mc-days" : "mc-unscheduled-cards";
    root.append(el);
  }
  document.body.append(root);
  Object.assign(el.dataset, {
    rows: "120px 150px",
    height: "150",
    width: "700",
  });
  // jsdom does not compute grid tracks or animate layouts. Substitute only
  // those browser boundaries, keeping the controller and DOM selection real.
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    (node) =>
      ({
        gridTemplateRows:
          (node as HTMLElement).dataset.visibleRows ??
          (node as HTMLElement).dataset.rows,
      }) as CSSStyleDeclaration,
  );
  el.getBoundingClientRect = () => ({
    height: Number(el.dataset.visibleHeight ?? el.dataset.height),
    width: Number(el.dataset.width),
    top: 0,
    left: 0,
    right: 700,
    bottom: 150,
    x: 0,
    y: 0,
    toJSON() {},
  });
  const calls: {
    frames: Keyframe[];
    options: KeyframeAnimationOptions;
    animation: Animation;
  }[] = [];
  el.animate = (frames, options) => {
    const animation = {
      onfinish: null as Animation["onfinish"],
      oncancel: null as Animation["oncancel"],
      cancel() {
        delete el.dataset.visibleRows;
        delete el.dataset.visibleHeight;
        animation.oncancel?.call(animation, {} as AnimationPlaybackEvent);
      },
    } as unknown as Animation;
    calls.push({
      frames: frames as Keyframe[],
      options: options as KeyframeAnimationOptions,
      animation,
    });
    return animation;
  };
  return { root, el, calls };
}
it("animates the measured grid tracks when a dropped card grows a row, then releases the layout", () => {
  const { root, el, calls } = fixture(),
    motion = createCalendarRowMotion();
  motion.update(root, true);
  expect(calls).toHaveLength(0);
  el.dataset.rows = "240px 150px";
  motion.update(root, true);
  expect(calls[0].frames).toEqual([
    { gridTemplateRows: "120px 150px" },
    { gridTemplateRows: "240px 150px" },
  ]);
  expect(el.dataset.rowResizing).toBe("true");
  calls[0].animation.onfinish?.call(
    calls[0].animation,
    {} as AnimationPlaybackEvent,
  );
  expect(el.hasAttribute("data-row-resizing")).toBe(false);
  expect(el.style.gridTemplateRows).toBe("");
});
it.each(["list", "ideas"] as const)(
  "smoothly shrinks %s rows without scaling their cards",
  (kind) => {
    const { root, el, calls } = fixture(kind),
      motion = createCalendarRowMotion();
    motion.update(root, true);
    el.dataset.height = "90";
    motion.update(root, true);
    expect(calls[0].frames).toEqual([{ height: "150px" }, { height: "90px" }]);
    expect(calls[0].options.duration).toBeGreaterThan(0);
    expect(el.style.transform).toBe("");
  },
);
it("continues an interrupted expansion from its current visible tracks", () => {
  const { root, el, calls } = fixture(),
    motion = createCalendarRowMotion();
  motion.update(root, true);
  el.dataset.rows = "240px 150px";
  motion.update(root, true);
  el.dataset.visibleRows = "180px 150px";
  el.dataset.rows = "330px 150px";
  motion.update(root, true);
  expect(calls[1].frames).toEqual([
    { gridTemplateRows: "180px 150px" },
    { gridTemplateRows: "330px 150px" },
  ]);
  // A late callback from the replaced animation must not end the newer one.
  calls[0].animation.onfinish?.call(
    calls[0].animation,
    {} as AnimationPlaybackEvent,
  );
  expect(el.dataset.rowResizing).toBe("true");
  motion.cancel();
  expect(el.hasAttribute("data-row-resizing")).toBe(false);
});
it("keeps natural sizing when motion is disabled or the browser lacks animations", () => {
  const { root, el, calls } = fixture(),
    motion = createCalendarRowMotion();
  motion.update(root, false);
  el.dataset.rows = "240px 150px";
  motion.update(root, false);
  expect(calls).toHaveLength(0);
  Object.defineProperty(el, "animate", { value: undefined });
  el.dataset.rows = "330px 150px";
  expect(() => motion.update(root, true)).not.toThrow();
  expect(el.hasAttribute("data-row-resizing")).toBe(false);
});
it("does not animate a width change or a different number of calendar rows", () => {
  const { root, el, calls } = fixture(),
    motion = createCalendarRowMotion();
  motion.update(root, true);
  el.dataset.width = "600";
  el.dataset.rows = "200px 160px";
  motion.update(root, true);
  el.dataset.rows = "200px 160px 120px";
  motion.update(root, true);
  expect(calls).toHaveLength(0);
});
