import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import SubmitPage from "@/app/(frontend)/submit/page";
import EventSubmitPage from "@/app/(frontend)/submit/event/page";
import {
  EventSubmissionForm,
  applySubmissionResult,
} from "@/app/(frontend)/submit/event/EventSubmissionForm";

describe("public submission pages", () => {
  it("offers event submissions without advertising careers submissions as available", () => {
    const html = renderToStaticMarkup(<SubmitPage />);

    expect(html).toContain("Submit to MASCA");
    expect(html).toContain('href="/submit/event"');
    expect(html).toContain("Submit an event");
    expect(html).not.toContain('href="/submit/careers"');
    expect(html).not.toContain("Submit a career");
    expect(html).toContain('href="/events"');
  });

  it("renders a labelled event form with upload limits, confirmation and privacy context", () => {
    const html = renderToStaticMarkup(<EventSubmitPage />);

    for (const label of [
      "Event title",
      "Organisation",
      "Event description",
      "Start date and time",
      "End date and time",
      "Venue",
      "State or territory",
      "Ticket or registration link",
      "Event poster",
      "Contact name",
      "Contact email",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(html).toContain("JPEG, PNG or WebP");
    expect(html).toContain("5 MB");
    expect(html).toContain("I confirm the event details are accurate");
    expect(html).toContain("used only to review this submission");
    expect(html).toContain("does not guarantee publication");
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/events"');
  });

  it("exposes pending, success and focused error states accessibly", () => {
    const pendingHtml = renderToStaticMarkup(<EventSubmissionForm initialPending />);
    expect(pendingHtml).toContain("Submitting…");
    expect(pendingHtml.match(/ disabled=""/g)).toHaveLength(1);

    const successHtml = renderToStaticMarkup(
      <EventSubmissionForm
        initialResponse={{ ok: true, message: "Your event is pending review." }}
      />,
    );
    expect(successHtml).toContain('role="status"');
    expect(successHtml).toContain("Your event is pending review.");

    const errorHtml = renderToStaticMarkup(
      <EventSubmissionForm
        initialResponse={{
          ok: false,
          message: "Please check the highlighted fields.",
          fieldErrors: { title: ["Enter an event title."] },
        }}
      />,
    );
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain('tabindex="-1"');
    expect(errorHtml).toContain("Please check the highlighted fields.");
    expect(errorHtml).toContain('aria-invalid="true"');
    expect(errorHtml).toContain("Enter an event title.");
  });

  it("clears the form only after success and focuses the summary after an error", () => {
    const form = { reset: vi.fn() };
    const errorSummary = { focus: vi.fn() };

    applySubmissionResult({ ok: false, message: "Try again." }, form, errorSummary);
    expect(form.reset).not.toHaveBeenCalled();
    expect(errorSummary.focus).toHaveBeenCalledOnce();

    errorSummary.focus.mockClear();
    applySubmissionResult({ ok: true, message: "Pending review." }, form, errorSummary);
    expect(form.reset).toHaveBeenCalledOnce();
    expect(errorSummary.focus).not.toHaveBeenCalled();
  });
});
