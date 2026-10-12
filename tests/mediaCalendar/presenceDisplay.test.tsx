// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
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
