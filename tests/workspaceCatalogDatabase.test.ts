import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import pg from 'pg';
import { workspaceCatalogSchemaSQL } from '../features/access/workspaces/schema';
const uri=process.env.MASCA_WORKSPACE_TEST_DATABASE_URI;
describe.runIf(!!uri)('workspace catalogue real migration',()=>{
 let db:pg.Pool;
 beforeAll(async()=>{
  const u=new URL(uri!); if(u.hostname!=='127.0.0.1'||u.pathname!=='/masca_workspace_access_qa')throw Error('Disposable localhost database only');
  db=new pg.Pool({connectionString:uri});
  await db.query(`DROP SCHEMA IF EXISTS cms_auth_preview CASCADE; DROP SCHEMA IF EXISTS media_calendar_preview CASCADE; CREATE SCHEMA cms_auth_preview; CREATE SCHEMA media_calendar_preview;
  CREATE TYPE cms_auth_preview.enum_events_owning_scope AS ENUM('National','QLD');
  CREATE TABLE cms_auth_preview.events(id int PRIMARY KEY,owning_scope cms_auth_preview.enum_events_owning_scope DEFAULT 'National',_status text,created_at timestamptz);
  CREATE TABLE cms_auth_preview._events_v(id int,version_owning_scope cms_auth_preview.enum_events_owning_scope,version__status text);
  CREATE TABLE cms_auth_preview.media(id int,owning_scope text);
  INSERT INTO cms_auth_preview.events VALUES(1,'QLD','draft','2026-01-01T00:00:00Z'); INSERT INTO cms_auth_preview._events_v VALUES(1,'QLD','published'); INSERT INTO cms_auth_preview.media VALUES(1,'QLD');
  CREATE TABLE media_calendar_preview.posts(id uuid PRIMARY KEY,data jsonb); CREATE TABLE media_calendar_preview.categories(id uuid PRIMARY KEY,data jsonb);`);
 });
 afterAll(async()=>{await db?.end()});
 it('preserves draft/version/file ownership, defaults and timestamps',async()=>{
  await db.query(workspaceCatalogSchemaSQL('cms_auth_preview','media_calendar_preview'));
  const r=(await db.query('SELECT owning_scope,_status,created_at FROM cms_auth_preview.events')).rows[0];
  expect(r.owning_scope).toBe('QLD');expect(r._status).toBe('draft');expect(r.created_at.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  expect((await db.query('SELECT version_owning_scope FROM cms_auth_preview._events_v')).rows[0].version_owning_scope).toBe('QLD');
  expect((await db.query('SELECT owning_scope FROM cms_auth_preview.media')).rows[0].owning_scope).toBe('QLD');
  await expect(db.query("INSERT INTO cms_auth_preview.events(id,owning_scope) VALUES(2,'missing')")).rejects.toMatchObject({code:'23503'});
 });
 it('does not overwrite renamed seeds, terms or tools on rerun',async()=>{
  await db.query(`UPDATE cms_auth_preview.access_workspaces SET name='Queensland team',areas='["events"]',term_end='2099-01-01',status='archived' WHERE id='QLD'`);
  await db.query(workspaceCatalogSchemaSQL('cms_auth_preview','media_calendar_preview'));
  const w=(await db.query("SELECT * FROM cms_auth_preview.access_workspaces WHERE id='QLD'")).rows[0];
  expect(w.name).toBe('Queensland team'); expect(w.areas).toEqual(['events']);expect(w.status).toBe('archived');
  await expect(db.query("UPDATE cms_auth_preview.access_workspaces SET id='renamed' WHERE id='QLD'")).rejects.toThrow('immutable');
  await db.query("UPDATE cms_auth_preview.access_workspaces SET status='active' WHERE id='QLD'");
  await expect(db.query(`INSERT INTO cms_auth_preview.access_workspaces(id,name,kind,areas) VALUES('ws-test','Queensland team','project','[]')`)).rejects.toMatchObject({code:'23505'});
  await expect(db.query(`INSERT INTO media_calendar_preview.posts VALUES(gen_random_uuid(),'{"owningScope":"missing"}')`)).rejects.toMatchObject({code:'23503'});
  await expect(db.query(`INSERT INTO media_calendar_preview.posts VALUES(gen_random_uuid(),'{}')`)).rejects.toMatchObject({code:'23502'});
 });
});
