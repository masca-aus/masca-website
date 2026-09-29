import { z } from "zod";

export const EVENT_STATES = [
  { value: "VIC", label: "Victoria" },
  { value: "NSW", label: "New South Wales" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
] as const;

type EventState = (typeof EVENT_STATES)[number]["value"];

export interface EventSubmissionInput {
  title: string;
  organisation: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  state: EventState;
  ticketURL?: string;
  contactName: string;
  contactEmail: string;
}

export type EventSubmissionResult =
  | { ok: true; data: EventSubmissionInput; poster?: File }
  | { ok: false; fieldErrors: Record<string, string[]> };

const MAX_POSTER_SIZE = 5 * 1024 * 1024;
const POSTER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const STATE_CODES = EVENT_STATES.map((state) => state.value);
export const EVENT_TIME_ZONES: Record<EventState, string> = {
  VIC: "Australia/Sydney",
  NSW: "Australia/Sydney",
  TAS: "Australia/Sydney",
  ACT: "Australia/Sydney",
  QLD: "Australia/Brisbane",
  WA: "Australia/Perth",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
};

const submissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Enter an event title of at least 3 characters.")
    .max(160, "Event title must be 160 characters or fewer."),
  organisation: z
    .string()
    .trim()
    .min(2, "Enter an organisation name of at least 2 characters.")
    .max(160, "Organisation name must be 160 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(20, "Enter an event description of at least 20 characters.")
    .max(5000, "Event description must be 5000 characters or fewer."),
  venue: z
    .string()
    .trim()
    .min(2, "Enter a venue of at least 2 characters.")
    .max(240, "Venue must be 240 characters or fewer."),
  state: z.string().refine((value) => STATE_CODES.includes(value as EventState), {
    message: "Select an Australian state or territory.",
  }),
  ticketURL: z
    .string()
    .trim()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Use a secure https:// link." },
    ),
  contactName: z
    .string()
    .trim()
    .min(2, "Enter a contact name of at least 2 characters.")
    .max(120, "Contact name must be 120 characters or fewer."),
  contactEmail: z
    .string()
    .trim()
    .max(254, "Contact email must be 254 characters or fewer.")
    .email("Enter a valid contact email address."),
  accuracyConfirmed: z.enum(["on", "true"], {
    message: "Please confirm the event details are accurate.",
  }),
});

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

function getString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function parseLocalDateTime(value: string): LocalDateTime | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    value,
  );
  if (!match) return undefined;

  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const localDateTime = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(milliseconds.padEnd(3, "0")),
  };
  const date = new Date(
    Date.UTC(
      localDateTime.year,
      localDateTime.month - 1,
      localDateTime.day,
      localDateTime.hour,
      localDateTime.minute,
      localDateTime.second,
      localDateTime.millisecond,
    ),
  );

  if (
    date.getUTCFullYear() !== localDateTime.year ||
    date.getUTCMonth() !== localDateTime.month - 1 ||
    date.getUTCDate() !== localDateTime.day ||
    date.getUTCHours() !== localDateTime.hour ||
    date.getUTCMinutes() !== localDateTime.minute ||
    date.getUTCSeconds() !== localDateTime.second ||
    date.getUTCMilliseconds() !== localDateTime.millisecond
  ) {
    return undefined;
  }

  return localDateTime;
}

function toUtcTimestamp(dateTime: LocalDateTime) {
  return Date.UTC(
    dateTime.year,
    dateTime.month - 1,
    dateTime.day,
    dateTime.hour,
    dateTime.minute,
    dateTime.second,
    dateTime.millisecond,
  );
}

function getZonedDateTime(timestamp: number, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;

  return { ...values, millisecond: new Date(timestamp).getUTCMilliseconds() };
}

function matchesLocalDateTime(left: LocalDateTime, right: LocalDateTime) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second &&
    left.millisecond === right.millisecond
  );
}

function convertLocalDateTimeToUtc(dateTime: LocalDateTime, timeZone: string) {
  const localTimestamp = toUtcTimestamp(dateTime);
  const offsets = new Set(
    [-48, -24, 0, 24, 48].map((hours) => {
      const timestamp = localTimestamp + hours * 60 * 60 * 1000;
      return toUtcTimestamp(getZonedDateTime(timestamp, timeZone)) - timestamp;
    }),
  );
  const matchingTimestamps = [...offsets]
    .map((offset) => localTimestamp - offset)
    .filter((timestamp) => matchesLocalDateTime(getZonedDateTime(timestamp, timeZone), dateTime));

  if (matchingTimestamps.length === 0) return undefined;
  return new Date(Math.min(...matchingTimestamps));
}

