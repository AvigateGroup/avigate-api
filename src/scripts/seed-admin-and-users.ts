// src/scripts/seed-admin-and-users.ts
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Load environment variables
config();

async function seed() {
  // Create a new DataSource instance
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: String(process.env.DATABASE_PASSWORD || ''),
    database: process.env.DATABASE_NAME,
    synchronize: false,
    logging: true,
  });

  console.log('🌱 Starting users Data Seed...\n');

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected!\n');

    // ============================================
    // 1. CREATE SUPER ADMIN
    // ============================================
    console.log('👤 Creating Super Admin...');

    const passwordHash = await bcrypt.hash('Pampersbaby@12345!', 12);

    await dataSource.query(
      `
      INSERT INTO admins (
        email, 
        "firstName", 
        "lastName", 
        "passwordHash", 
        role, 
        permissions, 
        "isActive",
        "mustChangePassword",
        "passwordChangedAt",
        "totpEnabled",
        "failedLoginAttempts",
        "createdAt",
        "updatedAt"
      ) VALUES (
        'joel.emmanuel@avigate.co',
        'Joel',
        'Emmanuel',
        $1,
        'super_admin',
        '["*"]',
        true,
        false,
        NOW(),
        false,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE 
      SET 
        "passwordHash" = EXCLUDED."passwordHash",
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        "isActive" = EXCLUDED."isActive",
        "mustChangePassword" = EXCLUDED."mustChangePassword",
        "passwordChangedAt" = EXCLUDED."passwordChangedAt",
        "totpEnabled" = EXCLUDED."totpEnabled",
        "updatedAt" = NOW()
      RETURNING id;
    `,
      [passwordHash],
    );

    console.log('✅ Super Admin created/updated');
    console.log('   Email: joel.emmanuel@avigate.co');
    console.log('   Password: Pampersbaby@12345!');
    console.log('   Role: super_admin');
    console.log('   TOTP: Disabled (can be enabled after login)\n');

    // ============================================
    // 2. CREATE ADDITIONAL ADMIN ACCOUNTS
    // ============================================
    console.log('👥 Creating Additional Admin Accounts...\n');

    const additionalAdmins = [
      {
        email: 'admin@avigate.co',
        firstName: 'Test',
        lastName: 'Admin',
        password: 'AdminTest123!@#',
        role: 'admin',
        permissions: [
          'users.view',
          'users.create',
          'users.edit',
          'users.delete',
          'analytics.view',
          'analytics.export',
          'content.moderate',
          'admins.view',
        ],
      },
      {
        email: 'moderator@avigate.co',
        firstName: 'Test',
        lastName: 'Moderator',
        password: 'ModeratorTest123!@#',
        role: 'moderator',
        permissions: ['users.view', 'users.edit', 'content.moderate', 'analytics.view'],
      },
    ];

    for (const admin of additionalAdmins) {
      const adminPasswordHash = await bcrypt.hash(admin.password, 12);

      await dataSource.query(
        `
        INSERT INTO admins (
          email, 
          "firstName", 
          "lastName", 
          "passwordHash", 
          role, 
          permissions, 
          "isActive",
          "mustChangePassword",
          "passwordChangedAt",
          "totpEnabled",
          "failedLoginAttempts",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET 
          "passwordHash" = EXCLUDED."passwordHash",
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          "isActive" = EXCLUDED."isActive",
          "mustChangePassword" = EXCLUDED."mustChangePassword",
          "passwordChangedAt" = EXCLUDED."passwordChangedAt",
          "totpEnabled" = EXCLUDED."totpEnabled",
          "updatedAt" = NOW()
      `,
        [
          admin.email,
          admin.firstName,
          admin.lastName,
          adminPasswordHash,
          admin.role,
          JSON.stringify(admin.permissions),
          true,
          false,
          new Date(),
          false,
          0,
        ],
      );

      console.log(`✅ Created admin: ${admin.email} (Role: ${admin.role})`);
    }

    console.log(`\n✅ Created ${additionalAdmins.length + 1} admin accounts\n`);

    // ============================================
    // 3. CREATE TEST USERS
    // ============================================
    console.log('👥 Creating Test Users...\n');

    const testUsers = [
      {
        email: 'testuser1@avigate.co',
        firstName: 'Test',
        lastName: 'User One',
        sex: 'male',
        phoneNumber: '+2348012345671',
        googleId: null,
        description: 'General testing account for basic app functionality',
      },
      {
        email: 'testuser2@avigate.co',
        firstName: 'Test',
        lastName: 'User Two',
        sex: 'female',
        phoneNumber: '+2348012345672',
        googleId: null,
        description: 'Advanced testing account with higher reputation',
      },
      {
        email: 'googletest@avigate.co',
        firstName: 'Google',
        lastName: 'Test',
        sex: 'male',
        phoneNumber: '+2348012345673',
        googleId: 'test_google_id_123',
        description: 'Google Play Store testing account',
      },
      {
        email: 'appletest@avigate.co',
        firstName: 'Apple',
        lastName: 'Test',
        sex: 'female',
        phoneNumber: '+2348012345674',
        googleId: null,
        description: 'Apple App Store testing account',
      },
    ];

    for (const user of testUsers) {
      await dataSource.query(
        `
        INSERT INTO users (
          email, 
          "firstName", 
          "lastName", 
          sex,
          "phoneNumber",
          "googleId",
          "isVerified",
          "isActive",
          "isTestAccount",
          "reputationScore",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET email = EXCLUDED.email
      `,
        [
          user.email,
          user.firstName,
          user.lastName,
          user.sex,
          user.phoneNumber,
          user.googleId,
          true,
          true,
          true,
          user.email === 'testuser2@avigate.co' ? 500 : 100,
        ],
      );

      console.log(`✅ Created test user: ${user.email} - ${user.description}`);
    }

    console.log(`\n✅ Created ${testUsers.length} test users\n`);
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seed();
