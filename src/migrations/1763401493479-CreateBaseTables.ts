import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBaseTables1763401493479 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "phoneNumber" character varying,
                "phoneNumberCaptured" boolean DEFAULT false,
                "firstName" character varying,
                "lastName" character varying,
                "password" character varying,
                "isEmailVerified" boolean NOT NULL DEFAULT false,
                "isPhoneVerified" boolean NOT NULL DEFAULT false,
                "profilePicture" character varying,
                "googleId" character varying,
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

        // Create indexes for users
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_googleId" ON "users" ("googleId")`);

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

        // Add foreign key for landmarks
        await queryRunner.query(`
            ALTER TABLE "landmarks" 
            ADD CONSTRAINT "FK_landmarks_location" 
            FOREIGN KEY ("locationId") REFERENCES "locations"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // Add foreign keys for routes
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

        // Add foreign key for route_steps
        await queryRunner.query(`
            ALTER TABLE "route_steps" 
            ADD CONSTRAINT "FK_route_steps_route" 
            FOREIGN KEY ("routeId") REFERENCES "routes"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        await queryRunner.query(`ALTER TABLE "route_steps" DROP CONSTRAINT "FK_route_steps_route"`);
        await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_endLocation"`);
        await queryRunner.query(`ALTER TABLE "routes" DROP CONSTRAINT "FK_routes_startLocation"`);
        await queryRunner.query(`ALTER TABLE "landmarks" DROP CONSTRAINT "FK_landmarks_location"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "route_steps"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TABLE "landmarks"`);
        await queryRunner.query(`DROP TABLE "locations"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}