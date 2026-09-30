import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Payload } from "payload";
import {
  signWorkspaceSession,
  workspaceStrategy,
} from "../features/access/workspaceSession.ts";
export async function verifyWorkspacePreview(payload: Payload) {
  assert.equal(payload.db.schemaName, "cms_auth_preview");
  const admin = (
    await payload.find({
      collection: "users",
      limit: 1,
      where: { email: { equals: "admin@masca.org.au" } },
      overrideAccess: true,
    })
  ).docs[0];
  const prefix = "access-test-" + randomUUID().slice(0, 8);
  const editor = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: {
      email: prefix + "@masca.org.au",
      role: "editor",
      status: "active",
      grants: [{ area: "careers", scope: "QLD" }],
    } as never,
  });
  const adminReq = { user: { ...admin, collection: "users" as const } };
  const editorReq = { user: { ...editor, collection: "users" as const } };
  const created: number[] = [];
  try {
    for (const scope of ["QLD", "NSW"]) {
      const doc = await payload.create({
        collection: "careers",
        draft: true,
        overrideAccess: false,
        req: adminReq,
        data: {
          title: prefix + " " + scope,
          company: "Preview test",
          owningScope: scope,
        } as never,
      });
      created.push(doc.id);
    }
    const list = await payload.find({
      collection: "careers",
      draft: true,
      overrideAccess: false,
      req: editorReq,
      where: { id: { in: created } },
    });
    assert.equal(list.totalDocs, 2);
    await payload.findByID({ collection: "careers", id: created[1], draft: true, overrideAccess: false, req: editorReq });
    await assert.rejects(() =>
      payload.update({
        collection: "careers",
        id: created[1],
        draft: true,
        overrideAccess: false,
        req: editorReq,
        data: { title: "not allowed" },
      }),
    );
    await assert.rejects(() =>
      payload.update({
        collection: "careers",
        id: created[0],
        draft: true,
        overrideAccess: false,
        req: editorReq,
        data: { owningScope: "NSW" } as never,
      }),
    );
    await assert.rejects(() =>
      payload.delete({
        collection: "careers",
        id: created[1],
        overrideAccess: false,
        req: editorReq,
      }),
    );
    await assert.rejects(() =>
      payload.update({
        collection: "users",
        id: editor.id,
        overrideAccess: false,
        req: editorReq,
        data: { role: "administrator" } as never,
      }),
    );
    const versions = await payload.findVersions({
      collection: "careers",
      overrideAccess: false,
      req: editorReq,
      where: { parent: { equals: created[1] } },
    });
    assert.ok(versions.totalDocs > 0);
    const ownVersions = await payload.findVersions({
      collection: "careers",
      overrideAccess: false,
      req: editorReq,
      where: { parent: { equals: created[0] } },
    });
    assert.ok(ownVersions.totalDocs > 0);
    await payload.findVersionByID({
      collection: "careers",
      id: ownVersions.docs[0].id,
      overrideAccess: false,
      req: editorReq,
    });
    const viewer = await payload.update({ collection: "users", id: editor.id, overrideAccess: true,
      data: { permissions: { careers: { view: true, edit: false, scopes: [] } } } as never });
    const viewerReq = { user: { ...viewer, collection: "users" as const } };
    const viewed = await payload.find({ collection: "careers", draft: true, overrideAccess: false, req: viewerReq, where: { id: { in: created } } });
    assert.equal(viewed.totalDocs, 2);
    for (const id of created) {
      await assert.rejects(() => payload.update({ collection: "careers", id, draft: true, overrideAccess: false, req: viewerReq, data: { title: "forbidden" } }));
      await assert.rejects(() => payload.delete({ collection: "careers", id, overrideAccess: false, req: viewerReq }));
    }
    await assert.rejects(() => payload.create({ collection: "careers", draft: true, overrideAccess: false, req: viewerReq, data: { title: "forbidden", owningScope: "QLD" } as never }));
    await assert.rejects(() => payload.find({ collection: "events", draft: true, overrideAccess: false, req: viewerReq }));
    const broadEditor = await payload.update({
      collection: "users",
      id: editor.id,
      overrideAccess: true,
      data: { allContentAccess: true } as never,
    });
    const broadReq = { user: { ...broadEditor, collection: "users" as const } };
    const allRecords = await payload.find({
      collection: "careers",
      draft: true,
      overrideAccess: false,
      req: broadReq,
      where: { id: { in: created } },
    });
    assert.equal(allRecords.totalDocs, 2);
    await payload.update({
      collection: "careers",
      id: created[1],
      draft: true,
      overrideAccess: false,
      req: broadReq,
      data: { title: prefix + " allowed national editing" },
    });
    await assert.rejects(() =>
      payload.update({
        collection: "users",
        id: editor.id,
        overrideAccess: false,
        req: broadReq,
        data: { role: "administrator" } as never,
      }),
    );
    const user = await payload.findByID({
      collection: "users",
      id: editor.id,
      overrideAccess: true,
    });
    const token = await signWorkspaceSession(
      editor.id,
      (user as unknown as { sessionRevision: string }).sessionRevision,
      payload.secret,
    );
    const headers = new Headers({
      cookie: `${payload.config.cookiePrefix}-token=${token}`,
    });
    assert.ok(
      (await workspaceStrategy.authenticate({ headers, payload } as never))
        .user,
    );
    await payload.update({
      collection: "users",
      id: editor.id,
      overrideAccess: true,
      data: { status: "suspended" } as never,
    });
    assert.equal(
      (await workspaceStrategy.authenticate({ headers, payload } as never))
        .user,
      null,
    );
    await payload.update({
      collection: "users",
      id: editor.id,
      overrideAccess: true,
      data: { status: "active" } as never,
    });
    assert.equal(
      (await workspaceStrategy.authenticate({ headers, payload } as never))
        .user,
      null,
    );
    console.log(
      "PASS preview integration: cross-state list/read/update/delete/version boundaries, account escalation, suspension and stale session rejection.",
    );
  } finally {
    for (const id of created)
      await payload.delete({
        collection: "careers",
        id,
        overrideAccess: true,
        req: adminReq,
      });
    await payload.delete({
      collection: "users",
      id: editor.id,
      overrideAccess: true,
    });
  }
}