function addError(fieldErrors: Record<string, string[]>, field: string, message: string) {
  fieldErrors[field] ??= [];
  fieldErrors[field].push(message);
}

export function isAllowedPoster(file: File) {
  return (
    file.size <= MAX_POSTER_SIZE &&
    POSTER_MIME_TYPES.includes(file.type as (typeof POSTER_MIME_TYPES)[number])
  );
}

export function parseEventSubmission(formData: FormData): EventSubmissionResult {
  const values = {
    title: getString(formData, "title"),
    organisation: getString(formData, "organisation"),
    description: getString(formData, "description"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    venue: getString(formData, "venue"),
    state: getString(formData, "state"),
    ticketURL: getString(formData, "ticketURL"),
    contactName: getString(formData, "contactName"),
    contactEmail: getString(formData, "contactEmail"),
    accuracyConfirmed: getString(formData, "accuracyConfirmed"),
  };
  const fieldErrors: Record<string, string[]> = {};
  const schemaResult = submissionSchema.safeParse(values);

  if (!schemaResult.success) {
    for (const [field, messages] of Object.entries(schemaResult.error.flatten().fieldErrors)) {
      if (messages?.length) fieldErrors[field] = messages;
    }
  }

  const startDate = parseLocalDateTime(values.startDate);
  if (!startDate) addError(fieldErrors, "startDate", "Enter a valid start date.");

  const endDate = values.endDate ? parseLocalDateTime(values.endDate) : undefined;
  if (values.endDate && !endDate) addError(fieldErrors, "endDate", "Enter a valid end date.");
  if (startDate && endDate && toUtcTimestamp(endDate) < toUtcTimestamp(startDate)) {
    addError(fieldErrors, "endDate", "End date must be after the start date.");
  }

  const posterEntry = formData.get("poster");
  const poster = posterEntry instanceof File ? posterEntry : undefined;
  if (poster && !(poster.name === "" && poster.size === 0) && !isAllowedPoster(poster)) {
    if (poster.size > MAX_POSTER_SIZE) {
      addError(fieldErrors, "poster", "Poster must be 5 MB or smaller.");
    } else if (!POSTER_MIME_TYPES.includes(poster.type as (typeof POSTER_MIME_TYPES)[number])) {
      addError(fieldErrors, "poster", "Upload a JPEG, PNG or WebP image.");
    }
  } else if (posterEntry && !poster) {
    addError(fieldErrors, "poster", "Upload a JPEG, PNG or WebP image.");
  }

  if (Object.keys(fieldErrors).length > 0 || !startDate || !schemaResult.success) {
    return { ok: false, fieldErrors };
  }

  const timeZone = EVENT_TIME_ZONES[schemaResult.data.state as EventState];
  const startDateUtc = convertLocalDateTimeToUtc(startDate, timeZone);
  if (!startDateUtc) addError(fieldErrors, "startDate", "Enter a valid start date.");

  const endDateUtc = endDate ? convertLocalDateTimeToUtc(endDate, timeZone) : undefined;
  if (endDate && !endDateUtc) addError(fieldErrors, "endDate", "Enter a valid end date.");

  if (Object.keys(fieldErrors).length > 0 || !startDateUtc) {
    return { ok: false, fieldErrors };
  }

  const data: EventSubmissionInput = {
    title: schemaResult.data.title,
    organisation: schemaResult.data.organisation,
    description: schemaResult.data.description,
    startDate: startDateUtc.toISOString(),
    venue: schemaResult.data.venue,
    state: schemaResult.data.state as EventState,
    contactName: schemaResult.data.contactName,
    contactEmail: schemaResult.data.contactEmail,
  };

  if (endDateUtc) data.endDate = endDateUtc.toISOString();
  if (schemaResult.data.ticketURL) data.ticketURL = schemaResult.data.ticketURL;

  return poster && !(poster.name === "" && poster.size === 0)
    ? { ok: true, data, poster }
    : { ok: true, data };
}
