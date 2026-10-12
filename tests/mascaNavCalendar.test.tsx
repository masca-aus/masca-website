// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MascaNav } from "../components/admin/MascaNav";
const auth = vi.hoisted(() => ({
  user: {
    id: "1",
    email: "media@masca.org.au",
    role: "editor",
    status: "active",
    calendarAccess: {
      view: true,
      edit: false,
      approve: false,
      designation: null,
    },
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/media-calendar",
}));
vi.mock("@payloadcms/ui", () => ({
  useAuth: () => auth,
  useNav: () => ({
    navOpen: true,
    hydrated: false,
    navRef: null,
    shouldAnimate: false,
    setNavOpen() {},
  }),
  useTheme: () => ({ theme: "light", setTheme() {} }),
  NavToggler: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  auth.user.status = "active";
});
it("groups the accessible calendar with Content even without collection permissions", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  const { rerender } = render(
    <MascaNav
      visibleEntities={{ collections: ["careers", "events", "media"] }}
    />,
  );
  const content = screen.getByRole("region", { name: "Content" });
  expect(
    within(content)
      .getByRole("link", { name: "Media calendar" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(within(content).getByRole("link", { name: "Events" })).toBeTruthy();
  rerender(<MascaNav visibleEntities={{ collections: [] }} />);
  expect(
    within(screen.getByRole("region", { name: "Content" })).getByRole("link", {
      name: "Media calendar",
    }),
  ).toBeTruthy();
});
it("keeps the calendar out of navigation for suspended accounts", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  auth.user.status = "suspended";
  render(<MascaNav visibleEntities={{ collections: ["careers", "events"] }} />);
  expect(screen.queryByRole("link", { name: "Media calendar" })).toBeNull();
});
