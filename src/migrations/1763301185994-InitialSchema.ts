import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1763301185994 implements MigrationInterface {
    name = 'InitialSchema1763301185994'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Use IF EXISTS to avoid errors if indexes don't exist yet
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_termsVersion"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_privacyVersion"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_termsAcceptedAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_google_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_auth_provider"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_privacyAcceptedAt"`);
        
        await queryRunner.query(`CREATE TABLE "route_segments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "startLocationId" uuid NOT NULL, "endLocationId" uuid NOT NULL, "intermediateStops" jsonb NOT NULL DEFAULT '[]', "transportModes" text NOT NULL, "distance" numeric(10,2) NOT NULL, "estimatedDuration" numeric(10,2) NOT NULL, "minFare" numeric(10,2), "maxFare" numeric(10,2), "instructions" text NOT NULL, "landmarks" jsonb NOT NULL DEFAULT '[]', "usageCount" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_67f35163b4fb5b5e4c28d8847b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_42f5eb5528f60d8e703fc80344" ON "route_segments" ("startLocationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a586ad7688ea83602253e94383" ON "route_segments" ("endLocationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_55a600c43631901936823d750c" ON "route_segments" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_469b82c2117bc119d5c1efc18e" ON "route_segments" ("isVerified") `);
        await queryRunner.query(`CREATE TYPE "public"."location_shares_sharetype_enum" AS ENUM('public', 'private', 'event', 'business')`);
        await queryRunner.query(`CREATE TYPE "public"."location_shares_status_enum" AS ENUM('active', 'paused', 'expired', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "location_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" uuid NOT NULL, "shareToken" character varying NOT NULL, "shareUrl" character varying NOT NULL, "shareType" "public"."location_shares_sharetype_enum" NOT NULL DEFAULT 'public', "locationName" character varying NOT NULL, "latitude" numeric(10,7) NOT NULL, "longitude" numeric(10,7) NOT NULL, "description" text, "expiresAt" TIMESTAMP, "maxAccess" integer, "allowedUserIds" text NOT NULL DEFAULT '[]', "status" "public"."location_shares_status_enum" NOT NULL DEFAULT 'active', "accessCount" integer NOT NULL DEFAULT '0', "lastAccessedBy" uuid, "lastAccessedAt" TIMESTAMP, "eventDate" TIMESTAMP, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0e55c68fba6353edb67e36cd080" UNIQUE ("shareToken"), CONSTRAINT "PK_3d5f46a72c6856676d05f0b66e2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7c78036b9fc4ff08477e5b9c61" ON "location_shares" ("ownerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e55c68fba6353edb67e36cd08" ON "location_shares" ("shareToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_28ae040bf4fd0a0a278d03b900" ON "location_shares" ("status") `);
        await queryRunner.query(`CREATE TABLE "route_segments_mapping" ("routeId" uuid NOT NULL, "segmentId" uuid NOT NULL, CONSTRAINT "PK_6f7ae48933de8e8a12491fc1d9b" PRIMARY KEY ("routeId", "segmentId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f8ca36ab4f63168d833775eab3" ON "route_segments_mapping" ("routeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e943f0c65951bc8e034514845" ON "route_segments_mapping" ("segmentId") `);
        
        // Use IF EXISTS for table columns that might not exist
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "country"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "country" character varying NOT NULL DEFAULT 'Nigeria'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "language"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "language" character varying NOT NULL DEFAULT 'English'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "authProvider"`);
        await queryRunner.query(`CREATE TYPE "public"."users_authprovider_enum" AS ENUM('local', 'google')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "authProvider" "public"."users_authprovider_enum" NOT NULL DEFAULT 'local'`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phoneNumberCaptured" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_steps" ALTER COLUMN "estimatedDuration" DROP DEFAULT`);
        
        await queryRunner.query(`CREATE INDEX "IDX_0972df853515239f45870628f8" ON "users" ("termsVersion") `);
        await queryRunner.query(`CREATE INDEX "IDX_39f0390cbf6f75685d4ca5c1b2" ON "users" ("privacyVersion") `);
        await queryRunner.query(`CREATE INDEX "IDX_41104b624e61778f7767449db0" ON "users" ("termsAcceptedAt") `);
        await queryRunner.query(`ALTER TABLE "route_segments" ADD CONSTRAINT "FK_42f5eb5528f60d8e703fc803440" FOREIGN KEY ("startLocationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_segments" ADD CONSTRAINT "FK_a586ad7688ea83602253e943832" FOREIGN KEY ("endLocationId") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "location_shares" ADD CONSTRAINT "FK_7c78036b9fc4ff08477e5b9c61a" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" ADD CONSTRAINT "FK_f8ca36ab4f63168d833775eab36" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" ADD CONSTRAINT "FK_5e943f0c65951bc8e0345148450" FOREIGN KEY ("segmentId") REFERENCES "route_segments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" DROP CONSTRAINT "FK_5e943f0c65951bc8e0345148450"`);
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" DROP CONSTRAINT "FK_f8ca36ab4f63168d833775eab36"`);
        await queryRunner.query(`ALTER TABLE "location_shares" DROP CONSTRAINT "FK_7c78036b9fc4ff08477e5b9c61a"`);
        await queryRunner.query(`ALTER TABLE "route_segments" DROP CONSTRAINT "FK_a586ad7688ea83602253e943832"`);
        await queryRunner.query(`ALTER TABLE "route_segments" DROP CONSTRAINT "FK_42f5eb5528f60d8e703fc803440"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_41104b624e61778f7767449db0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39f0390cbf6f75685d4ca5c1b2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0972df853515239f45870628f8"`);
        await queryRunner.query(`ALTER TABLE "route_steps" ALTER COLUMN "estimatedDuration" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phoneNumberCaptured" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "authProvider"`);
        await queryRunner.query(`DROP TYPE "public"."users_authprovider_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "authProvider" character varying(20) DEFAULT 'local'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "language"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "language" character varying(255) DEFAULT 'English'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "country" character varying(255) DEFAULT 'Nigeria'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e943f0c65951bc8e034514845"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f8ca36ab4f63168d833775eab3"`);
        await queryRunner.query(`DROP TABLE "route_segments_mapping"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28ae040bf4fd0a0a278d03b900"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e55c68fba6353edb67e36cd08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c78036b9fc4ff08477e5b9c61"`);
        await queryRunner.query(`DROP TABLE "location_shares"`);
        await queryRunner.query(`DROP TYPE "public"."location_shares_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."location_shares_sharetype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_469b82c2117bc119d5c1efc18e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55a600c43631901936823d750c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a586ad7688ea83602253e94383"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_42f5eb5528f60d8e703fc80344"`);
        await queryRunner.query(`DROP TABLE "route_segments"`);
        await queryRunner.query(`CREATE INDEX "IDX_users_privacyAcceptedAt" ON "users" ("privacyAcceptedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_auth_provider" ON "users" ("authProvider") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_google_id" ON "users" ("googleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_termsAcceptedAt" ON "users" ("termsAcceptedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_privacyVersion" ON "users" ("privacyVersion") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_termsVersion" ON "users" ("termsVersion") `);
    }
}