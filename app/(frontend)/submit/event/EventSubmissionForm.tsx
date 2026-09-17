"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import Button from "@/components/Button";
import { EVENT_STATES } from "@/features/events/eventSubmission";

export type SubmitEventResponse =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

type ResetTarget = Pick<HTMLFormElement, "reset">;
type FocusTarget = Pick<HTMLElement, "focus">;

export function applySubmissionResult(
  result: SubmitEventResponse,
  form: ResetTarget,
  errorSummary: FocusTarget | null,
) {
  if (result.ok) form.reset();
  else errorSummary?.focus();
}

const fieldClass =
  "w-full rounded-md border-2 border-blue-100 bg-white px-4 py-3 text-body text-black outline-none transition-colors placeholder:text-gray-300 focus:border-blue-600 focus:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none";
const labelClass = "text-body-sm font-bold text-gray-700";
const fieldIds: Record<string, string> = {
  title: "event-title",
  organisation: "event-organisation",
  description: "event-description",
  startDate: "event-start-date",
  endDate: "event-end-date",
  venue: "event-venue",
  state: "event-state",
  ticketURL: "event-ticket-url",
  poster: "event-poster",
  contactName: "event-contact-name",
  contactEmail: "event-contact-email",
  accuracyConfirmed: "event-confirmation",
};

type EventSubmissionFormProps = {
  initialPending?: boolean;
  initialResponse?: SubmitEventResponse | null;
};

function isSubmitEventResponse(value: unknown): value is SubmitEventResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<SubmitEventResponse>;
  return typeof response.ok === "boolean" && typeof response.message === "string";
}

function firstError(response: SubmitEventResponse | null, name: string) {
  return response && !response.ok ? response.fieldErrors?.[name]?.[0] : undefined;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={error ? "text-body-sm font-bold text-red-600" : labelClass}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-body-sm text-gray-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-body-sm font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({
  id,
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${fieldClass} ${error ? "border-red-600 bg-red-50" : ""}`}
        {...props}
      />
    </FieldShell>
  );
}

function TextAreaField({
  id,
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldClass} resize-y ${error ? "border-red-600 bg-red-50" : ""}`}
        {...props}
      />
    </FieldShell>
  );
}

