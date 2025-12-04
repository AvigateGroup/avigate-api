import AppDataSource from '../../ormconfig';

async function fixMigrations() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected!\n');

    // Insert the problematic migrations into the migrations table
    // so TypeORM thinks they've already been run
    const migrationsToMark = [
      {
        timestamp: 1763401493480,
        name: 'CompleteDatabaseSchema1763401493480',
      },
      {
        timestamp: 1763401600000,
        name: 'AddAllMissingTables1763401600000',
      },
    ];

    for (const migration of migrationsToMark) {
      // Check if already exists
      const exists = await AppDataSource.query(
        `SELECT * FROM migrations WHERE timestamp = $1`,
        [migration.timestamp],
      );

      if (exists.length === 0) {
        await AppDataSource.query(
          `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
          [migration.timestamp, migration.name],
        );
        console.log(`✅ Marked migration as executed: ${migration.name}`);
      } else {
        console.log(`⏭️  Migration already marked: ${migration.name}`);
      }
    }

    console.log('\n✅ Done! Now you can run the new migration.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

fixMigrations();