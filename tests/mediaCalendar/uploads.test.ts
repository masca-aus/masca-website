import { describe, it, expect } from "vitest";
import {
  validateUpload,
  validSignature,
} from "../../features/mediaCalendar/uploadPolicy";
describe("private upload validation", () => {
  it("rejects unsupported or oversized files", () => {
    expect(() => validateUpload("poster.svg", "image/svg+xml", 100)).toThrow();
    expect(() =>
      validateUpload("photo.jpg", "image/jpeg", 21 * 1024 * 1024),
    ).toThrow();
    expect(() =>
      validateUpload("clip.mp4", "video/mp4", 51 * 1024 * 1024),
    ).toThrow();
    expect(() =>
      validateUpload("../photo.jpg", "image/jpeg", 100),
    ).not.toThrow();
  });
  it("detects file content instead of trusting browser MIME", () => {
    expect(
      validSignature("image/jpeg", new Uint8Array([255, 216, 255, 1])),
    ).toBe(true);
    expect(
      validSignature(
        "image/png",
        new TextEncoder().encode("<script>alert(1)</script>"),
      ),
    ).toBe(false);
    expect(
      validSignature(
        "video/mp4",
        new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]),
      ),
    ).toBe(true);
  });
});
