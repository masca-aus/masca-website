import { chromium } from "@playwright/test";
import sharp from "sharp";
import pg from "pg";
import { createHash, createHmac } from "node:crypto";
import { SignJWT } from "jose";
import assert from "node:assert/strict";
import * as Y from "yjs";
process.loadEnvFile(".env.local");
assert.equal(process.env.CALENDAR_PREVIEW_TESTS, "true");
assert.equal(process.env.WORKSPACE_PREVIEW_SCHEMA, "cms_calendar_preview");
assert.equal(new URL(process.env.DATABASE_URI).hostname, "127.0.0.1");
assert.equal(new URL(process.env.DATABASE_URI).pathname, "/calendarqa");
const origin = "http://localhost:3100";
const key = createHmac(
  "sha256",
  createHash("sha256")
    .update(process.env.PAYLOAD_SECRET)
    .digest("hex")
    .slice(0, 32),
)
  .update("masca-workspace-session-v1")
  .digest();
const browser = await chromium.launch();
const context = await browser.newContext();
const token = await new SignJWT({
  id: 1,
  collection: "users",
  revision: "calendar-preview-qa-v1",
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer(origin)
  .setAudience("masca-cms")
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(key);
await context.addCookies([
  { name: "payload-token", value: token, url: origin, httpOnly: true },
]);
const api = async (data, path = "") => {
  const r = await context.request.post(origin + "/api/media-calendar" + path, {
    headers: { Origin: origin },
    data,
  });
  return { status: r.status(), body: await r.json() };
};
const detail = async (id) =>
  (await context.request.get(origin + "/api/media-calendar?id=" + id)).json();
const create = async (patch) =>
  (await api({ action: "create", patch })).body.post;
const png = await sharp({
  create: { width: 2, height: 2, channels: 3, background: "#09055f" },
})
  .png()
  .toBuffer();
const init = async (post) =>
  (
    await api(
      {
        action: "init",
        postId: post.id,
        name: "qa.png",
        mime: "image/png",
        size: png.length,
      },
      "/assets",
    )
  ).body;
const attach = async (post) => {
  const upload = await init(post);
  await context.request.put(upload.url, {
    headers: { "Content-Type": "image/png" },
    data: png,
  });
  return api(
    { action: "finish", id: upload.id, expectedVersion: post.version },
    "/assets",
  );
};
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push([name, "PASS"]);
  } catch (e) {
    results.push([name, "FAIL: " + e.message]);
  }
}
await check("unfinished uploads recoverable after reload", async () => {
  const p = await create({ title: "QA abandoned upload" });
  const upload = await init(p);
  const d = await detail(p.id);
  assert(
    d.pendingUploads?.some((a) => a.id === upload.id),
    "detail must include unfinished uploads for cancellation",
  );
  const page = await context.newPage();
  await page.goto(origin + "/admin/media-calendar?post=" + p.id);
  await page
    .getByRole("button", {
      name: "Cancel unfinished upload qa.png",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Cancel unfinished upload qa.png",
      exact: true,
    })
    .waitFor({ state: "detached" });
  assert.equal((await detail(p.id)).pendingUploads.length, 0);
  await page.close();
});
await check("Reel rejects an image on attachment", async () => {
  const p = await create({ title: "QA reel format", type: "reel" });
  const r = await attach(p);
  assert.equal(r.status, 400);
});
await check("Story rejects a second attachment", async () => {
  let p = await create({ title: "QA story format", type: "story" });
  p = (await attach(p)).body.post;
  const r = await attach(p);
  assert.equal(r.status, 400);
});
await check("inactive old owner does not block current editors", async () => {
  const p = await create({ title: "QA former owner", owner: "2" });
  const db = new pg.Client({ connectionString: process.env.DATABASE_URI });
  await db.connect();
  try {
    await db.query(
      "UPDATE cms_calendar_preview.users SET status='suspended' WHERE id=2",
    );
    const r = await api({
      id: p.id,
      action: "comment",
      body: "Current editor can still discuss the post",
      mentions: [],
    });
    assert.equal(r.status, 200);
  } finally {
    await db.query(
      "UPDATE cms_calendar_preview.users SET status='active' WHERE id=2",
    );
    await db.end();
  }
});
await check(
  "locked reopened caption retries durable local update",
  async () => {
    const p = (
      await attach(await create({ title: "QA recovered locked caption" }))
    ).body.post;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(p.captionState, "base64"));
    doc.getText("caption").insert(0, "Recovered caption 🇲🇾");
    const saved = {
      text: doc.getText("caption").toString(),
      update: Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64"),
    };
    await api({
      id: p.id,
      action: "review",
      expectedRevision: p.contentRevision,
    });
    const page = await context.newPage();
    await page.goto(origin + "/admin/media-calendar");
    await page.evaluate(
      ({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)),
      { key: `masca-caption:1:${p.id}`, saved },
    );
    await page.goto(origin + "/admin/media-calendar?post=" + p.id);
    await page.getByLabel("Recoverable caption").waitFor();
    await api({
      id: p.id,
      action: "withdraw",
      expectedRevision: p.contentRevision,
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".mc-panel-header .mc-status")?.textContent ===
        "Draft",
    );
    await page
      .getByRole("button", { name: "Retry saving", exact: true })
      .click();
    await page.getByLabel("Recoverable caption").waitFor({ state: "detached" });
    assert(
      (await detail(p.id)).post.caption.includes("Recovered caption"),
      "Recovered text must be saved, not simply hidden",
    );
    await page.close();
  },
);
await check("remote reference changes preserve local typing", async () => {
  const p = await create({ title: "QA link draft" });
  const page = await context.newPage();
  await page.goto(origin + "/admin/media-calendar?post=" + p.id);
  await page.getByText("Post details", { exact: true }).click();
  const links = page.getByLabel("Reference links");
  await links.fill("https://example.com/local");
  await api({
    id: p.id,
    action: "patch",
    expectedVersion: p.version,
    patch: { links: ["https://example.com/remote"] },
  });
  await page.waitForFunction(
    () =>
      document.querySelector('.mc-panel input[aria-label="Post title"]')
        ?.value === "QA link draft",
  );
  await page.waitForTimeout(1800);
  assert.equal(await links.inputValue(), "https://example.com/local");
  await page.close();
});
await check(
  "affected editor can withdraw with locked unsent caption",
  async () => {
    const p = (await attach(await create({ title: "QA blocked withdrawal" })))
      .body.post;
    const page = await context.newPage();
    await page.goto(origin + "/admin/media-calendar?post=" + p.id);
    const caption = page.getByRole("textbox", { name: "Instagram caption" });
    await caption.waitFor();
    await context.setOffline(true);
    await caption.fill("Unsent local caption");
    await page.getByLabel("Recoverable caption").waitFor();
    await api({
      id: p.id,
      action: "review",
      expectedRevision: p.contentRevision,
    });
    await context.setOffline(false);
    await page.waitForFunction(
      () =>
        document.querySelector(".mc-panel-header .mc-status")?.textContent ===
        "In review",
    );
    await page
      .getByRole("button", { name: "Withdraw review", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".mc-panel-header .mc-status")?.textContent ===
        "Draft",
      {},
      { timeout: 4000 },
    );
    await page.close();
  },
);
await check(
  "affected editor can close and keep locked unsent caption",
  async () => {
    const p = (await attach(await create({ title: "QA blocked close" }))).body
      .post;
    const page = await context.newPage();
    await page.goto(origin + "/admin/media-calendar?post=" + p.id);
    const caption = page.getByRole("textbox", { name: "Instagram caption" });
    await caption.waitFor();
    await context.setOffline(true);
    await caption.fill("Keep me after closing");
    await page.getByLabel("Recoverable caption").waitFor();
    await api({
      id: p.id,
      action: "review",
      expectedRevision: p.contentRevision,
    });
    await context.setOffline(false);
    await page.waitForFunction(
      () =>
        document.querySelector(".mc-panel-header .mc-status")?.textContent ===
        "In review",
    );
    await page.getByRole("button", { name: "Close post", exact: true }).click();
    await page
      .locator(".mc-overlay")
      .waitFor({ state: "detached", timeout: 4000 });
    const saved = await page.evaluate(
      (key) => localStorage.getItem(key),
      `masca-caption:1:${p.id}`,
    );
    assert(saved?.includes("Keep me after closing"));
    await page.close();
  },
);
await check("remote video metadata refreshes without reloading", async () => {
  const p = await create({ title: "QA remote video", type: "story" });
  const page = await context.newPage();
  await page.goto(origin + "/admin/media-calendar?post=" + p.id);
  await page.getByLabel("Post title", { exact: true }).waitFor();
  const video = Buffer.from([
    0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0, 105, 115,
    111, 109, 0, 0, 0, 0,
  ]);
  const upload = (
    await api(
      {
        action: "init",
        postId: p.id,
        name: "qa.mp4",
        mime: "video/mp4",
        size: video.length,
      },
      "/assets",
    )
  ).body;
  await context.request.put(upload.url, {
    headers: { "Content-Type": "video/mp4" },
    data: video,
  });
  const r = await api(
    { action: "finish", id: upload.id, expectedVersion: p.version },
    "/assets",
  );
  assert.equal(r.status, 200);
  await page
    .locator(".mc-attachment")
    .getByText("1. qa.mp4", { exact: true })
    .waitFor({ timeout: 4000 });
  assert.equal(await page.locator(".mc-attachment .mc-video-tile").count(), 1);
  await page.close();
});
await check("list headings follow Brisbane in Auckland browser", async () => {
  const p = await create({
    title: "QA timezone group",
    plannedAt: "2026-10-10T00:00:00Z",
  });
  const nz = await browser.newContext({ timezoneId: "Pacific/Auckland" });
  await nz.addCookies([
    { name: "payload-token", value: token, url: origin, httpOnly: true },
  ]);
  const page = await nz.newPage();
  await page.goto(origin + "/admin/media-calendar");
  await page.getByRole("button", { name: "List", exact: true }).click();
  const group = page
    .locator(".mc-list section")
    .filter({ has: page.locator(`[data-post-id="${p.id}"]`) });
  assert.equal(await group.locator("h3").innerText(), "Sat, 10 Oct");
  await nz.close();
});
console.log(JSON.stringify(results, null, 2));
await browser.close();
if (results.some((r) => r[1] !== "PASS")) process.exitCode = 1;
