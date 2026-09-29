import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CAREERS_REVALIDATE_SECONDS,
  MAX_CSV_BYTES,
  fetchSheetCsv,
  getCareerBoard,
  loadCareerBoard,
  resolveSheetConfig,
  sheetCsvUrl,
  sheetEditUrl,
} from "@/utils/careersSource";

const ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
const config = { sheetId: ID, gid: "0" };
const NOW = new Date("2026-09-14T00:00:00Z");

const csvBody = [
  "Published,Title,Company,Apply link,Closes",
  "TRUE,Analyst,Teh Tarik Co,https://tehtarik.example/apply,2026-10-01",
  "FALSE,Draft,Somewhere,https://x.example,",
  "TRUE,Old,Gone,https://x.example,2026-01-01",
].join("\n");

type FetchInit = { next?: { revalidate?: number }; cache?: string } | undefined;

const respond = (body: string, init: { status?: number; type?: string } = {}) =>
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(body, {
        status: init.status ?? 200,
        headers: { "content-type": init.type ?? "text/csv; charset=utf-8" },
      }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("resolveSheetConfig", () => {
  it("accepts a bare id, defaulting the tab to 0", () => {
    expect(resolveSheetConfig({ CAREERS_SHEET_ID: ` ${ID} ` })).toEqual(config);
  });

  it("accepts a pasted sheet URL and reads the gid from it", () => {
    expect(
      resolveSheetConfig({ CAREERS_SHEET_ID: `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=1234` }),
    ).toEqual({ sheetId: ID, gid: "1234" });
  });

  it("prefers an explicit numeric CAREERS_SHEET_GID and ignores a bad one", () => {
    expect(resolveSheetConfig({ CAREERS_SHEET_ID: ID, CAREERS_SHEET_GID: "77" })).toEqual({ sheetId: ID, gid: "77" });
    expect(resolveSheetConfig({ CAREERS_SHEET_ID: ID, CAREERS_SHEET_GID: "abc" })).toEqual(config);
  });

  it("treats a missing or malformed id as unconfigured", () => {
    expect(resolveSheetConfig({})).toBeNull();
    expect(resolveSheetConfig({ CAREERS_SHEET_ID: "not an id" })).toBeNull();
  });

  it("lets CAREERS_CSV_URL stand in for the sheet during local development", () => {
    const local = resolveSheetConfig({ CAREERS_CSV_URL: "http://localhost:8787/jobs.csv", CAREERS_SHEET_ID: ID });
    expect(local).toEqual({ sheetId: "local-csv", gid: "0", csvUrl: "http://localhost:8787/jobs.csv" });
    expect(sheetCsvUrl(local!)).toBe("http://localhost:8787/jobs.csv");
    expect(resolveSheetConfig({ CAREERS_CSV_URL: "file:///etc/passwd", CAREERS_SHEET_ID: ID })).toEqual(config);
  });

  it("builds the export and edit URLs", () => {
    expect(sheetCsvUrl(config)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=0`);
    expect(sheetEditUrl(config)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`);
  });
});

describe("fetchSheetCsv", () => {
  it("returns the CSV and asks Next to revalidate every five minutes", async () => {
    const fetchImpl = respond(csvBody);
    const result = await fetchSheetCsv(config, { fetchImpl });
    expect(result).toEqual({ ok: true, csv: csvBody });
    const init = fetchImpl.mock.calls[0][1] as FetchInit;
    expect(init?.next).toEqual({ revalidate: CAREERS_REVALIDATE_SECONDS });
    expect(init?.cache).toBeUndefined();
  });

  it("bypasses the cache when asked for a fresh read", async () => {
    const fetchImpl = respond(csvBody);
    await fetchSheetCsv(config, { fetchImpl, fresh: true });
    const init = fetchImpl.mock.calls[0][1] as FetchInit;
    expect(init?.cache).toBe("no-store");
    expect(init?.next).toBeUndefined();
  });

  it("recognises Google's sign-in page as an unshared sheet", async () => {
    const html = respond("<!DOCTYPE html><html><head><title>Sign in - Google Accounts</title></head><body>Sign in</body></html>", { type: "text/html; charset=utf-8" });
    const result = await fetchSheetCsv(config, { fetchImpl: html });
    expect(result).toMatchObject({ ok: false, status: "not-shared" });
    if (!result.ok) expect(result.error.fix).toContain("Anyone with the link");

  });

  it("classifies unrelated HTML as unreachable, even with a CSV content type", async () => {
    const unexpectedHtml = respond("<html>Temporary service issue</html>");
    expect(await fetchSheetCsv(config, { fetchImpl: unexpectedHtml })).toMatchObject({ ok: false, status: "unreachable" });
  });

  it("maps 404 and 400 to not-found, other failures to unreachable", async () => {
    expect(await fetchSheetCsv(config, { fetchImpl: respond("", { status: 404 }) })).toMatchObject({
      ok: false,
      status: "not-found",
    });
    const gid = await fetchSheetCsv(config, { fetchImpl: respond("", { status: 400 }) });
    expect(gid).toMatchObject({ ok: false, status: "not-found" });
    if (!gid.ok) expect(gid.error.fix).toContain("gid");
    expect(await fetchSheetCsv(config, { fetchImpl: respond("", { status: 503 }) })).toMatchObject({
      ok: false,
      status: "unreachable",
    });
    const thrown = vi.fn(async () => {
      throw new Error("timed out");
    });
    const result = await fetchSheetCsv(config, { fetchImpl: thrown });
    expect(result).toMatchObject({ ok: false, status: "unreachable" });
    if (!result.ok) expect(result.error.detail).toBe("timed out");
  });

  it("refuses an implausibly large export", async () => {
    const huge = respond("a,b\n".repeat(MAX_CSV_BYTES / 4 + 1));
    expect(await fetchSheetCsv(config, { fetchImpl: huge })).toMatchObject({ ok: false, status: "too-big" });
  });
});

describe("loadCareerBoard (never throws)", () => {
  it("reports unconfigured with a fix when the env var is missing", async () => {
    const fetchImpl = respond(csvBody);
    const report = await loadCareerBoard({ env: {}, fetchImpl, now: NOW });
    expect(report.status).toBe("unconfigured");
    expect(report.error?.fix).toContain("CAREERS_SHEET_ID");
    expect(report.config).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns live jobs, hidden rows and the Melbourne date on the happy path", async () => {
    const report = await loadCareerBoard({ env: { CAREERS_SHEET_ID: ID }, fetchImpl: respond(csvBody), now: NOW });
    expect(report.status).toBe("ok");
    expect(report.today).toBe("2026-09-14");
    expect(report.jobs.map((j) => j.title)).toEqual(["Analyst"]);
    expect(report.hidden.map((h) => [h.row, h.reason])).toEqual([
      [3, "unpublished"],
      [4, "closed"],
    ]);
    expect(report.config).toEqual(config);
  });

  it("flags a tab without the required headers as wrong-tab, naming what it found", async () => {
    const report = await loadCareerBoard({
      env: { CAREERS_SHEET_ID: ID },
      fetchImpl: respond("Name,Score\nA,1\n"),
      now: NOW,
    });
    expect(report.status).toBe("wrong-tab");
    expect(report.error?.detail).toContain("Name, Score");
    expect(report.jobs).toEqual([]);
  });

  it("passes fetch failures through as statuses", async () => {
    const report = await loadCareerBoard({
      env: { CAREERS_SHEET_ID: ID },
      fetchImpl: respond("<!doctype html>", { type: "text/html" }),
      now: NOW,
    });
    expect(report.status).toBe("unreachable");
  });
});

describe("getCareerBoard (for the page)", () => {
  it("treats a missing id as a normal unconfigured state", async () => {
    vi.stubEnv("CAREERS_SHEET_ID", "");
    vi.stubGlobal("fetch", respond(csvBody));
    await expect(getCareerBoard()).resolves.toEqual({ status: "unconfigured" });
  });

  it("returns the jobs when the sheet reads cleanly", async () => {
    vi.stubEnv("CAREERS_SHEET_ID", ID);
    vi.stubGlobal("fetch", respond(csvBody));
    const board = await getCareerBoard();
    expect(board.status).toBe("ok");
    if (board.status === "ok") expect(board.jobs.map((j) => j.title)).toEqual(["Analyst"]);
  });

  it("throws on a broken sheet so ISR keeps the last good page", async () => {
    vi.stubEnv("CAREERS_SHEET_ID", ID);
    vi.stubGlobal("fetch", respond("<!doctype html>", { type: "text/html" }));
    await expect(getCareerBoard()).rejects.toThrow(/unreachable/);
  });
});
