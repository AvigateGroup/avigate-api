import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllMissingTables1763401600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // USER-RELATED TABLES
    // ============================================

    // Create device type and platform enums
    await queryRunner.query(
      `CREATE TYPE "public"."user_devices_devicetype_enum" AS ENUM('mobile', 'tablet', 'desktop', 'unknown')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_devices_platform_enum" AS ENUM('ios', 'android', 'web', 'unknown')`,
    );

    // Create user_devices table
    await queryRunner.query(`
            CREATE TABLE "user_devices" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "fcmToken" text,
                "deviceFingerprint" character varying NOT NULL,
                "deviceInfo" text,
                "deviceType" "public"."user_devices_devicetype_enum" NOT NULL DEFAULT 'unknown',
                "platform" "public"."user_devices_platform_enum" NOT NULL DEFAULT 'unknown',
                "appVersion" character varying(20),
                "ipAddress" character varying(45),
                "lastActiveAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isActive" boolean NOT NULL DEFAULT true,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_devices" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_user_devices_userId" ON "user_devices" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_devices_deviceType" ON "user_devices" ("deviceType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_devices_platform" ON "user_devices" ("platform")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_devices_lastActiveAt" ON "user_devices" ("lastActiveAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_devices_isActive" ON "user_devices" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_devices_userId_deviceFingerprint" ON "user_devices" ("userId", "deviceFingerprint")`,
    );

    // Create OTP type enum
    await queryRunner.query(
      `CREATE TYPE "public"."user_otps_otptype_enum" AS ENUM('email_verification', 'login_verification', 'login', 'password_reset', 'phone_verification')`,
    );

    // Create user_otps table
    await queryRunner.query(`
            CREATE TABLE "user_otps" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "otpCode" character varying(10) NOT NULL,
                "otpType" "public"."user_otps_otptype_enum" NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "isUsed" boolean NOT NULL DEFAULT false,
                "usedAt" TIMESTAMP,
                "attempts" integer NOT NULL DEFAULT 0,
                "ipAddress" character varying(45),
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_otps" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_userId" ON "user_otps" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_otpCode" ON "user_otps" ("otpCode")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_otpType" ON "user_otps" ("otpType")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_expiresAt" ON "user_otps" ("expiresAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_isUsed" ON "user_otps" ("isUsed")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_otps_createdAt" ON "user_otps" ("createdAt")`);

    // ============================================
    // ADMIN TABLES
    // ============================================

    // Create admin role enum
    await queryRunner.query(
      `CREATE TYPE "public"."admins_role_enum" AS ENUM('super_admin', 'admin', 'moderator', 'analyst')`,
    );

    // Create admins table
    await queryRunner.query(`
            CREATE TABLE "admins" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL UNIQUE,
                "firstName" character varying NOT NULL,
                "lastName" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin',
                "permissions" jsonb NOT NULL DEFAULT '[]',
                "isActive" boolean NOT NULL DEFAULT true,
                "passwordHistory" jsonb,
                "mustChangePassword" boolean NOT NULL DEFAULT false,
                "passwordChangedAt" TIMESTAMP,
                "lastLoginAt" TIMESTAMP,
                "lastLoginIP" character varying,
                "lastUserAgent" text,
                "failedLoginAttempts" integer NOT NULL DEFAULT 0,
                "lockedUntil" TIMESTAMP,
                "refreshToken" text,
                "refreshTokenExpiresAt" TIMESTAMP,
                "resetToken" character varying,
                "resetTokenExpiry" TIMESTAMP,
                "inviteToken" character varying,
                "inviteTokenExpiry" TIMESTAMP,
                "totpSecret" character varying,
                "totpEnabled" boolean NOT NULL DEFAULT false,
                "totpBackupCodes" jsonb,
                "createdBy" uuid,
                "lastModifiedBy" uuid,
                "deletedBy" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_admins" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_admins_email" ON "admins" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_role" ON "admins" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_isActive" ON "admins" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_deletedAt" ON "admins" ("deletedAt")`);

    // Create admin_sessions table
    await queryRunner.query(`
            CREATE TABLE "admin_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "adminId" uuid NOT NULL,
                "token" character varying NOT NULL UNIQUE,
                "refreshToken" text NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "refreshTokenExpiresAt" TIMESTAMP NOT NULL,
                "ipAddress" character varying,
                "userAgent" text,
                "deviceInfo" character varying,
                "location" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "lastActivityAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_admin_sessions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_adminId" ON "admin_sessions" ("adminId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_token" ON "admin_sessions" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_isActive" ON "admin_sessions" ("isActive")`,
    );

    // ============================================
    // ANALYTICS TABLES
    // ============================================

    await queryRunner.query(`
            CREATE TABLE "search_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid,
                "searchQuery" character varying NOT NULL,
                "userLat" numeric(10,7),
                "userLng" numeric(10,7),
                "resultCount" integer,
                "wasSuccessful" boolean NOT NULL DEFAULT false,
                "filters" jsonb,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_search_logs" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_search_logs_userId" ON "search_logs" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_search_logs_createdAt" ON "search_logs" ("createdAt")`,
    );

    await queryRunner.query(`
            CREATE TABLE "trip_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "routeId" uuid,
                "startLocationId" uuid,
                "endLocationId" uuid,
                "tripStartedAt" TIMESTAMP NOT NULL,
                "tripCompletedAt" TIMESTAMP,
                "actualDuration" numeric(10,2),
                "totalFare" numeric(10,2),
                "wasSuccessful" boolean NOT NULL DEFAULT false,
                "transportModesUsed" text[] DEFAULT '{}',
                "feedback" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_trip_logs" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_trip_logs_userId" ON "trip_logs" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_logs_tripStartedAt" ON "trip_logs" ("tripStartedAt")`,
    );

    await queryRunner.query(`
            CREATE TABLE "user_interactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "interactionType" character varying NOT NULL,
                "targetId" uuid,
                "targetType" character varying,
                "interactionData" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_interactions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interactions_userId" ON "user_interactions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interactions_interactionType" ON "user_interactions" ("interactionType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interactions_createdAt" ON "user_interactions" ("createdAt")`,
    );

    // ============================================
    // COMMUNITY TABLES
    // ============================================

    await queryRunner.query(
      `CREATE TYPE "public"."community_posts_posttype_enum" AS ENUM('traffic_update', 'route_alert', 'safety_concern', 'tip', 'general')`,
    );

    await queryRunner.query(`
            CREATE TABLE "community_posts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "authorId" uuid NOT NULL,
                "postType" "public"."community_posts_posttype_enum" NOT NULL,
                "title" character varying NOT NULL,
                "content" text NOT NULL,
                "locationId" uuid,
                "routeId" uuid,
                "images" text[] DEFAULT '{}',
                "upvotes" integer NOT NULL DEFAULT 0,
                "downvotes" integer NOT NULL DEFAULT 0,
                "isVerified" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "verifiedBy" uuid,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_community_posts" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_authorId" ON "community_posts" ("authorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_postType" ON "community_posts" ("postType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_locationId" ON "community_posts" ("locationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_isVerified" ON "community_posts" ("isVerified")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_isActive" ON "community_posts" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_posts_createdAt" ON "community_posts" ("createdAt")`,
    );

    await queryRunner.query(`
            CREATE TABLE "direction_shares" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdBy" uuid NOT NULL,
                "startLocationId" uuid,
                "endLocationId" uuid,
                "shareToken" character varying NOT NULL UNIQUE,
                "customInstructions" text,
                "routePreferences" jsonb,
                "accessCount" integer NOT NULL DEFAULT 0,
                "expiresAt" TIMESTAMP,
                "status" character varying NOT NULL DEFAULT 'active',
                "lastAccessedBy" uuid,
                "lastAccessedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_direction_shares" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_direction_shares_createdBy" ON "direction_shares" ("createdBy")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_direction_shares_shareToken" ON "direction_shares" ("shareToken")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_direction_shares_status" ON "direction_shares" ("status")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."route_contributions_status_enum" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'implemented')`,
    );

    await queryRunner.query(`
            CREATE TABLE "route_contributions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "contributorId" uuid NOT NULL,
                "contributionType" character varying NOT NULL,
                "routeId" uuid,
                "startLocationId" uuid,
                "endLocationId" uuid,
                "description" text NOT NULL,
                "proposedData" jsonb NOT NULL,
                "status" "public"."route_contributions_status_enum" NOT NULL DEFAULT 'pending',
                "reviewNotes" text,
                "reviewedBy" uuid,
                "reviewedAt" TIMESTAMP,
                "implementedBy" uuid,
                "implementedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_route_contributions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_route_contributions_contributorId" ON "route_contributions" ("contributorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_contributions_status" ON "route_contributions" ("status")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."safety_reports_safetylevel_enum" AS ENUM('safe', 'caution', 'unsafe', 'dangerous')`,
    );

    await queryRunner.query(`
            CREATE TABLE "safety_reports" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "reportedBy" uuid NOT NULL,
                "locationId" uuid,
                "routeId" uuid,
                "safetyLevel" "public"."safety_reports_safetylevel_enum" NOT NULL,
                "incidentType" character varying NOT NULL,
                "description" text NOT NULL,
                "incidentDate" TIMESTAMP NOT NULL,
                "isVerified" boolean NOT NULL DEFAULT false,
                "status" character varying NOT NULL DEFAULT 'open',
                "verifiedBy" uuid,
                "resolvedBy" uuid,
                "resolvedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_safety_reports" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_safety_reports_reportedBy" ON "safety_reports" ("reportedBy")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_safety_reports_locationId" ON "safety_reports" ("locationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_safety_reports_status" ON "safety_reports" ("status")`,
    );

    // ============================================
    // FARE, REPUTATION, ROUTE TABLES
    // ============================================

    await queryRunner.query(`
            CREATE TABLE "fare_feedbacks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "routeId" uuid,
                "routeStepId" uuid,
                "farePaid" numeric(10,2) NOT NULL,
                "transportMode" character varying NOT NULL,
                "additionalNotes" text,
                "isVerified" boolean NOT NULL DEFAULT false,
                "reportedBy" uuid,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_fare_feedbacks" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fare_feedbacks_userId" ON "fare_feedbacks" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fare_feedbacks_routeId" ON "fare_feedbacks" ("routeId")`,
    );

    await queryRunner.query(`
            CREATE TABLE "fare_histories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "routeId" uuid NOT NULL,
                "routeStepId" uuid,
                "minFare" numeric(10,2) NOT NULL,
                "maxFare" numeric(10,2) NOT NULL,
                "avgFare" numeric(10,2) NOT NULL,
                "transportMode" character varying NOT NULL,
                "effectiveDate" date NOT NULL,
                "createdBy" uuid,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_fare_histories" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fare_histories_routeId" ON "fare_histories" ("routeId")`,
    );

    await queryRunner.query(`
            CREATE TABLE "fare_rules" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "city" character varying NOT NULL,
                "transportMode" character varying NOT NULL,
                "multiplier" numeric(5,2) NOT NULL,
                "effectiveFrom" date NOT NULL,
                "effectiveTo" date,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdBy" uuid NOT NULL,
                "lastModifiedBy" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_fare_rules" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "badges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying NOT NULL UNIQUE,
                "name" character varying NOT NULL,
                "description" text NOT NULL,
                "iconUrl" character varying NOT NULL,
                "tier" character varying NOT NULL,
                "requirements" jsonb NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_badges" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(
      `CREATE TYPE "public"."reputation_transactions_action_enum" AS ENUM('fare_feedback', 'route_contribution', 'safety_report', 'community_post', 'helpful_review', 'verified_contribution', 'direction_share', 'complete_trip', 'penalty_spam', 'penalty_inaccurate')`,
    );

    await queryRunner.query(`
            CREATE TABLE "reputation_transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "action" "public"."reputation_transactions_action_enum" NOT NULL,
                "points" integer NOT NULL,
                "reason" text,
                "relatedEntityId" uuid,
                "relatedEntityType" character varying,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_reputation_transactions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reputation_transactions_userId" ON "reputation_transactions" ("userId")`,
    );

    await queryRunner.query(`
            CREATE TABLE "user_badges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "badgeId" uuid NOT NULL,
                "earnedAt" TIMESTAMP NOT NULL,
                "isDisplayed" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_badges" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_user_badges_userId" ON "user_badges" ("userId")`);

    await queryRunner.query(
      `CREATE TYPE "public"."active_trips_status_enum" AS ENUM('planning', 'in_progress', 'completed', 'cancelled')`,
    );

    await queryRunner.query(`
            CREATE TABLE "active_trips" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "routeId" uuid,
                "currentStepId" uuid,
                "startLocationId" uuid,
                "endLocationId" uuid,
                "currentLat" numeric(10,7) NOT NULL,
                "currentLng" numeric(10,7) NOT NULL,
                "status" "public"."active_trips_status_enum" NOT NULL DEFAULT 'planning',
                "startedAt" TIMESTAMP,
                "estimatedArrival" TIMESTAMP,
                "completedAt" TIMESTAMP,
                "locationHistory" jsonb,
                "stepProgress" jsonb,
                "notificationsSent" jsonb NOT NULL DEFAULT '{}',
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_active_trips" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`CREATE INDEX "IDX_active_trips_userId" ON "active_trips" ("userId")`);

    // ============================================
    // FOREIGN KEYS
    // ============================================

    await queryRunner.query(
      `ALTER TABLE "user_devices" ADD CONSTRAINT "FK_user_devices_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_otps" ADD CONSTRAINT "FK_user_otps_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" ADD CONSTRAINT "FK_admin_sessions_admin" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD CONSTRAINT "FK_admins_creator" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_transactions" ADD CONSTRAINT "FK_reputation_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_user" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_badge" FOREIGN KEY ("badgeId") REFERENCES "badges"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" ADD CONSTRAINT "FK_active_trips_user" FOREIGN KEY ("userId") REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" ADD CONSTRAINT "FK_active_trips_route" FOREIGN KEY ("routeId") REFERENCES "routes"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" ADD CONSTRAINT "FK_active_trips_currentStep" FOREIGN KEY ("currentStepId") REFERENCES "route_steps"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" ADD CONSTRAINT "FK_active_trips_startLocation" FOREIGN KEY ("startLocationId") REFERENCES "locations"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" ADD CONSTRAINT "FK_active_trips_endLocation" FOREIGN KEY ("endLocationId") REFERENCES "locations"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs
    await queryRunner.query(
      `ALTER TABLE "active_trips" DROP CONSTRAINT IF EXISTS "FK_active_trips_endLocation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" DROP CONSTRAINT IF EXISTS "FK_active_trips_startLocation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" DROP CONSTRAINT IF EXISTS "FK_active_trips_currentStep"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" DROP CONSTRAINT IF EXISTS "FK_active_trips_route"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_trips" DROP CONSTRAINT IF EXISTS "FK_active_trips_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT IF EXISTS "FK_user_badges_badge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badges" DROP CONSTRAINT IF EXISTS "FK_user_badges_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_transactions" DROP CONSTRAINT IF EXISTS "FK_reputation_transactions_user"`,
    );
    await queryRunner.query(`ALTER TABLE "admins" DROP CONSTRAINT IF EXISTS "FK_admins_creator"`);
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "FK_admin_sessions_admin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_otps" DROP CONSTRAINT IF EXISTS "FK_user_otps_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_devices" DROP CONSTRAINT IF EXISTS "FK_user_devices_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "active_trips"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reputation_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fare_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fare_histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fare_feedbacks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "safety_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_contributions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "direction_shares"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_interactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "search_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_otps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."active_trips_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."reputation_transactions_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."safety_reports_safetylevel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."route_contributions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."community_posts_posttype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."admins_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_otps_otptype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_devices_platform_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_devices_devicetype_enum"`);
  }
}
