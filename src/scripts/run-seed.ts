import { DataSource } from 'typeorm';
import { seedPortHarcourtWithSegments } from './seed-port-harcourt-routes-segments';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSeed() {
  // Create DataSource instance with your database config
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected!\n');

    await seedPortHarcourtWithSegments(dataSource);

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

runSeed();