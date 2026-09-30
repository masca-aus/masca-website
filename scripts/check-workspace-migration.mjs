import { readFileSync } from 'node:fs';
import pg from 'pg';
const client = new pg.Client({connectionString:process.env.DATABASE_URI});
await client.connect();
try {
 await client.query('BEGIN');
 await client.query("SET LOCAL lock_timeout = '3s'");
 const source=readFileSync(new URL('../migrations/20260930_221300_workspace_access.ts',import.meta.url),'utf8');
 const ddl=source.match(/db\.execute\(sql`([\s\S]*?)`\)/)[1];
 await client.query(ddl);
 const check=await client.query("SELECT count(*)::int AS count FROM public.users WHERE email='admin@masca.org.au' AND role='administrator' AND status='active' AND session_revision IS NOT NULL");
 if(check.rows[0].count!==1)throw new Error('Recovery administrator missing');
 for(const table of ['events','careers','committee','sponsors']) {
  const rows=await client.query(`SELECT count(*)::int AS count FROM public.${table} WHERE owning_scope IS NULL`);
  if(rows.rows[0].count!==0)throw new Error('Missing content ownership');
 }
 console.log('Migration rehearsal passed; rolling back every change.');
} finally {await client.query('ROLLBACK'); await client.end();}
