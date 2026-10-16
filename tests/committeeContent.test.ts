import { afterEach, describe, expect, it, vi } from "vitest";
import { configureWorkspace } from "../features/access/configureWorkspace";
import {
  guardCommitteeChange,
  contentRevision,
} from "../features/access/committeeContent";
const membership = (roles: string[]) => [
  {
    id: "q",
    committee: "QLD",
    roles: { events: roles },
    manager: false,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
];
const editor = {
  id: 1,
  email: "editor@masca.org.au",
  status: "active",
  committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
  role: "editor",
  committeeMemberships: membership(["editor"]),
};
const approver = {
  ...editor,
  id: 2,
  committeeMemberships: membership(["approver"]),
};
const doc = {
  id: 3,
  owningScope: "QLD",
  title: "Draft",
  _status: "draft",
  accessCreator: "1",
  accessContributors: ["1"],
  sharedWith: [],
};
afterEach(() => vi.unstubAllEnvs());
describe("committee CMS boundaries", () => {
  it("requires independent approval and forbids creator publication", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    expect(() =>
      guardCommitteeChange(
        "events",
        { _status: "published" },
        doc,
        editor as never,
      ),
    ).toThrow();
    expect(() =>
      guardCommitteeChange(
        "events",
        { _status: "published" },
        doc,
        approver as never,
      ),
    ).toThrow(/approv/i);
  });
  it("invalidates approval when a contributor changes content", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    const approved = {
      ...doc,
      accessReview: {
        status: "approved",
        revision: contentRevision(doc),
        approver: "2",
        approvedAt: "2026-10-13T00:00:00.000Z",
      },
    };
    const result = guardCommitteeChange(
      "events",
      { title: "Changed" },
      approved,
      editor as never,
      undefined,
      true,
    );
    expect(result.accessReview).toBeNull();
    expect(result.accessContributors).toContain("1");
  });
  it("shared editors cannot transfer, publish or forge approval", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    const actor = {
      ...editor,
      id: 4,
      committeeMemberships: [{ ...membership([])[0], committee: "VIC" }],
    };
    const shared = { ...doc, sharedWith: [{ userId: "4", role: "editor" }] };
    expect(
      guardCommitteeChange(
        "events",
        { title: "Collaboration" },
        shared,
        actor as never,
        undefined,
        true,
      ).title,
    ).toBe("Collaboration");
    for (const patch of [
      { owningScope: "VIC" },
      { _status: "published" },
      { accessReview: { status: "approved" } },
      { sharedWith: [] },
    ])
      expect(() =>
        guardCommitteeChange("events", patch, shared, actor as never),
      ).toThrow();
  });
  it("does not grant content bypass to platform administrators", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    expect(() =>
      guardCommitteeChange("events", { title: "Bypass" }, doc, {
        ...editor,
        role: "administrator",
        committeeMemberships: [],
      } as never),
    ).toThrow();
  });
  it("allows editors to save a published record as a draft, and requires review before changing publication", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    const published = { ...doc, _status: "published" };
    expect(
      guardCommitteeChange(
        "events",
        { title: "Draft changes", _status: "draft" },
        published,
        editor as never,
        undefined,
        true,
      ),
    ).toMatchObject({ _status: "draft", accessReview: null });
    expect(() =>
      guardCommitteeChange(
        "events",
        { _status: "draft" },
        published,
        editor as never,
      ),
    ).toThrow();
    const approved = {
      ...doc,
      accessReview: {
        status: "approved",
        revision: contentRevision(doc),
        approver: "2",
      },
    };
    expect(
      guardCommitteeChange(
        "events",
        { _status: "published" },
        approved,
        approver as never,
      ),
    ).toMatchObject({ _status: "published" });
  });
  it("rejects unreviewed accounts and guessed foreign private attachments", async () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    expect(() =>
      guardCommitteeChange("events", { title: "Unreviewed" }, doc, {
        ...editor,
        committeeAccessReviewedAt: null,
      } as never),
    ).toThrow();
    const hooks = configureWorkspace([{ slug: "events", fields: [] }])[0].hooks!
      .beforeChange!;
    const validate = hooks[1];
    const args = {
      data: { poster: 88 },
      originalDoc: doc,
      req: {
        user: editor,
        transactionID: "test",
        payload: {
          db: {
            sessions: {
              test: {
                db: { execute: vi.fn().mockResolvedValue({ rows: [] }) },
              },
            },
          },
          findByID: vi.fn().mockResolvedValue({
            id: 88,
            owningScope: "NSW",
            accessPublished: false,
            sharedWith: [],
          }),
        },
      },
    };
    await expect(validate(args as never)).rejects.toThrow("Choose an image");
    args.req.payload.findByID.mockResolvedValue({
      id: 88,
      owningScope: "NSW",
      accessPublished: true,
      sharedWith: [],
    });
    await expect(validate(args as never)).resolves.toEqual({ poster: 88 });
  });
  it("adds private metadata and denies unassigned public library uploads", async () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    const media = configureWorkspace([
      { slug: "media", fields: [], upload: true },
    ])[0];
    expect(
      await media.access!.create!({ req: { user: editor } } as never),
    ).toBe(false);
    const collection = configureWorkspace([{ slug: "events", fields: [] }])[0];
    const field = collection.fields.find(
      (f) => "name" in f && f.name === "sharedWith",
    )!;
    expect(
      "access" in field &&
        field.access?.read?.({ req: { user: null } } as never),
    ).toBe(false);
  });
  it("keeps trusted server bootstrap empty defaults unreviewed and rejects bootstrap grants", () => {
    const hook = configureWorkspace([{ slug: "users", fields: [] }])[0].hooks!
      .beforeChange![0];
    const args = {
      data: {
        email: "bootstrap@masca.org.au",
        role: "administrator",
        status: "active",
        committeeMemberships: [],
      },
      req: { user: null },
      context: { workspaceLogin: true },
      operation: "create",
    };
    expect(hook(args as never)).not.toHaveProperty("committeeAccessReviewedAt");
    expect(() =>
      hook({
        ...args,
        data: { ...args.data, committeeMemberships: membership(["editor"]) },
      } as never),
    ).toThrow("Only platform administrators");
  });
  it("preserves media and organisation creation ownership with the rollout disabled", () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "false");
    for (const slug of ["media", "organisations"]) {
      const collection = configureWorkspace([{ slug, fields: [] }])[0];
      const field = collection.fields.find(
        (f) => "name" in f && f.name === "owningScope",
      ) as { defaultValue: (args: unknown) => string };
      expect(
        field.defaultValue({
          user: { ...editor, role: "administrator", committeeMemberships: [] },
        }),
      ).toBe("National");
    }
  });
});
it("requires explicit draft saving for substantive website edits, even over an existing private draft", () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  for (const original of [doc, { ...doc, _status: "published" }])
    expect(() =>
      guardCommitteeChange(
        "events",
        { title: "Edit without draft mode" },
        original,
        editor as never,
      ),
    ).toThrow(/draft/i);
});
it("blocks metadata-only unpublication over a newer private draft", () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  expect(() =>
    guardCommitteeChange("events", { _status: "draft" }, doc, editor as never),
  ).toThrow();
});
it("ignores the legacy publication checkbox for versioned draft edits", () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  expect(
    guardCommitteeChange(
      "events",
      { title: "Future", accessPublished: true },
      { ...doc, accessPublished: true },
      editor as never,
      undefined,
      true,
    ),
  ).toMatchObject({ title: "Future", _status: "draft" });
});
it("prepares sponsor and directory drafts without removing their current publication", () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  for (const area of ["sponsors", "organisations"] as const) {
    const actor = {
      ...editor,
      committeeMemberships: [
        { ...membership([])[0], roles: { [area]: ["editor"] } },
      ],
    };
    expect(
      guardCommitteeChange(
        area,
        { name: "Future" },
        { ...doc, name: "Live", _status: "published", accessPublished: true },
        actor as never,
        undefined,
        true,
      ),
    ).toMatchObject({ name: "Future", _status: "draft" });
    expect(
      configureWorkspace([{ slug: area, fields: [] }])[0].versions,
    ).toMatchObject({ drafts: true });
  }
});
it("keeps published media metadata immutable and prevents deletion of referenced bytes", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  const actor = {
    ...editor,
    committeeMemberships: [
      { ...membership([])[0], roles: { media: ["editor"] } },
    ],
  };
  expect(() =>
    guardCommitteeChange(
      "media",
      { alt: "Future" },
      { ...doc, alt: "Live", accessPublished: true },
      actor as never,
    ),
  ).toThrow();
  const media = configureWorkspace([{ slug: "media", fields: [] }])[0];
  const execute = vi.fn().mockResolvedValue({ rows: [{ id: 5 }] });
  const req = {
    transactionID: "test",
    payload: { db: { sessions: { test: { db: { execute } } } } },
  };
  await expect(
    media.hooks!.beforeDelete![0]({ req, id: 88 } as never),
  ).rejects.toThrow(/history/);
});
it("allows only the trusted public poster path and makes its media private", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  const { publicEventSubmission } = await import(
    "../features/access/publicSubmissionContext"
  );
  const media = configureWorkspace([{ slug: "media", fields: [] }])[0];
  const first = media.hooks!.beforeChange![0];
  const args = {
    data: { owningScope: "National", alt: "Public enquiry" },
    req: { user: null },
    context: { publicEventSubmission },
    operation: "create",
  };
  expect(first(args as never)).toMatchObject({
    owningScope: "National",
    accessPublished: false,
    accessCreator: "public-submission",
  });
  expect(() =>
    first({ ...args, context: { publicEventSubmission: true } } as never),
  ).toThrow();
});
it("allows public media metadata for attachments of published parents", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  const media = configureWorkspace([{ slug: "media", fields: [] }])[0];
  const find = vi.fn().mockResolvedValue({ docs: [{ id: 5, poster: 88 }] });
  const where = await media.access!.read!({
    req: { user: null, payload: { find } },
  } as never);
  expect(JSON.stringify(where)).toContain("88");
  expect(find).toHaveBeenCalledWith(
    expect.objectContaining({
      collection: "events",
      draft: false,
      overrideAccess: false,
    }),
  );
});
it("rejects stale platform membership edits instead of overwriting another committee change", () => {
  const hook = configureWorkspace([{ slug: "users", fields: [] }])[0].hooks!
    .beforeChange![0];
  const args = {
    data: {
      email: "member@masca.org.au",
      committeeMemberships: membership(["editor"]),
      committeeAccessRevision: "old",
    },
    originalDoc: {
      id: 2,
      email: "member@masca.org.au",
      committeeMemberships: [],
      committeeAccessRevision: "current",
    },
    req: {
      user: {
        id: 1,
        email: "platform@masca.org.au",
        status: "active",
        role: "administrator",
      },
    },
    context: {},
    operation: "update",
  };
  expect(() => hook(args as never)).toThrow(/changed/i);
});
