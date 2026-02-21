const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  // Check community_posts columns
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'community_posts'
    ORDER BY ordinal_position
  `);
  console.log('=== community_posts columns ===');
  cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));

  // Check if table exists
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('community_posts', 'notifications', 'users')
    ORDER BY table_name
  `);
  console.log('\n=== Tables ===');
  tables.rows.forEach(r => console.log(`  ${r.table_name}`));

  // Try the actual query that fails
  try {
    const result = await client.query(`
      SELECT p.*, u."firstName", u."lastName"
      FROM community_posts p
      LEFT JOIN users u ON p."authorId" = u.id
      WHERE p."isActive" = true
      LIMIT 1
    `);
    console.log('\n=== Query test ===');
    console.log('Rows:', result.rows.length);
    if (result.rows[0]) console.log('First row keys:', Object.keys(result.rows[0]).join(', '));
  } catch (e) {
    console.log('\n=== Query FAILED ===');
    console.log(e.message);
  }

  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
