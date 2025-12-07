// src/scripts/drop-and-reset-db.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

async function dropAndResetDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...\n');
    await dataSource.initialize();

    console.log('🗑️  Dropping all tables...\n');

    // Drop all tables in correct order (respecting foreign keys)
    const tablesToDrop = [
      'route_feedback',
      'saved_routes',
      'user_activities',
      'user_preferences',
      'reputation_history',
      'fare_reports',
      'route_contributions',
      'landmarks',
      'route_segments',
      'routes',
      'locations',
      'refresh_tokens',
      'user_devices',
      'user_otps',
      'users',
      'admin_activity_logs',
      'admins',
      'migrations',
    ];

    for (const table of tablesToDrop) {
      try {
        await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${table} (might not exist)`);
      }
    }

    console.log('\n✅ All tables dropped successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Delete all files in src/migrations/ folder');
    console.log('   2. Run: npm run migration:generate src/migrations/InitialSchema');
    console.log('   3. Run: npm run migration:run');
    console.log('   4. Run: npm run seed:ph (or your seed script)');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

dropAndResetDatabase()
  .then(() => {
    console.log('\n✅ Database reset complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  });
