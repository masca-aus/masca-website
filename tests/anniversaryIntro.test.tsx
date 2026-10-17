// @vitest-environment jsdom
import { StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import AnniversaryIntro from "@/components/AnniversaryIntro";

const imageRequests: { src: string; onload: null | (() => void) }[] = [];
const replayIntro = () => act(() => { window.dispatchEvent(new Event("masca:replay-anniversary")); });

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  imageRequests.length = 0;
  // Browser image loading is an external boundary; tests control when it finishes.
  vi.stubGlobal("Image", class {
    src = "";
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    constructor() { imageRequests.push(this); }
    decode() { return Promise.resolve(); }
    removeAttribute() { this.src = ""; }
  });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  // JSDOM does not implement native modal dialogs.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    } },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

it("leaves a first homepage visit immediately accessible without loading intro photos", () => {
  document.documentElement.style.overflow = "auto";
  const view = render(<AnniversaryIntro />);
  act(() => vi.advanceTimersByTime(3000));
  expect(view.container.querySelector("dialog")).toBeNull();
  expect(imageRequests).toHaveLength(0);
  expect(document.documentElement.style.overflow).toBe("auto");
});

it("finishes a requested animation in 2.4 seconds and restores scrolling without an animation-end event", () => {
  document.documentElement.style.overflow = "auto";
  render(<AnniversaryIntro />);
  replayIntro();
  expect(screen.queryByRole("dialog", { name: /25th anniversary/i })).not.toBeNull();
  expect(screen.queryByRole("button", { name: /skip intro/i })).toBeNull();
  expect(document.documentElement.style.overflow).toBe("hidden");
  act(() => vi.advanceTimersByTime(2399));
  expect(screen.queryByRole("dialog")).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.documentElement.style.overflow).toBe("auto");
});

it("cleans up after native dismissal and does not replay when returning", () => {
  const first = render(<AnniversaryIntro />);
  replayIntro();
  act(() => { (screen.getByRole("dialog") as HTMLDialogElement).close(); });
  expect(screen.queryByRole("dialog")).toBeNull();
  first.unmount();
  imageRequests.length = 0;
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(imageRequests).toHaveLength(0);
});

it("bypasses the intro for reduced motion", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(imageRequests).toHaveLength(0);
});

