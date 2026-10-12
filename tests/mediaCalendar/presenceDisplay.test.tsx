// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PresenceStrip } from "../../components/admin/mediaCalendar/PresenceStrip";
afterEach(cleanup);
it("counts people once and shows only people viewing the current post", () => {
  render(
    <PresenceStrip
      postId="post-a"
      people={[
        { userId: "1", name: "Sarah Tan", color: "#367bb5", postId: "post-a" },
        { userId: "1", name: "Sarah Tan", color: "#367bb5", postId: "post-a" },
        { userId: "2", name: "Amir", color: "#9960bd", postId: "post-a" },
        { userId: "3", name: "Mei", color: "#2f9073", postId: "another-post" },
      ]}
    />,
  );
  expect(
    screen.getByLabelText("People viewing this post").textContent,
  ).toContain("2 people in this post");
  expect(screen.queryByTitle("Mei")).toBeNull();
  expect(screen.getAllByTitle("Sarah Tan")).toHaveLength(1);
});
it("shows all four collaborators clearly in the calendar", () => {
  render(
    <PresenceStrip
      people={["Sarah", "Amir", "Mei", "Ravi"].map((name, i) => ({
        userId: String(i),
        name,
        color: "#367bb5",
      }))}
    />,
  );
  expect(
    screen.getByLabelText("People online in the media calendar").textContent,
  ).toContain("4 online");
  for (const name of ["Sarah", "Amir", "Mei", "Ravi"])
    expect(screen.getByTitle(name)).toBeTruthy();
});

it("loads account photos from the same origin with escaped identity and version", () => {
  render(
    <PresenceStrip
      people={[
        {
          userId: "user&admin=true",
          name: "Sarah Tan",
          color: "#367bb5",
          photoVersion: "v 1&next=remote",
        },
      ]}
    />,
  );
  expect(screen.getByTitle("Sarah Tan").querySelector("img")?.src).toBe(
    `${window.location.origin}/api/account/photo?id=user%26admin%3Dtrue&v=v%201%26next%3Dremote`,
  );
});

it("keeps initials after a failed photo until a replacement version arrives", () => {
  const person = {
    userId: "1",
    name: "Sarah Tan",
    color: "#367bb5",
    photoVersion: "first",
  };
  const { rerender } = render(<PresenceStrip people={[person]} />);
  const avatar = screen.getByTitle("Sarah Tan");
  const photo = avatar.querySelector("img");
  expect(photo).not.toBeNull();
  fireEvent.error(photo!);
  expect(avatar.textContent).toBe("ST");
  expect(avatar.querySelector("img")).toBeNull();

  rerender(<PresenceStrip people={[{ ...person }]} />);
  expect(avatar.querySelector("img")).toBeNull();

  rerender(
    <PresenceStrip people={[{ ...person, photoVersion: "replacement" }]} />,
  );
  expect(screen.getByTitle("Sarah Tan")).toBe(avatar);
  expect(avatar.querySelector("img")?.src).toBe(
    `${window.location.origin}/api/account/photo?id=1&v=replacement`,
  );
});

it("uses initials without a photo version and ignores untrusted remote photo URLs", () => {
  const people = [
    {
      userId: "1",
      name: "Sarah Tan",
      color: "#367bb5",
      photoVersion: null,
      photoUrl: "https://untrusted.example/avatar.jpg",
    },
  ];
  render(<PresenceStrip people={people} />);
  expect(screen.getByTitle("Sarah Tan").textContent).toBe("ST");
  expect(screen.getByTitle("Sarah Tan").querySelector("img")).toBeNull();
});

it("preserves avatars and the counter across polling but refreshes the counter when attendance changes", () => {
  const person = { userId: "1", name: "Sarah Tan", color: "#367bb5" };
  const { rerender } = render(<PresenceStrip people={[person]} />);
  const avatar = screen.getByTitle("Sarah Tan");
  const counter = screen.getByText("1 online");
  rerender(<PresenceStrip people={[{ ...person }]} />);
  expect(screen.getByTitle("Sarah Tan")).toBe(avatar);
  expect(screen.getByText("1 online")).toBe(counter);

  rerender(
    <PresenceStrip
      people={[person, { ...person, userId: "2", name: "Amir" }]}
    />,
  );
  expect(screen.getByTitle("Sarah Tan")).toBe(avatar);
  expect(screen.getByText("2 online")).not.toBe(counter);
});

it("keeps the five-avatar limit and counts every distinct participant", () => {
  render(
    <PresenceStrip
      people={Array.from({ length: 7 }, (_, i) => ({
        userId: String(i),
        name: `Person ${i}`,
        color: "#367bb5",
        photoVersion: "photo",
      }))}
    />,
  );
  expect(screen.getByText("7 online")).toBeTruthy();
  expect(screen.getByTitle("2 more people").textContent).toBe("+2");
  expect(screen.queryByTitle("Person 5")).toBeNull();
  expect(
    screen
      .getByLabelText("People online in the media calendar")
      .querySelectorAll("img"),
  ).toHaveLength(5);
});

it("shows the strongest activity per person across multiple tabs in the people dropdown", () => {
  const { rerender } = render(
    <PresenceStrip
      connection="live"
      people={[
        {
          userId: "1",
          name: "Sarah",
          color: "#367bb5",
          activity: "editing",
          postId: "a",
          postTitle: "Community night",
        },
        {
          userId: "1",
          name: "Sarah",
          color: "#367bb5",
          activity: "calendar",
          postId: null,
        },
        {
          userId: "2",
          name: "Amir",
          color: "#9960bd",
          activity: "viewing",
          postId: "b",
          postTitle: "Careers fair",
        },
        { userId: "3", name: "Mei", color: "#2f9073", activity: "calendar" },
      ]}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "People online and their activity" }),
  );
  const roster = screen.getByRole("region", {
    name: "Live collaboration activity",
  });
  expect(roster.textContent).toContain(
    "SarahEditing caption · Community night",
  );
  expect(roster.textContent).toContain("AmirViewing · Careers fair");
  expect(roster.textContent).toContain("MeiViewing calendar");
  expect(screen.getByText("3 online")).toBeTruthy();
  rerender(<PresenceStrip connection="reconnecting" people={[]} />);
  expect(
    screen.queryByRole("region", { name: "Live collaboration activity" }),
  ).toBeNull();
});

it("dismisses the activity dropdown with Escape and restores focus", () => {
  render(
    <PresenceStrip
      connection="live"
      people={[{ userId: "1", name: "Sarah", color: "#367bb5" }]}
    />,
  );
  const trigger = screen.getByRole("button", {
    name: "People online and their activity",
  });
  fireEvent.click(trigger);
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Live collaboration activity" }),
    { key: "Escape" },
  );
  expect(
    screen.queryByRole("region", { name: "Live collaboration activity" }),
  ).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("dismisses when keyboard focus moves away and leaves an editor's Escape alone", () => {
  render(
    <>
      <PresenceStrip
        connection="live"
        people={[{ userId: "1", name: "Sarah", color: "#367bb5" }]}
      />
      <button>New post</button>
      <input aria-label="Editor field" />
    </>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "People online and their activity" }),
  );
  fireEvent.keyDown(screen.getByLabelText("Editor field"), { key: "Escape" });
  expect(document.activeElement).not.toBe(
    screen.getByRole("button", { name: "People online and their activity" }),
  );
  act(() => screen.getByRole("button", { name: "New post" }).focus());
  expect(
    screen.queryByRole("region", { name: "Live collaboration activity" }),
  ).toBeNull();
});
