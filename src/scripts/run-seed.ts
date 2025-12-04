import { seedPortHarcourtWithSegments } from './seed-port-harcourt-routes-segments';
import AppDataSource from '../../ormconfig';

async function runSeed() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected!\n');

    await seedPortHarcourtWithSegments(AppDataSource);

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runSeed();