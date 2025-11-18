import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteDatabaseSchema1763401493480 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create users table with ALL fields
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "phoneNumber" character varying,
                "phoneNumberCaptured" boolean NOT NULL DEFAULT false,
                "firstName" character varying,
                "lastName" character varying,
                "password" character varying,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "isPhoneVerified" boolean NOT NULL DEFAULT false,
                "profilePicture" character varying,
                "googleId" character varying,
                "country" character varying NOT NULL DEFAULT 'Nigeria',
                "language" character varying NOT NULL DEFAULT 'English',
                "termsVersion" character varying,
                "termsAcceptedAt" TIMESTAMP,
                "privacyVersion" character varying,
                "privacyAcceptedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

        // Create authProvider enum and add to users
        await queryRunner.query(`CREATE TYPE "public"."users_authprovider_enum" AS ENUM('local', 'google')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "authProvider" "public"."users_authprovider_enum" NOT NULL DEFAULT 'local'`);

        // Create indexes for users
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_googleId" ON "users" ("googleId")`);
        await queryRunner.query(`CREATE INDEX "IDX_0972df853515239f45870628f8" ON "users" ("termsVersion")`);
        await queryRunner.query(`CREATE INDEX "IDX_39f0390cbf6f75685d4ca5c1b2" ON "users" ("privacyVersion")`);
        await queryRunner.query(`CREATE INDEX "IDX_41104b624e61778f7767449db0" ON "users" ("termsAcceptedAt")`);

        // Create locations table
        await queryRunner.query(`
            CREATE TABLE "locations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "latitude" numeric(10,7) NOT NULL,
                "longitude" numeric(10,7) NOT NULL,
                "address" character varying,
                "city" character varying NOT NULL,
                "state" character varying NOT NULL,
                "country" character varying NOT NULL DEFAULT 'Nigeria',
                "locationType" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "usageCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_locations" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for locations
        await queryRunner.query(`CREATE INDEX "IDX_locations_city" ON "locations" ("city")`);
        await queryRunner.query(`CREATE INDEX "IDX_locations_state" ON "locations" ("state")`);
        await queryRunner.query(`CREATE INDEX "IDX_locations_isActive" ON "locations" ("isActive")`);

        // Create landmarks table
        await queryRunner.query(`
            CREATE TABLE "landmarks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "latitude" numeric(10,7) NOT NULL,
                "longitude" numeric(10,7) NOT NULL,
                "category" character varying NOT NULL,
                "locationId" uuid,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_landmarks" PRIMARY KEY ("id")
            )
        `);

        // Create routes table
        await queryRunner.query(`
            CREATE TABLE "routes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "startLocationId" uuid NOT NULL,
                "endLocationId" uuid NOT NULL,
                "distance" numeric(10,2) NOT NULL,
                "estimatedDuration" numeric(10,2) NOT NULL,
                "transportMode" character varying NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "usageCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_routes" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for routes
        await queryRunner.query(`CREATE INDEX "IDX_routes_startLocation" ON "routes" ("startLocationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_routes_endLocation" ON "routes" ("endLocationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_routes_isActive" ON "routes" ("isActive")`);

        // Create route_steps table
        await queryRunner.query(`
            CREATE TABLE "route_steps" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "routeId" uuid NOT NULL,
                "stepNumber" integer NOT NULL,
                "instruction" text NOT NULL,
                "distance" numeric(10,2) NOT NULL,
                "estimatedDuration" numeric(10,2) NOT NULL,
                "startLatitude" numeric(10,7),
                "startLongitude" numeric(10,7),
                "endLatitude" numeric(10,7),
                "endLongitude" numeric(10,7),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_route_steps" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for route_steps
        await queryRunner.query(`CREATE INDEX "IDX_route_steps_routeId" ON "route_steps" ("routeId")`);

        // Create route_segments table
        await queryRunner.query(`
            CREATE TABLE "route_segments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "startLocationId" uuid NOT NULL,
                "endLocationId" uuid NOT NULL,
                "intermediateStops" jsonb NOT NULL DEFAULT '[]',
                "transportModes" text NOT NULL,
                "distance" numeric(10,2) NOT NULL,
                "estimatedDuration" numeric(10,2) NOT NULL,
                "minFare" numeric(10,2),
                "maxFare" numeric(10,2),
                "instructions" text NOT NULL,
                "landmarks" jsonb NOT NULL DEFAULT '[]',
                "usageCount" integer NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "isVerified" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_67f35163b4fb5b5e4c28d8847b2" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for route_segments
        await queryRunner.query(`CREATE INDEX "IDX_42f5eb5528f60d8e703fc80344" ON "route_segments" ("startLocationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_a586ad7688ea83602253e94383" ON "route_segments" ("endLocationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_55a600c43631901936823d750c" ON "route_segments" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_469b82c2117bc119d5c1efc18e" ON "route_segments" ("isVerified")`);

        // Create location_shares enums and table
        await queryRunner.query(`CREATE TYPE "public"."location_shares_sharetype_enum" AS ENUM('public', 'private', 'event', 'business')`);
        await queryRunner.query(`CREATE TYPE "public"."location_shares_status_enum" AS ENUM('active', 'paused', 'expired', 'revoked')`);
        await queryRunner.query(`
            CREATE TABLE "location_shares" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ownerId" uuid NOT NULL,
                "shareToken" character varying NOT NULL,
                "shareUrl" character varying NOT NULL,
                "shareType" "public"."location_shares_sharetype_enum" NOT NULL DEFAULT 'public',
                "locationName" character varying NOT NULL,
                "latitude" numeric(10,7) NOT NULL,
                "longitude" numeric(10,7) NOT NULL,
                "description" text,
                "expiresAt" TIMESTAMP,
                "maxAccess" integer,
                "allowedUserIds" text NOT NULL DEFAULT '[]',
                "status" "public"."location_shares_status_enum" NOT NULL DEFAULT 'active',
                "accessCount" integer NOT NULL DEFAULT 0,
                "lastAccessedBy" uuid,
                "lastAccessedAt" TIMESTAMP,
                "eventDate" TIMESTAMP,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_0e55c68fba6353edb67e36cd080" UNIQUE ("shareToken"),
                CONSTRAINT "PK_3d5f46a72c6856676d05f0b66e2" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for location_shares
        await queryRunner.query(`CREATE INDEX "IDX_7c78036b9fc4ff08477e5b9c61" ON "location_shares" ("ownerId")`);
        await queryRunner.query(`CREATE INDEX "IDX_0e55c68fba6353edb67e36cd08" ON "location_shares" ("shareToken")`);
        await queryRunner.query(`CREATE INDEX "IDX_28ae040bf4fd0a0a278d03b900" ON "location_shares" ("status")`);

        // Create route_segments_mapping table
        await queryRunner.query(`
            CREATE TABLE "route_segments_mapping" (
                "routeId" uuid NOT NULL,
                "segmentId" uuid NOT NULL,
                CONSTRAINT "PK_6f7ae48933de8e8a12491fc1d9b" PRIMARY KEY ("routeId", "segmentId")
            )
        `);

        // Create indexes for route_segments_mapping
        await queryRunner.query(`CREATE INDEX "IDX_f8ca36ab4f63168d833775eab3" ON "route_segments_mapping" ("routeId")`);
        await queryRunner.query(`CREATE INDEX "IDX_5e943f0c65951bc8e034514845" ON "route_segments_mapping" ("segmentId")`);

        // Add ALL foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "landmarks" 
            ADD CONSTRAINT "FK_landmarks_location" 
            FOREIGN KEY ("locationId") REFERENCES "locations"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "routes" 
            ADD CONSTRAINT "FK_routes_startLocation" 
            FOREIGN KEY ("startLocationId") REFERENCES "locations"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "routes" 
            ADD CONSTRAINT "FK_routes_endLocation" 
            FOREIGN KEY ("endLocationId") REFERENCES "locations"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "route_steps" 
            ADD CONSTRAINT "FK_route_steps_route" 
            FOREIGN KEY ("routeId") REFERENCES "routes"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "route_segments" 
            ADD CONSTRAINT "FK_42f5eb5528f60d8e703fc803440" 
            FOREIGN KEY ("startLocationId") REFERENCES "locations"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "route_segments" 
            ADD CONSTRAINT "FK_a586ad7688ea83602253e943832" 
            FOREIGN KEY ("endLocationId") REFERENCES "locations"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "location_shares" 
            ADD CONSTRAINT "FK_7c78036b9fc4ff08477e5b9c61a" 
            FOREIGN KEY ("ownerId") REFERENCES "users"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "route_segments_mapping" 
            ADD CONSTRAINT "FK_f8ca36ab4f63168d833775eab36" 
            FOREIGN KEY ("routeId") REFERENCES "routes"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "route_segments_mapping" 
            ADD CONSTRAINT "FK_5e943f0c65951bc8e0345148450" 
            FOREIGN KEY ("segmentId") REFERENCES "route_segments"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" DROP CONSTRAINT "FK_5e943f0c65951bc8e0345148450"`);
        await queryRunner.query(`ALTER TABLE "route_segments_mapping" DROP CONSTRAINT "FK_f8ca36ab4f63168d833775eab36"`);
        await queryRunner.query(`ALTER TABLE "location_shares" DROP CONSTRAINT "FK_7c78036b9fc4ff08477e5b9c61a"`);
        await queryRunner.query(`ALTER TABLE "route_segments" DROP CONSTRAINT "FK_a586ad7688ea83602253e943832"`);
        await queryRunner.query(`ALTER TABLE "route_segments" DROP CONSTRAINT "FK_42f5eb5528f60d8e703fc803440"`);
        await queryRunner.query(`ALTER TABLE "route_steps" DROP CONSTRAINT "FK_route_steps_route"`);
        await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_endLocation"`);
        await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_startLocation"`);
        await queryRunner.query(`ALTER TABLE "landmarks" DROP CONSTRAINT "FK_landmarks_location"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "route_segments_mapping"`);
        await queryRunner.query(`DROP TABLE "location_shares"`);
        await queryRunner.query(`DROP TYPE "public"."location_shares_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."location_shares_sharetype_enum"`);
        await queryRunner.query(`DROP TABLE "route_segments"`);
        await queryRunner.query(`DROP TABLE "route_steps"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TABLE "landmarks"`);
        await queryRunner.query(`DROP TABLE "locations"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_authprovider_enum"`);
    }
}