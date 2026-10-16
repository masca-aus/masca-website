import {workspaceCatalogSchemaSQL} from "../features/access/workspaces/schema.ts";
/* This localhost-only fixture exercises conditional Payload collection shapes. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import pg from "pg";
import { getPayload, createLocalReq } from "payload";
import config from "../payload.config.ts";
import { committeeAccessSchemaSQL } from "../features/access/committeeSchema.ts";
const url = new URL(process.env.DATABASE_URI!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/committee_access_payload_qa_20261013");
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
await db.query(
  committeeAccessSchemaSQL("cms_calendar_preview", "media_calendar_preview"),
);
await db.query(workspaceCatalogSchemaSQL("cms_calendar_preview","media_calendar_preview"));
for (const [id, scope, roles] of [
  [
    9001,
    "QLD",
    { events: ["editor"], sponsors: ["editor"], media: ["editor"], organisations: ["editor"] },
  ],
  [9002, "NSW", { events: ["editor"] }],
  [9003, "QLD", { events: ["approver"], sponsors: ["approver"], organisations: ["approver"] }],
] as const) {
  const membership = {
    id: "fixture-" + id,
    committee: scope,
    roles,
    manager: false,
    expiresAt: "2027-12-31T14:00:00Z",
  };
  await db.query(
    `INSERT INTO cms_calendar_preview.users(id,email,role,status,committee_memberships,committee_access_reviewed_at,session_revision) VALUES($1,$2,'editor','active',$3,now(),'qa') ON CONFLICT(id) DO UPDATE SET committee_memberships=$3,committee_access_reviewed_at=now()`,
    [id, "fixture" + id + "@masca.org.au", JSON.stringify([membership])],
  );
}
// Exercising activated conditional collections must not rewrite staged generated types.
const qaConfig = await config;
qaConfig.typescript.autoGenerate = false;
const payload = await getPayload({ config: qaConfig });
try {
  const person = async (id: number) => ({
    ...(await payload.findByID({
      collection: "users",
      id,
      overrideAccess: true,
    })),
    collection: "users" as const,
  });
  const owner: any = await person(9001),
    foreign = await person(9002),
    approver: any = await person(9003);
  const request = async (user: any, id?: number) => {
    const req = await createLocalReq({ user }, payload);
    req.headers = new Headers({ origin: process.env.GOOGLE_AUTH_ORIGIN! });
    req.routeParams = { id: String(id) };
    return req;
  };
  const event = await payload.create({
    collection: "events",
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: {
      title: "Committee isolation QA",
      organisation: "MASCA QLD",
      description: "Local verification only",
      contactName: "Local QA",
      contactEmail: "qa@example.org",
      startDate: "2027-12-01T08:00:00Z",
      venue: "Local QA",
      state: "QLD",
      owningScope: "QLD",
      reviewStatus: "pending",
      _status: "draft",
    },
  });
  await assert.rejects(async () =>
    payload.findByID({
      collection: "events",
      id: event.id,
      draft: true,
      overrideAccess: false,
      req: await request(foreign),
    }),
  );
  await assert.rejects(async () =>
    payload.update({
      collection: "events",
      id: event.id,
      overrideAccess: false,
      req: await request(owner),
      data: { title: "Unsafe live mutation" },
    }),
  );
  await payload.update({
    collection: "events",
    id: event.id,
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: { title: "Edited private draft" },
  });
  const endpoints = payload.collections.events.config.endpoints as any[];
  const share = endpoints.find(
    (e) => e.path === "/:id/access-sharing" && e.method === "post",
  ).handler;
  const shareReq = await request(owner, event.id);
  shareReq.json = async () => ({ email: foreign.email, role: "editor" });
  const shared = await share(shareReq);
  assert.equal(shared.status, 200, await shared.text());
  const sharedDoc = await payload.findByID({
    collection: "events",
    id: event.id,
    draft: true,
    overrideAccess: false,
    req: await request(foreign),
  });
  assert.equal(sharedDoc.id, event.id);
  const removeReq = await request(owner, event.id);
  removeReq.json = async () => ({ remove: String(foreign.id) });
  const removed = await share(removeReq);
  assert.equal(removed.status, 200, await removed.text());
  await assert.rejects(async () =>
    payload.findByID({
      collection: "events",
      id: event.id,
      draft: true,
      overrideAccess: false,
      req: await request(foreign),
    }),
  );
  const review = endpoints.find((e) => e.path === "/:id/access-review").handler;
  for (const action of ["approve", "publish"]) {
    const req = await request(approver, event.id);
    req.json = async () => ({ action });
    const response = await review(req);
    assert.equal(response.status, 200, await response.text());
  }
  const published = await payload.findByID({
    collection: "events",
    id: event.id,
    overrideAccess: false,
    draft: false,
  });
  assert.equal(published._status, "published");
  assert.equal(published.reviewStatus, "approved");
  await assert.rejects(async () =>
    payload.update({
      collection: "events",
      id: event.id,
      overrideAccess: false,
      req: await request(owner),
      data: { title: "Bypass unpublish" },
    }),
  );
  await payload.update({
    collection: "events",
    id: event.id,
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: { title: "Future revision" },
  });
  const stillPublic = await payload.findByID({
    collection: "events",
    id: event.id,
    overrideAccess: false,
    draft: false,
  });
  assert.equal(stillPublic.title, "Edited private draft");
  await assert.rejects(async () =>
    payload.update({
      collection: "events",
      id: event.id,
      overrideAccess: false,
      req: await request(owner),
      data: { _status: "draft" },
    }),
  );
  await db.query(
    "UPDATE cms_calendar_preview.events SET access_published=true WHERE id=$1",
    [event.id],
  );
  await payload.update({
    collection: "events",
    id: event.id,
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: { title: "Legacy private draft" },
  });
  const organisation = await payload.create({
    collection: "organisations",
    draft: true,
    overrideAccess: false,
    req: await request({
      ...owner,
      committeeMemberships: [
        {
          ...owner.committeeMemberships![0],
          roles: { organisations: ["editor"] },
        },
      ],
    }),
    data: { name: "Directory QA", owningScope: "QLD" },
  });
  const orgReview = (
    payload.collections.organisations.config.endpoints as any[]
  ).find((e) => e.path === "/:id/access-review").handler;
  const orgApprover = {
    ...approver,
    committeeMemberships: [
      {
        ...approver.committeeMemberships![0],
        roles: { organisations: ["approver"] },
      },
    ],
  };
  const orgEditor = {
    ...owner,
    committeeMemberships: [
      {
        ...owner.committeeMemberships![0],
        roles: { organisations: ["editor"] },
      },
    ],
  };
  for (const action of ["approve", "publish"]) {
    const req = await request(orgApprover, organisation.id);
    req.json = async () => ({ action });
    const response = await orgReview(req);
    assert.equal(response.status, 200, await response.text());
  }
  await payload.update({
    collection: "organisations",
    id: organisation.id,
    draft: true,
    overrideAccess: false,
    req: await request(orgEditor),
    data: { name: "Future directory name" },
  });
  assert.equal(
    (
      await payload.findByID({
        collection: "organisations",
        id: organisation.id,
        overrideAccess: true,
        draft: false,
      })
    ).name,
    "Directory QA",
  );
  const assetId = (
    await db.query(
      `INSERT INTO cms_calendar_preview.media(alt,filename,mime_type,prefix,owning_scope,access_creator,access_published) VALUES('QA image','local-qa-'||gen_random_uuid()::text||'.jpg','image/jpeg','committee-private','QLD','9001',false) RETURNING id`,
    )
  ).rows[0].id;
  const sponsor = await payload.create({
    collection: "sponsors",
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: {
      name: "Published partner QA",
      date: "2026-10-13T00:00:00Z",
      logo: assetId,
      owningScope: "QLD",
    },
  });
  const sponsorReview = (
    payload.collections.sponsors.config.endpoints as any[]
  ).find((e) => e.path === "/:id/access-review").handler;
  for (const action of ["approve", "publish"]) {
    const req = await request(approver, sponsor.id);
    req.json = async () => ({ action });
    const response = await sponsorReview(req);
    assert.equal(response.status, 200, await response.text());
  }
  const publicSponsor = await payload.findByID({
    collection: "sponsors",
    id: sponsor.id,
    overrideAccess: false,
    draft: false,
    depth: 1,
  });
  assert.equal((publicSponsor.logo as any).id, assetId);
  assert.match((publicSponsor.logo as any).url, /api\/committee-media/);
  await payload.update({
    collection: "sponsors",
    id: sponsor.id,
    draft: true,
    overrideAccess: false,
    req: await request(owner),
    data: { name: "Future sponsor QA" },
  });
  assert.equal(
    (
      await payload.findByID({
        collection: "sponsors",
        id: sponsor.id,
        overrideAccess: false,
        draft: false,
      })
    ).name,
    "Published partner QA",
  );
  await assert.rejects(
    async () =>
      payload.delete({
        collection: "media",
        id: assetId,
        overrideAccess: false,
        req: await request(owner),
      }),
    /history/,
  );
  await db.query(
    `INSERT INTO cms_calendar_preview.users(id,email,role,status,committee_memberships,committee_access_reviewed_at,session_revision) VALUES(9004,'platform-fixture@masca.org.au','administrator','active','[]',now(),'qa') ON CONFLICT(id) DO NOTHING`,
  );
  const platform = await person(9004);
  const current: any = await person(9001);
  const renewed = current.committeeMemberships.map((m: any) => ({
    ...m,
    expiresAt: "2028-06-30T14:00:00Z",
  }));
  await payload.update({
    collection: "users",
    id: 9001,
    overrideAccess: false,
    req: await request(platform),
    data: {
      committeeMemberships: renewed,
      committeeAccessRevision: current.committeeAccessRevision,
    },
  });
  assert.ok(
    (
      await db.query(
        `SELECT 1 FROM cms_calendar_preview.committee_access_audit WHERE actor_id='9004' AND target_id='9001' AND committee='QLD'`,
      )
    ).rowCount,
  );
  await assert.rejects(
    async () =>
      payload.update({
        collection: "users",
        id: 9001,
        overrideAccess: false,
        req: await request(platform),
        data: {
          committeeMemberships: current.committeeMemberships,
          committeeAccessRevision: current.committeeAccessRevision,
        },
      }),
    /changed/,
  );

  await db.query(`INSERT INTO cms_calendar_preview.access_workspaces(id,name,kind,areas) VALUES('ws-payload-qa','Payload project QA','project','["events","media"]') ON CONFLICT(id) DO UPDATE SET status='active'`);
  for(const [id,role] of [[9005,'editor'],[9006,'approver']] as const){
    await db.query(`INSERT INTO cms_calendar_preview.users(id,email,role,status,committee_memberships,committee_access_reviewed_at,session_revision) VALUES($1,$2,'editor','active',$3,now(),'qa') ON CONFLICT(id) DO UPDATE SET committee_memberships=$3,committee_access_reviewed_at=now()`,[id,`fixture${id}@masca.org.au`,JSON.stringify([{id:`fixture-${id}`,committee:'ws-payload-qa',roles:{events:[role],media:[role]},manager:false,expiresAt:'2099-01-01T00:00:00Z'}])]);
  }
  const projectEditor:any=await person(9005),projectApprover:any=await person(9006);
  const projectEvent=await payload.create({collection:'events',draft:true,overrideAccess:false,req:await request(projectEditor),data:{title:'Project isolation QA',organisation:'MASA',description:'Local project verification',contactName:'Local QA',contactEmail:'qa@example.org',startDate:'2027-12-01T08:00:00Z',venue:'Local QA',state:'QLD',owningScope:'ws-payload-qa',reviewStatus:'pending',_status:'draft'}});
  await assert.rejects(async()=>payload.findByID({collection:'events',id:projectEvent.id,draft:true,overrideAccess:false,req:await request(foreign)}));
  const selfReq=await request(projectEditor,projectEvent.id);selfReq.json=async()=>({action:'approve'});assert.equal((await review(selfReq)).status,403);
  for(const action of ['approve','publish']){const req=await request(projectApprover,projectEvent.id);req.json=async()=>({action});const response=await review(req);assert.equal(response.status,200,await response.text())}
  await db.query(`UPDATE cms_calendar_preview.access_workspaces SET name='Renamed project QA',status='archived' WHERE id='ws-payload-qa'`);
  await assert.rejects(async()=>payload.update({collection:'events',id:projectEvent.id,draft:true,overrideAccess:false,req:await request(projectEditor),data:{title:'Stale authority'}}));
  const publicProject=await payload.findByID({collection:'events',id:projectEvent.id,overrideAccess:false});assert.equal(publicProject.owningScope,'ws-payload-qa');assert.equal(publicProject._status,'published');assert.equal(publicProject.state,'QLD');
  console.log('PASS: project ownership, cross-workspace privacy, independent review, archive revocation and public/geographic preservation.');
  console.log(
    "PASS: actual Payload scope/draft privacy, immediate sharing/revocation, independent event/sponsor/directory publication, preserved live revisions, populated private attachments, referenced-file deletion protection, atomic platform audits and stale membership rejection.",
  );
} finally {
  await payload.destroy();
  await db.end();
}

// Success-only exit: Payload keeps auxiliary adapter handles open after destroy.
process.exit(0);
