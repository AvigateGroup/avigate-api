// src/scripts/test-legal-modal.ts

/**
 * Script to test Legal Update Modal
 *
 * This script updates all users' legal versions to "1.0" to simulate
 * a scenario where users need to accept updated Terms & Privacy Policy.
 *
 * Usage:
 *   npm run test:legal-modal
 *
 * To restore users back to current version:
 *   npm run test:legal-modal -- --restore
 */

import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '../common/constants/legal.constants';

// Load environment variables
config();

const TEST_VERSION = '1.0';

async function main() {
  const isRestore = process.argv.includes('--restore');

  // Create a new DataSource instance
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: String(process.env.DATABASE_PASSWORD || ''),
    database: process.env.DATABASE_NAME,
    synchronize: false,
    logging: false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected!\n');

    if (isRestore) {
      // Restore all users to current version
      console.log('🔄 Restoring users to current legal versions...');

      const result = await dataSource.query(
        `UPDATE "users" SET "termsVersion" = $1, "privacyVersion" = $2, "termsAcceptedAt" = NOW(), "privacyAcceptedAt" = NOW()`,
        [CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION],
      );

      const count = await dataSource.query(`SELECT COUNT(*) FROM "users"`);

      console.log(`✅ Restored ${count[0].count} users to current versions`);
      console.log(`   Terms Version: ${CURRENT_TERMS_VERSION}`);
      console.log(`   Privacy Version: ${CURRENT_PRIVACY_VERSION}\n`);
    } else {
      // Set users to old version to trigger modal
      console.log('⚙️  Setting users to old legal versions to trigger modal...');

      const result = await dataSource.query(
        `UPDATE "users" SET "termsVersion" = $1, "privacyVersion" = $2`,
        [TEST_VERSION, TEST_VERSION],
      );

      const count = await dataSource.query(`SELECT COUNT(*) FROM "users"`);

      console.log(`✅ Updated ${count[0].count} users to test version`);
      console.log(`   Test Version: ${TEST_VERSION}`);
      console.log(`   Current Terms Version: ${CURRENT_TERMS_VERSION}`);
      console.log(`   Current Privacy Version: ${CURRENT_PRIVACY_VERSION}\n`);

      console.log('✅ Legal Modal Test Setup Complete!');
      console.log('━'.repeat(50));
      console.log('Next Steps:');
      console.log('1. Log in to the app with any user account');
      console.log('2. The Legal Update Modal should appear automatically');
      console.log('3. Test the modal functionality:');
      console.log('   - View Terms of Service button');
      console.log('   - View Privacy Policy button');
      console.log('   - Accept button');
      console.log('\nTo restore users back to current version:');
      console.log('npm run test:legal-modal -- --restore');
      console.log('━'.repeat(50) + '\n');
    }

    await dataSource.destroy();
    console.log('👋 Database disconnected\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in test-legal-modal script:', error);
    process.exit(1);
  }
}

main();
