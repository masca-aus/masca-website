// Names are a closed set, never interpolated from a request.
export function calendarSchema(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL_ENV === "production"
    ? "media_calendar"
    : "media_calendar_preview";
}
export function calendarSchemaSQL(
  schema: "media_calendar" | "media_calendar_preview" = calendarSchema(),
) {
  return `CREATE SCHEMA IF NOT EXISTS "${schema}";
 CREATE TABLE IF NOT EXISTS "${schema}".posts (id uuid PRIMARY KEY, planned_at timestamptz, status text NOT NULL, category uuid, data jsonb NOT NULL);
 CREATE INDEX IF NOT EXISTS calendar_posts_planned ON "${schema}".posts(planned_at);
 CREATE INDEX IF NOT EXISTS calendar_posts_status ON "${schema}".posts(status);
 CREATE INDEX IF NOT EXISTS calendar_posts_category ON "${schema}".posts(category);
 CREATE TABLE IF NOT EXISTS "${schema}".categories (id uuid PRIMARY KEY, data jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS "${schema}".assets (id uuid PRIMARY KEY, post_id uuid NOT NULL REFERENCES "${schema}".posts(id), data jsonb NOT NULL);
 CREATE INDEX IF NOT EXISTS calendar_assets_post ON "${schema}".assets(post_id);
 CREATE TABLE IF NOT EXISTS "${schema}".revisions (id bigserial PRIMARY KEY, post_id uuid NOT NULL REFERENCES "${schema}".posts(id), author text NOT NULL, action text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS calendar_revisions_post ON "${schema}".revisions(post_id,created_at);
 CREATE TABLE IF NOT EXISTS "${schema}".notifications (id uuid PRIMARY KEY, recipient text NOT NULL, post_id uuid NOT NULL REFERENCES "${schema}".posts(id), message text NOT NULL, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS calendar_notifications_recipient ON "${schema}".notifications(recipient,created_at);
 CREATE TABLE IF NOT EXISTS "${schema}".presence (client_id uuid PRIMARY KEY, user_id text NOT NULL, post_id uuid REFERENCES "${schema}".posts(id), cursor jsonb, expires_at timestamptz NOT NULL);
 CREATE INDEX IF NOT EXISTS calendar_presence_expiry ON "${schema}".presence(expires_at);
 ${["presence", "posts", "categories", "assets", "revisions", "notifications"].map((t) => `ALTER TABLE "${schema}".${t} ENABLE ROW LEVEL SECURITY; REVOKE ALL ON "${schema}".${t} FROM PUBLIC;`).join("\n")}
 INSERT INTO "${schema}".categories(id,data) VALUES
 ${[
   ["MASA", "#5959c9"],
   ["Careers", "#327ca0"],
   ["Community", "#b05583"],
   ["Welfare", "#38856c"],
   ["Announcements", "#8d6b30"],
 ]
   .map(
     ([name, color], i) =>
       `('00000000-0000-4000-8000-00000000000${i + 1}', '${JSON.stringify({ id: `00000000-0000-4000-8000-00000000000${i + 1}`, name, color, archived: false })}'::jsonb)`,
   )
   .join(",")}
 ON CONFLICT (id) DO NOTHING;`;
}
