import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingUserColumns1763401500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create UserSex enum
        await queryRunner.query(`CREATE TYPE "public"."users_sex_enum" AS ENUM('male', 'female')`);
        
        // Add sex column
        await queryRunner.query(`ALTER TABLE "users" ADD "sex" "public"."users_sex_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_users_sex" ON "users" ("sex")`);
        
        // Rename password to passwordHash
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash"`);
        
        // Add preferredLanguage (with default)
        await queryRunner.query(`ALTER TABLE "users" ADD "preferredLanguage" character varying NOT NULL DEFAULT 'English'`);
        
        // Add isVerified (combining isEmailVerified and isPhoneVerified logic)
        await queryRunner.query(`ALTER TABLE "users" ADD "isVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IDX_users_isVerified" ON "users" ("isVerified")`);
        
        // Add isActive
        await queryRunner.query(`ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "IDX_users_isActive" ON "users" ("isActive")`);
        
        // Add isTestAccount
        await queryRunner.query(`ALTER TABLE "users" ADD "isTestAccount" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IDX_users_isTestAccount" ON "users" ("isTestAccount")`);
        
        // Add lastLoginAt
        await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_users_lastLoginAt" ON "users" ("lastLoginAt")`);
        
        // Add refreshToken and expiry
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshTokenExpiresAt" TIMESTAMP`);
        
        // Add password reset fields
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetToken" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetExpiresAt" TIMESTAMP`);
        
        // Add reputation and contribution fields
        await queryRunner.query(`ALTER TABLE "users" ADD "reputationScore" integer NOT NULL DEFAULT 100`);
        await queryRunner.query(`CREATE INDEX "IDX_users_reputationScore" ON "users" ("reputationScore")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "totalContributions" integer NOT NULL DEFAULT 0`);
        
        // Update existing termsAcceptedAt and privacyAcceptedAt to have indexes (already exist in original migration)
        // These are already indexed, so we skip them
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX "public"."IDX_users_reputationScore"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_lastLoginAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_isTestAccount"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_isActive"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_isVerified"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_sex"`);
        
        // Drop columns
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "totalContributions"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reputationScore"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshTokenExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isTestAccount"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVerified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferredLanguage"`);
        
        // Rename passwordHash back to password
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password"`);
        
        // Drop sex column and enum
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sex"`);
        await queryRunner.query(`DROP TYPE "public"."users_sex_enum"`);
    }
}