it("leaves the homepage accessible when browser storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("keeps direct links to homepage sections unobstructed", () => {
  window.history.replaceState(null, "", "/#states");
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("cleans up scrolling and timers when leaving the homepage during the intro", () => {
  document.documentElement.style.overflow = "auto";
  const view = render(<AnniversaryIntro />);
  replayIntro();
  view.unmount();
  act(() => vi.advanceTimersByTime(0));
  expect(document.documentElement.style.overflow).toBe("auto");
  expect(vi.getTimerCount()).toBe(0);
});

it("still plays once when React checks effects twice in development", () => {
  render(<StrictMode><AnniversaryIntro /></StrictMode>);
  replayIntro();
  expect(screen.queryByRole("dialog")).not.toBeNull();
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("ignores a queued close event from the first Strict Mode effect", () => {
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
      window.setTimeout(() => this.dispatchEvent(new Event("close")), 0);
    },
  });
  render(<StrictMode><AnniversaryIntro /></StrictMode>);
  replayIntro();
  act(() => vi.advanceTimersByTime(1));
  expect(document.documentElement.style.overflow).toBe("hidden");
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("does not render an open overlay before JavaScript runs", () => {
  const html = renderToStaticMarkup(<AnniversaryIntro />);
  expect(html).not.toMatch(/<dialog[^>]*\sopen(?:[\s=>])/);
});

it("shows the anniversary immediately and only adds collage photos after decoding", async () => {
  const view = render(<AnniversaryIntro />);
  replayIntro();
  expect(screen.queryByRole("heading", { name: "25 years" })).not.toBeNull();
  expect(view.container.querySelectorAll('img[src^="/community/"]')).toHaveLength(0);
  const firstLoad = imageRequests[0]?.onload;
  expect(firstLoad).toBeTypeOf("function");
  await act(async () => { firstLoad?.(); });
  expect(view.container.querySelectorAll('img[src^="/community/"]')).toHaveLength(1);
  act(() => { (screen.getByRole("dialog") as HTMLDialogElement).close(); });
  const beforeLateLoad = view.container.querySelectorAll('img[src^="/community/"]').length;
  await act(async () => { firstLoad?.(); });
  expect(view.container.querySelectorAll('img[src^="/community/"]')).toHaveLength(beforeLateLoad);
});

it("keeps the photo reveal inside a valid, separate SVG digit cutout", async () => {
  const view = render(<AnniversaryIntro />);
  replayIntro();
  await act(async () => { imageRequests[0]?.onload?.(); });
  const photo = view.container.querySelector("svg image")!;
  const cutoutGroup = photo.closest("[clip-path]")!;
  expect(cutoutGroup).not.toBeNull();
  const reference = cutoutGroup.getAttribute("clip-path")!.slice(5, -1);
  const cutout = document.getElementById(reference)!;
  expect(cutout.tagName).toBe("clipPath");
  // A use inside a clipPath must point directly to a shape or text,
  // rather than a group. Otherwise browsers cannot form the digit cutout.
  const clipShapes = new Set(["path", "text", "rect", "circle", "ellipse", "polygon", "polyline"]);
  expect(cutout.children.length).toBeGreaterThan(0);
  for (const child of cutout.children) {
    const shape = child.tagName === "use"
      ? document.getElementById(child.getAttribute("href")!.slice(1))!
      : child;
    expect(clipShapes.has(shape.tagName)).toBe(true);
  }
  // The reveal animation belongs to an inner group so its rectangular
  // wipe cannot replace the permanent digit clipping on the outer group.
  expect(photo.parentElement).not.toBe(cutoutGroup);
});

it("shows one large photo per digit and slides once to the next decoded pair", async () => {
  const view = render(<AnniversaryIntro />);
  replayIntro();
  await act(async () => { imageRequests.slice(0, 4).forEach((request) => request.onload?.()); });
  const frames = view.container.querySelectorAll("svg svg");
  expect(frames).toHaveLength(2);
  const strips = [...frames].map((frame) => frame.querySelector("g")!);
  expect([...strips[0].querySelectorAll("image")].map((photo) => photo.getAttribute("href")))
    .toEqual([imageRequests[0].src, imageRequests[2].src]);
  expect([...strips[1].querySelectorAll("image")].map((photo) => photo.getAttribute("href")))
    .toEqual([imageRequests[1].src, imageRequests[3].src]);
  expect(strips.map((strip) => strip.style.transform)).toEqual(["translateY(0)", "translateY(0)"]);
  act(() => vi.advanceTimersByTime(850));
  expect(strips.map((strip) => strip.style.transform)).toEqual(["translateY(-330px)", "translateY(-330px)"]);
  act(() => vi.advanceTimersByTime(1550));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("keeps the first pair when incoming photos miss the slide window", async () => {
  const view = render(<AnniversaryIntro />);
  replayIntro();
  await act(async () => { imageRequests.slice(0, 2).forEach((request) => request.onload?.()); });
  act(() => vi.advanceTimersByTime(1250));
  await act(async () => { imageRequests.slice(2, 4).forEach((request) => request.onload?.()); });
  const strips = [...view.container.querySelectorAll("svg svg")].map((frame) => frame.querySelector("g")!);
  expect(strips).toHaveLength(2);
  expect(strips.map((strip) => strip.style.transform)).toEqual(["translateY(0)", "translateY(0)"]);
  act(() => vi.advanceTimersByTime(1150));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("waits for both incoming photos before sliding during the allowed window", async () => {
  const view = render(<AnniversaryIntro />);
  replayIntro();
  await act(async () => { imageRequests.slice(0, 2).forEach((request) => request.onload?.()); });
  act(() => vi.advanceTimersByTime(900));
  await act(async () => { imageRequests[2].onload?.(); });
  const strips = [...view.container.querySelectorAll("svg svg")].map((frame) => frame.querySelector("g")!);
  expect(strips.map((strip) => strip.style.transform)).toEqual(["translateY(0)", "translateY(0)"]);
  await act(async () => { imageRequests[3].onload?.(); });
  expect(strips.map((strip) => strip.style.transform)).toEqual(["translateY(-330px)", "translateY(-330px)"]);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("replays on request after being seen without clearing the session preference", () => {
  sessionStorage.setItem("masca-25th-anniversary-seen", "seen");
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
  act(() => { window.dispatchEvent(new Event("masca:replay-anniversary")); });
  expect(screen.queryByRole("dialog")).not.toBeNull();
  expect(sessionStorage.getItem("masca-25th-anniversary-seen")).toBe("seen");
  act(() => vi.advanceTimersByTime(2400));
  expect(screen.queryByRole("dialog")).toBeNull();
  act(() => { window.dispatchEvent(new Event("masca:replay-anniversary")); });
  expect(screen.queryByRole("dialog")).not.toBeNull();
});

it("allows an explicit replay when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  render(<AnniversaryIntro />);
  act(() => { window.dispatchEvent(new Event("masca:replay-anniversary")); });
  expect(screen.queryByRole("dialog")).not.toBeNull();
  act(() => vi.advanceTimersByTime(2400));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("offers static artwork for an explicit replay with reduced motion", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  render(<AnniversaryIntro />);
  expect(screen.queryByRole("dialog")).toBeNull();
  act(() => { window.dispatchEvent(new Event("masca:replay-anniversary")); });
  expect(screen.queryByRole("dialog")).not.toBeNull();
  expect(imageRequests).toHaveLength(0);
  act(() => vi.advanceTimersByTime(2400));
  expect(screen.queryByRole("dialog")).toBeNull();
});
