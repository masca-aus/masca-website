import pg from 'pg';
import { departmentSchemaSQL } from '../features/dashboard/departmentSchema.ts';
// Deliberately never run migrations against public or initialise a missing auth schema.
if (process.env.VERCEL_ENV !== 'preview') throw new Error('This preparation is Preview only.');
if (process.env.WORKSPACE_AUTH_ENABLED === 'true') {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URI });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query(departmentSchemaSQL('cms_auth_preview'));
    await client.query('COMMIT');
    console.log('Isolated Preview account departments are ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
} else console.log('Legacy sign-in: no department schema preparation required.');
