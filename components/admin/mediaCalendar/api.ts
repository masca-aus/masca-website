export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new RequestError(
      "The calendar could not connect. Please try again.",
      response.status,
    );
  }
  if (!response.ok)
    throw new RequestError(
      data.error || "Something went wrong. Please try again.",
      response.status,
    );
  return data;
}
export const calendarAPI = "/api/media-calendar";
