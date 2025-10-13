// src/migrations/XXXXXX-update-user-entity.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserEntity1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "country" VARCHAR(255) DEFAULT 'Nigeria',
      ADD COLUMN IF NOT EXISTS "language" VARCHAR(255) DEFAULT 'English',
      ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR(20) DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS "phoneNumberCaptured" BOOLEAN DEFAULT FALSE,
      ALTER COLUMN "sex" DROP NOT NULL,
      ALTER COLUMN "phoneNumber" DROP NOT NULL;
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_google_id" ON "users" ("googleId");
      CREATE INDEX IF NOT EXISTS "IDX_user_auth_provider" ON "users" ("authProvider");
    `);

    // Update existing users
    await queryRunner.query(`
      UPDATE "users"
      SET "phoneNumberCaptured" = TRUE
      WHERE "phoneNumber" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_google_id";
      DROP INDEX IF EXISTS "IDX_user_auth_provider";
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "language",
      DROP COLUMN IF EXISTS "googleId",
      DROP COLUMN IF EXISTS "authProvider",
      DROP COLUMN IF EXISTS "phoneNumberCaptured";
    `);
  }
}