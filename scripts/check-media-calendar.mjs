import { chromium } from "@playwright/test";
import { SignJWT } from "jose";
import { createHmac, createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import sharp from "sharp";
import pg from "pg";
process.loadEnvFile(".env.local");
const origin = "http://localhost:3100";
const output = process.env.CALENDAR_CHECK_OUTPUT || ".calendar-check";
mkdirSync(output, { recursive: true });
async function session(id) {
  return new SignJWT({
    id,
    collection: "users",
    revision: "calendar-preview-qa-v1",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(origin)
    .setAudience("masca-cms")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(
      createHmac(
        "sha256",
        createHash("sha256")
          .update(process.env.PAYLOAD_SECRET)
          .digest("hex")
          .slice(0, 32),
      )
        .update("masca-workspace-session-v1")
        .digest(),
    );
}
assert.equal(new URL(origin).hostname, "localhost");
assert.equal(process.env.CALENDAR_PREVIEW_TESTS, "true");
assert.equal(process.env.WORKSPACE_PREVIEW_SCHEMA, "cms_calendar_preview");
assert.equal(new URL(process.env.DATABASE_URI).hostname, "127.0.0.1");
assert.equal(new URL(process.env.DATABASE_URI).pathname, "/calendarqa");
const database = new pg.Client({ connectionString: process.env.DATABASE_URI });
await database.connect();
if (process.env.CALENDAR_CHECK_PRESERVE !== "true")
  await database.query(
    "TRUNCATE media_calendar_preview.posts, media_calendar_preview.assets, media_calendar_preview.revisions, media_calendar_preview.notifications, media_calendar_preview.presence",
  );
await database.end();
const browser = await chromium.launch({ headless: true });
try {
  const a = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    b = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  for (const [context, id] of [
    [a, 1],
    [b, 2],
  ])
    await context.addCookies([
      {
        name: "payload-token",
        value: await session(id),
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  const errors = [];
  const page = await a.newPage();
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("PAGE ERROR:", e.message);
  });
  const api = async (context, body) => {
    const r = await context.request.post(`${origin}/api/media-calendar`, {
      headers: { Origin: origin },
      data: body,
    });
    const d = await r.json();
    if (!r.ok()) throw new Error(`${r.status()} ${d.error}`);
    return d;
  };
  await page.goto(`${origin}/admin/media-calendar`);
  await page
    .getByRole("heading", { name: "Media calendar", exact: true })
    .waitFor({ timeout: 90000 });
  await page.getByRole("button", { name: "New post" }).click();
  await page.getByLabel("Post title", { exact: true }).waitFor();
  const id = new URL(page.url()).searchParams.get("post");
  assert(id);
  await page
    .getByLabel("Post title", { exact: true })
    .fill("MASA · A night to connect");
  await page.getByLabel("Post title", { exact: true }).press("Tab");
  await page
    .getByLabel("Planned publishing date and time")
    .fill("2026-10-17T18:00");
  await page
    .getByLabel("Post category")
    .selectOption("00000000-0000-4000-8000-000000000001");
  const png = await sharp(
    Buffer.from(
      `<svg width="640" height="640" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="640" fill="#08045f"/><circle cx="560" cy="70" r="150" fill="#242182"/><circle cx="70" cy="600" r="170" fill="#242182"/><text x="50" y="75" font-family="Arial" font-size="20" fill="#ffcc00" font-weight="bold">MASCA NATIONAL</text><text x="50" y="280" font-family="Arial" font-size="90" font-weight="bold" fill="white">MASA</text><text x="50" y="330" font-family="Arial" font-size="25" fill="white">A night to connect.</text><line x1="50" y1="390" x2="145" y2="390" stroke="#ffcc00" stroke-width="6"/><text x="50" y="475" font-family="Arial" font-size="20" fill="white">Connect. Celebrate. Belong.</text><text x="50" y="565" font-family="Arial" font-size="16" fill="#bbbce1">DEMONSTRATION POSTER · TEST ONLY</text></svg>`,
    ),
  )
    .png()
    .toBuffer();
  const integrity = (
    await api(a, {
      action: "create",
      patch: { title: "Private media integrity check" },
    })
  ).post;
  const upload = await a.request.post(`${origin}/api/media-calendar/assets`, {
    headers: { Origin: origin },
    data: {
      action: "init",
      postId: integrity.id,
      name: "private.png",
      mime: "image/png",
      size: png.length,
    },
  });
  assert.equal(upload.status(), 200);
  const uploadData = await upload.json();
  const put = await a.request.put(uploadData.url, {
    headers: { "Content-Type": "image/png" },
    data: png,
  });
  assert.equal(put.status(), 200);
  const attached = await a.request.post(`${origin}/api/media-calendar/assets`, {
    headers: { Origin: origin },
    data: {
      action: "finish",
      id: uploadData.id,
      expectedVersion: integrity.version,
    },
  });
  assert.equal(attached.status(), 200);
  await a.request.put(uploadData.url, {
    headers: { "Content-Type": "image/png" },
    data: Buffer.alloc(png.length),
  });
  const privateRead = await a.request.get(
    `${origin}/api/media-calendar/assets?id=${uploadData.id}`,
  );
  assert.deepEqual(
    await privateRead.body(),
    png,
    "Finalised media must be immutable even while the upload URL remains valid",
  );
  console.log("Private finalised media integrity passed.");
  let failUpload = true;
  await page.route("http://127.0.0.1:4569/**", async (route) => {
    if (route.request().method() === "PUT" && failUpload) {
      failUpload = false;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "test-poster.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.equal(await page.locator(".mc-upload-preview").count(), 1);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".mc-attachment").length === 1,
    {},
    { timeout: 30000 },
  );
  const caption = page.getByRole("textbox", { name: "Instagram caption" });
  await caption.waitFor();
  await caption.click();
  await page.keyboard.insertText(
    "Join us for a night of good food, new friends and Malaysian spirit. 🇲🇾\n\n#MASCA #MASA",
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector(".mc-caption .mc-section-label")
        ?.textContent?.includes("Saved"),
    {},
    { timeout: 30000 },
  );
  const other = await b.newPage();
  other.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("OTHER PAGE ERROR:", e.message);
  });
  await other.goto(`${origin}/admin/media-calendar?post=${id}`);
  const second = other.getByRole("textbox", { name: "Instagram caption" });
  await second.waitFor();
  await other.waitForFunction(() =>
    document.querySelector(".mc-caption-input")?.textContent?.includes("#MASA"),
  );
  await caption.click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" A");
  await second.click();
  await other.keyboard.press("Home");
  await other.keyboard.insertText("B ");
  await page.waitForFunction(
    () =>
      document.querySelector(".mc-caption-input")?.textContent?.includes("B "),
    {},
    { timeout: 15000 },
  );
  await other.waitForFunction(
    () =>
      document.querySelector(".mc-caption-input")?.textContent?.includes(" A"),
    {},
    { timeout: 15000 },
  );
  const plain = async (p) =>
    p.locator(".mc-caption-input .cm-line").evaluateAll((lines) =>
      lines
        .map((line) => {
          const node = line.cloneNode(true);
          for (const c of node.querySelectorAll(".cm-ySelectionCaret"))
            c.remove();
          return node.textContent.replaceAll("\u2060", "");
        })
        .join("\n"),
    );
  const one = await plain(page),
    two = await plain(other);
  assert.equal(one, two, "simultaneous captions must converge");
  console.log("Two-browser caption merge passed.");
  await page.locator(".mc-panel").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: `${output}/panel.png`,
  });
  await page
    .getByRole("button", { name: "Request review", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".mc-panel-header .mc-status")?.textContent ===
      "In review",
    {},
    { timeout: 15000 },
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Approve post", exact: true })
      .count(),
    0,
    "creator cannot approve",
  );
  assert.equal(
    await other
      .getByRole("button", { name: "Approve post", exact: true })
      .count(),
    0,
    "contributor cannot approve",
  );
  await page
    .getByRole("button", { name: "Withdraw review", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".mc-panel-header .mc-status")?.textContent ===
      "Draft",
  );
  await b.setOffline(true);
  await second.click();
  await other.keyboard.insertText(" Offline recovery 🇲🇾");
  await other.getByLabel("Recoverable caption").waitFor();
  const lockedBefore = (
    await (await a.request.get(`${origin}/api/media-calendar?id=${id}`)).json()
  ).post;
  await api(a, {
    id,
    action: "review",
    expectedRevision: lockedBefore.contentRevision,
  });
  await b.setOffline(false);
  await other.waitForFunction(
    () =>
      document.querySelector(".mc-panel-header .mc-status")?.textContent ===
      "In review",
  );
  assert(
    (await other.getByLabel("Recoverable caption").inputValue()).includes(
      "Offline recovery",
    ),
  );
  const locked = (
    await (await a.request.get(`${origin}/api/media-calendar?id=${id}`)).json()
  ).post;
  assert(!locked.caption.includes("Offline recovery"));
  await api(a, {
    id,
    action: "withdraw",
    expectedRevision: locked.contentRevision,
  });
  await other.waitForFunction(
    () =>
      document.querySelector(".mc-panel-header .mc-status")?.textContent ===
      "Draft",
  );
  await other
    .getByRole("button", { name: "Retry saving", exact: true })
    .click();
  await other.getByLabel("Recoverable caption").waitFor({ state: "detached" });
  console.log("Disconnected caption recovery across review lock passed.");
  let failDetails = true;
  await page.route(`${origin}/api/media-calendar`, async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON()?.action === "patch" &&
      failDetails
    ) {
      failDetails = false;
      await route.fulfill({
        status: 409,
        json: { error: "Test conflict: load latest and retry." },
      });
    } else await route.continue();
  });
  await page
    .getByLabel("Planned publishing date and time")
    .fill("2026-10-18T18:00");
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Planned publishing date and time").inputValue(),
    "2026-10-18T18:00",
  );
  await page.getByRole("button", { name: "Load latest", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .waitFor({ state: "detached" });
  console.log("Conflicting detail input preservation and retry passed.");
  await page.getByRole("button", { name: "Close post", exact: true }).click();
  await page.waitForURL(`${origin}/admin/media-calendar`);
  await page.locator(".mc-overlay").waitFor({ state: "detached" });
  const p2 = (
    await api(a, {
      action: "create",
      patch: {
        title: "Careers · Meet your next opportunity",
        category: "00000000-0000-4000-8000-000000000002",
        plannedAt: "2026-10-13T08:00:00Z",
      },
    })
  ).post;
  await api(a, {
    action: "create",
    patch: {
      title: "Welfare · Your mid-semester check-in",
      category: "00000000-0000-4000-8000-000000000004",
      plannedAt: "2026-10-21T08:00:00Z",
    },
  });
  await api(a, {
    action: "create",
    patch: {
      title: "November welcome reel",
      category: "00000000-0000-4000-8000-000000000003",
      type: "reel",
    },
  });
  await page.reload();
  await page
    .getByRole("button", { name: /Careers · Meet your next opportunity/ })
    .first()
    .waitFor();
  await page.screenshot({
    path: `${output}/calendar.png`,
    fullPage: true,
  });
  const stale = await a.request.post(`${origin}/api/media-calendar`, {
    headers: { Origin: origin },
    data: {
      id: p2.id,
      action: "patch",
      expectedVersion: 0,
      patch: { title: "stale" },
    },
  });
  assert.equal(stale.status(), 400);
  const race = await Promise.all(
    [a, b].map((c) =>
      c.request.post(`${origin}/api/media-calendar`, {
        headers: { Origin: origin },
        data: {
          id: p2.id,
          action: "patch",
          expectedVersion: p2.version,
          patch: { plannedAt: "2026-10-15T08:00:00Z" },
        },
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status()).sort(), [200, 409]);
  console.log("Real Postgres concurrent metadata lock passed.");
  await page.reload();
  await page
    .getByRole("button", { name: /Careers · Meet your next opportunity/ })
    .first()
    .waitFor();
  const dragging = page.locator(`[data-post-id="${p2.id}"]`);
  await page.locator(".mc-overlay").waitFor({ state: "detached" });
  await dragging.dragTo(
    page.locator(".mc-day").filter({
      has: page.getByRole("button", { name: "Create post on 2026-10-16" }),
    }),
  );
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll(".mc-day"))
      .find((day) =>
        day.querySelector('button[aria-label="Create post on 2026-10-16"]'),
      )
      ?.textContent?.includes("Careers · Meet your next opportunity"),
  );
  console.log("Calendar drag rescheduling passed.");

  let approved = (
    await (
      await a.request.get(`${origin}/api/media-calendar?id=${integrity.id}`)
    ).json()
  ).post;
  approved = (
    await api(a, {
      id: approved.id,
      action: "review",
      expectedRevision: approved.contentRevision,
    })
  ).post;
  const approvals = await Promise.all(
    [1, 2].map(() =>
      b.request.post(`${origin}/api/media-calendar`, {
        headers: { Origin: origin },
        data: {
          id: approved.id,
          action: "approve",
          expectedRevision: approved.contentRevision,
        },
      }),
    ),
  );
  assert.deepEqual(approvals.map((r) => r.status()).sort(), [200, 409]);
  approved = (
    await (
      await a.request.get(`${origin}/api/media-calendar?id=${integrity.id}`)
    ).json()
  ).post;
  approved = (
    await api(a, {
      id: approved.id,
      action: "patch",
      expectedVersion: approved.version,
      patch: { plannedAt: "2026-10-24T08:00:00Z" },
    })
  ).post;
  assert.equal(approved.status, "approved");
  const posted = (
    await api(a, {
      id: approved.id,
      action: "posted",
      expectedRevision: approved.contentRevision,
      url: "https://www.instagram.com/p/test-only/",
    })
  ).post;
  const immutable = await a.request.post(`${origin}/api/media-calendar`, {
    headers: { Origin: origin },
    data: {
      id: posted.id,
      action: "patch",
      expectedVersion: posted.version,
      patch: { title: "should not change" },
    },
  });
  assert.equal(immutable.status(), 409);
  const duplicate = (
    await api(a, {
      id: posted.id,
      action: "duplicate",
      expectedRevision: posted.contentRevision,
    })
  ).post;
  assert.equal(duplicate.status, "draft");
  assert.equal(duplicate.approval, null);
  console.log(
    "Independent approval race, date preservation, manual posting and duplication passed.",
  );
  const revocationDB = new pg.Client({
    connectionString: process.env.DATABASE_URI,
  });
  await revocationDB.connect();
  try {
    await revocationDB.query(
      "UPDATE cms_calendar_preview.users SET status='suspended' WHERE id=2",
    );
    const revoked = await b.request.post(
      `${origin}/api/media-calendar/collaboration`,
      {
        headers: { Origin: origin },
        data: { clientId: crypto.randomUUID(), postId: id, cursor: null },
      },
    );
    assert.equal(revoked.status(), 403);
    const revokedWrite = await b.request.post(`${origin}/api/media-calendar`, {
      headers: { Origin: origin },
      data: { id, action: "comment", body: "denied", mentions: [] },
    });
    assert.equal(revokedWrite.status(), 403);
  } finally {
    await revocationDB.query(
      "UPDATE cms_calendar_preview.users SET status='active' WHERE id=2",
    );
    await revocationDB.end();
  }
  console.log("Current account revocation checks passed.");
  const anon = await browser.newContext();
  const denied = await anon.request.get(
    `${origin}/api/media-calendar?id=${id}`,
  );
  assert.equal(denied.status(), 403);
  const mobile = await a.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${origin}/admin/media-calendar`);
  await mobile.getByRole("button", { name: "List", exact: true }).waitFor();
  await mobile.waitForFunction(() =>
    document
      .querySelector(".mc-view-toggle button[aria-pressed=true]")
      ?.textContent?.includes("List"),
  );
  await mobile.screenshot({
    path: `${output}/mobile.png`,
    fullPage: true,
  });
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await page.screenshot({
    path: `${output}/dark.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, [], "No uncaught page errors during recovery flows");
  writeFileSync(
    `${output}/browser-state.json`,
    JSON.stringify({ postId: id, caption: one }),
  );
  console.log(
    "Calendar desktop/mobile/dark and anonymous access checks passed.",
  );
} finally {
  await browser.close();
}
