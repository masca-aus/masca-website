// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AccessGraph } from "../components/admin/access/AccessGraph";
import { accessFixture } from "./helpers/accessFixture";
afterEach(cleanup);
it("opens workspace actions by right click and assigns access inline", () => {
  render(<AccessGraph initialView="bubbles" initialSnapshot={accessFixture} />);
  fireEvent.contextMenu(screen.getByRole("button", { name: "Open MASA" }), {
    clientX: 100,
    clientY: 100,
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Assign access" }));
  expect(
    screen
      .getByRole("form", { name: "Add workspace member" })
      .closest('[aria-label="MASA workspace"]'),
  ).toBeTruthy();
});
it("shows visible actions and reviews deletion before archiving", async () => {
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: accessFixture };
  });
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Workspace actions for MASA" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive workspace" }));
  const form = screen.getByRole("form", { name: "Archive workspace" });
  expect(form.closest('[aria-label="MASA workspace"]')).toBeTruthy();
  expect(screen.getByText(/can be restored/)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "archiveWorkspace",
    workspaceId: "ws-masa",
    expectedRevision: "w1",
  });
});
it("cancels deletion without changing workspace or access", async () => {
  const save = vi.fn();
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={accessFixture}
      onMutation={save}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Workspace actions for MASA" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive workspace" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form")).toBeNull();
  expect(save).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Workspace actions for MASA" }),
    ),
  );
});
it("offers restore for archived workspaces and retains revision checks", async () => {
  const s = {
    ...accessFixture,
    workspaces: accessFixture.workspaces.map((w) =>
      w.id === "ws-masa" ? { ...w, status: "archived" as const } : w,
    ),
  };
  const save = vi.fn(async (input: unknown) => {
    void input;
    return { snapshot: s };
  });
  render(
    <AccessGraph initialView="bubbles" initialSnapshot={s} onMutation={save} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show archived" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Workspace actions for MASA" }),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore workspace" }));
  fireEvent.submit(screen.getByRole("form"));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    type: "restoreWorkspace",
    expectedRevision: "w1",
  });
});
it("makes staged controls discoverable but cannot write or hide the reason", () => {
  const save = vi.fn();
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={{ ...accessFixture, mode: "staged" }}
      onMutation={save}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Workspace actions for MASA" }),
  );
  expect(
    screen
      .getByRole("menuitem", { name: "Archive workspace" })
      .getAttribute("aria-disabled"),
  ).toBe("true");
  expect(screen.getByRole("menu").textContent).toContain(
    "Changes unlock after the access rollout review",
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive workspace" }));
  expect(screen.queryByRole("form")).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
it("does not offer workspace deletion to access managers", () => {
  render(
    <AccessGraph
      initialView="bubbles"
      initialSnapshot={{
        ...accessFixture,
        viewer: {
          ...accessFixture.viewer,
          configure: false,
          create: false,
          appoint: false,
        },
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Workspace actions for MASA" }),
  );
  expect(
    screen.queryByRole("menuitem", { name: "Archive workspace" }),
  ).toBeNull();
  expect(screen.getByRole("menuitem", { name: "Assign access" })).toBeTruthy();
});
it("brings an inline deletion review into view without selecting any text", () => {
  const scroll = vi.fn();
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  const rect = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({
      x: 0,
      y: 900,
      top: 900,
      bottom: 950,
      left: 0,
      right: 100,
      width: 100,
      height: 50,
      toJSON: () => ({}),
    });
  try {
    render(
      <AccessGraph initialView="bubbles" initialSnapshot={accessFixture} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Workspace actions for MASA" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Archive workspace" }),
    );
    expect(scroll).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "smooth",
    });
    expect(scroll.mock.contexts.at(-1)).toBe(
      screen.getByRole("form", { name: "Archive workspace" }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close editor" }),
    );
  } finally {
    rect.mockRestore();
    HTMLElement.prototype.scrollIntoView = original;
  }
});
