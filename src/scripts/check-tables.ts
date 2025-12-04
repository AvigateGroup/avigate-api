import AppDataSource from '../../ormconfig';

async function checkTables() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected!\n');

    const tables = await AppDataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    console.log('📋 Tables in database:');
    tables.forEach((row: any) => {
      console.log(`  - ${row.tablename}`);
    });

    // Check specifically for route_segments
    const hasRouteSegments = tables.some((row: any) => row.tablename === 'route_segments');
    console.log(`\n${hasRouteSegments ? '✅' : '❌'} route_segments table ${hasRouteSegments ? 'EXISTS' : 'DOES NOT EXIST'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

checkTables();