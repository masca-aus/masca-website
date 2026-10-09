import { z } from "zod";
export const idSchema = z.string().uuid();
const instant = z.string().datetime({ offset: true }).nullable();
const link = z
  .string()
  .url()
  .max(2000)
  .refine((v) => v.startsWith("https://"), "Use an HTTPS link.");
export const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    type: z.enum(["feed", "carousel", "reel", "story"]),
    category: idSchema.nullable(),
    plannedAt: instant,
    preparationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    owner: z.string().max(100),
    collaborators: z.array(z.string().max(100)).max(30),
    checklist: z
      .array(z.object({ text: z.string().max(300), done: z.boolean() }))
      .max(30),
    links: z.array(link).max(10),
    onHold: z.boolean(),
    holdReason: z.string().max(1000),
    assets: z.array(idSchema).max(10),
  })
  .partial()
  .strict();
export const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("patch"),
    expectedVersion: z.number().int().positive(),
    patch: patchSchema,
  }),
  z.object({
    action: z.literal("caption"),
    update: z
      .string()
      .max(180000)
      .regex(/^[A-Za-z0-9+/]*={0,2}$/),
  }),
  ...(
    ["review", "approve", "withdraw", "changes", "posted", "duplicate"] as const
  ).map((action) =>
    z.object({
      action: z.literal(action),
      expectedRevision: z.number().int().positive(),
      message: z.string().max(4000).optional(),
      url: link.or(z.literal("")).optional(),
    }),
  ),
  z.object({
    action: z.literal("comment"),
    body: z.string().trim().min(1).max(4000),
    mentions: z.array(z.string().max(100)).max(20).default([]),
  }),
  z.object({
    action: z.literal("resolve"),
    commentId: idSchema,
    resolved: z.boolean(),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
export class CalendarError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
