import { expect, it } from "vitest";
import {
  libraryBucket,
  libraryFileURL,
  mayReadLibraryFile,
} from "../features/access/committeeMedia";
it("uses private storage for new committee files and refuses a public bucket", () => {
  expect(
    libraryBucket({
      COMMITTEE_ACCESS_ENABLED: "true",
      VERCEL_ENV: "preview",
      CALENDAR_PRIVATE_PREVIEW_BUCKET: "drafts",
    }),
  ).toBe("drafts");
  expect(() =>
    libraryBucket({
      COMMITTEE_ACCESS_ENABLED: "true",
      CALENDAR_PRIVATE_PREVIEW_BUCKET: "media",
    }),
  ).toThrow();
});
it("keeps existing public files while proxying new private files", () => {
  expect(libraryFileURL("x.jpg", undefined, (n) => "public/" + n)).toBe(
    "public/x.jpg",
  );
  expect(
    libraryFileURL("x.jpg", "committee-private", (n) => "public/" + n),
  ).toBe("/api/committee-media?filename=x.jpg");
});
it("protects private files and permits explicitly published files", () => {
  expect(
    mayReadLibraryFile(null, { owningScope: "QLD", accessPublished: false }),
  ).toBe(false);
  expect(
    mayReadLibraryFile(null, { owningScope: "QLD", accessPublished: true }),
  ).toBe(true);
});
it("rejects creating file metadata without an upload and forging an existing file pointer", async () => {
  const { guardLibraryUpload } = await import(
    "../features/access/committeeMedia"
  );
  expect(() =>
    guardLibraryUpload(
      { filename: "foreign.jpg", prefix: "committee-private" },
      undefined,
      false,
      "create",
      true,
    ),
  ).toThrow();
  expect(() =>
    guardLibraryUpload(
      { filename: "foreign.jpg" },
      { filename: "mine.jpg", prefix: "committee-private" },
      false,
      "update",
      true,
    ),
  ).toThrow();
  expect(() =>
    guardLibraryUpload(
      { prefix: "elsewhere" },
      { filename: "mine.jpg", prefix: "committee-private" },
      false,
      "update",
      true,
    ),
  ).toThrow();
  expect(() =>
    guardLibraryUpload(
      {},
      { filename: "mine.jpg", prefix: "committee-private" },
      true,
      "update",
      true,
    ),
  ).toThrow();
  expect(guardLibraryUpload({}, undefined, true, "create", true).prefix).toBe(
    "committee-private",
  );
  expect(
    guardLibraryUpload(
      { alt: "Description" },
      { filename: "mine.jpg", prefix: "committee-private" },
      false,
      "update",
      true,
    ),
  ).toMatchObject({ alt: "Description" });
});