export function EventSubmissionForm({
  initialPending = false,
  initialResponse = null,
}: EventSubmissionFormProps = {}) {
  const [pending, setPending] = useState(initialPending);
  const [response, setResponse] = useState<SubmitEventResponse | null>(initialResponse);
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (response && formRef.current) {
      applySubmissionResult(response, formRef.current, errorSummaryRef.current);
    }
  }, [response]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setResponse(null);

    let result: SubmitEventResponse;
    try {
      const request = await fetch("/api/submit-event", {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      const body: unknown = await request.json();
      if (!isSubmitEventResponse(body)) throw new Error("Unexpected submission response");
      result = body;
    } catch {
      result = {
        ok: false,
        message: "We could not send your submission. Please try again later.",
      };
    }

    setResponse(result);
    setPending(false);
  }

  const titleError = firstError(response, "title");
  const organisationError = firstError(response, "organisation");
  const descriptionError = firstError(response, "description");
  const startDateError = firstError(response, "startDate");
  const endDateError = firstError(response, "endDate");
  const venueError = firstError(response, "venue");
  const stateError = firstError(response, "state");
  const ticketURLError = firstError(response, "ticketURL");
  const posterError = firstError(response, "poster");
  const contactNameError = firstError(response, "contactName");
  const contactEmailError = firstError(response, "contactEmail");
  const confirmationError = firstError(response, "accuracyConfirmed");
  const fieldErrorEntries =
    response && !response.ok && response.fieldErrors
      ? Object.entries(response.fieldErrors).flatMap(([name, messages]) =>
          messages.map((message) => ({ id: fieldIds[name], message })),
        )
      : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 max-w-2xl">
        <span className="eyebrow text-red-600">event details</span>
        <h2 className="mt-3 text-blue-600">Tell us what you&apos;re planning</h2>
        <p className="mt-4 text-gray-700">
          Fields marked required must be completed. A submission starts our review process and
          does not guarantee publication.
        </p>
      </div>

      {response && !response.ok && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="mb-8 rounded-lg border-2 border-red-600 bg-red-50 p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600"
        >
          <h3 className="text-red-600">Please check your submission</h3>
          <p className="mt-2 text-gray-700">{response.message}</p>
          {fieldErrorEntries.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-body-sm">
              {fieldErrorEntries.map(({ id, message }, index) => (
                <li key={`${id ?? "submission"}-${index}`}>
                  {id ? (
                    <a
                      href={`#${id}`}
                      className="font-bold text-red-600 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      {message}
                    </a>
                  ) : (
                    message
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {response?.ok && (
        <div role="status" aria-live="polite" className="mb-8 rounded-lg bg-blue-50 p-5">
          <h3 className="text-blue-600">Thanks — we&apos;ve got it</h3>
          <p className="mt-2 text-gray-700">{response.message}</p>
        </div>
      )}

      <form
        ref={formRef}
        action="/api/submit-event"
        method="post"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
        className="flex flex-col gap-10"
      >
        <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-blue-100 p-6 md:p-8">
          <legend className="px-2 text-lg font-bold text-blue-600">About the event</legend>
          <div className="grid gap-6 md:grid-cols-2">
            <TextField
              id="event-title"
              label="Event title"
              name="title"
              required
              minLength={3}
              maxLength={160}
              error={titleError}
            />
            <TextField
              id="event-organisation"
              label="Organisation"
              name="organisation"
              required
              minLength={2}
              maxLength={160}
              error={organisationError}
            />
          </div>
          <TextAreaField
            id="event-description"
            label="Event description"
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={7}
            error={descriptionError}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <TextField
              id="event-start-date"
              label="Start date and time"
              name="startDate"
              type="datetime-local"
              required
              error={startDateError}
            />
            <TextField
              id="event-end-date"
              label="End date and time"
              name="endDate"
              type="datetime-local"
              error={endDateError}
            />
            <TextField
              id="event-venue"
              label="Venue"
              name="venue"
              required
              minLength={2}
              maxLength={240}
              error={venueError}
            />
            <FieldShell id="event-state" label="State or territory" error={stateError}>
              <select
                id="event-state"
                name="state"
                required
                defaultValue=""
                aria-invalid={stateError ? true : undefined}
                aria-describedby={stateError ? "event-state-error" : undefined}
                className={`${fieldClass} ${stateError ? "border-red-600 bg-red-50" : ""}`}
              >
                <option value="">
                  Select a state or territory
                </option>
                {EVENT_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </FieldShell>
          </div>
          <TextField
            id="event-ticket-url"
            label="Ticket or registration link"
            name="ticketURL"
            type="url"
            inputMode="url"
            placeholder="https://"
            error={ticketURLError}
          />
          <TextField
            id="event-poster"
            label="Event poster"
            name="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            error={posterError}
            hint="Optional. Upload a JPEG, PNG or WebP image up to 5 MB."
          />
        </fieldset>

        <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-blue-100 p-6 md:p-8">
          <legend className="px-2 text-lg font-bold text-blue-600">Review contact</legend>
          <p className="text-gray-700">
            Your contact details are used only to review this submission and clarify event details.
            Read our{" "}
            <a
              href="/privacy"
              className="font-bold text-blue-600 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              privacy notice
            </a>
            .
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <TextField
              id="event-contact-name"
              label="Contact name"
              name="contactName"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              error={contactNameError}
            />
            <TextField
              id="event-contact-email"
              label="Contact email"
              name="contactEmail"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              error={contactEmailError}
            />
          </div>

          <div>
            <label className="flex items-start gap-3 text-body-sm font-bold text-gray-700">
              <input
                id="event-confirmation"
                type="checkbox"
                name="accuracyConfirmed"
                required
                aria-invalid={confirmationError ? true : undefined}
                aria-describedby={confirmationError ? "event-confirmation-error" : undefined}
                className="mt-0.5 size-5 shrink-0 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              />
              <span>I confirm the event details are accurate.</span>
            </label>
            {confirmationError && (
              <p id="event-confirmation-error" role="alert" className="mt-2 text-body-sm font-bold text-red-600">
                {confirmationError}
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-5">
          <Button
            variant="accent"
            type="submit"
            disabled={pending}
            aria-describedby="submission-note"
            className={`${pending ? "cursor-wait opacity-70" : ""} motion-reduce:transform-none motion-reduce:transition-none`}
          >
            {pending ? "Submitting…" : "Submit event →"}
          </Button>
          <p id="submission-note" className="max-w-lg text-body-sm text-gray-700">
            We review every submission before it can appear on the MASCA events calendar.
          </p>
        </div>
      </form>
    </div>
  );
}
