/** Small, private avatar derivatives, separate from the public media library. */
export function accountPhotoSchemaSQL(
  schema: "public" | "cms_auth_preview" | "cms_calendar_preview",
) {
  if (!["public", "cms_auth_preview", "cms_calendar_preview"].includes(schema))
    throw new Error("Unsupported account schema");
  return `CREATE TABLE IF NOT EXISTS "${schema}".account_photos (
    user_id integer PRIMARY KEY REFERENCES "${schema}".users(id) ON DELETE CASCADE,
    photo bytea NOT NULL CHECK (octet_length(photo) BETWEEN 1 AND 65536),
    version uuid NOT NULL
  );
  ALTER TABLE "${schema}".account_photos ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON "${schema}".account_photos FROM PUBLIC, anon, authenticated;`;
}
