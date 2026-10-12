// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AccountPhoto } from "../../components/admin/AccountPhoto";
vi.mock("@payloadcms/ui", () => ({
  useAuth: () => ({ user: { id: 1, email: "sarah.tan@masca.org.au" } }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/account" }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("saves a photo immediately and restores initials after removal", async () => {
  let uploaded = false;
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") uploaded = true;
    if (init?.method === "DELETE") uploaded = false;
    return Response.json({
      userId: "1",
      photoVersion: uploaded ? "version-a" : null,
    });
  });
  render(<AccountPhoto />);
  const upload = await screen.findByRole("button", { name: "Upload photo" });
  await waitFor(() =>
    expect((upload as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.change(screen.getByLabelText("Choose account photo"), {
    target: {
      files: [new File(["photo"], "portrait.png", { type: "image/png" })],
    },
  });
  await screen.findByText("Photo saved.");
  expect(
    screen.getByAltText("Your account photo").getAttribute("src"),
  ).toContain("v=version-a");
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  await screen.findByText("Photo removed.");
  expect(screen.queryByAltText("Your account photo")).toBeNull();
});
it("keeps the previous photo when a replacement is rejected", async () => {
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ error: "Choose a valid photo." }, { status: 400 })
      : Response.json({ userId: "1", photoVersion: "original" }),
  );
  render(<AccountPhoto />);
  await screen.findByRole("button", { name: "Replace photo" });
  fireEvent.change(screen.getByLabelText("Choose account photo"), {
    target: {
      files: [new File(["bad"], "portrait.png", { type: "image/png" })],
    },
  });
  await screen.findByRole("alert");
  expect(
    screen.getByAltText("Your account photo").getAttribute("src"),
  ).toContain("v=original");
});
