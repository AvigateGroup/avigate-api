import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouteSegmentsTable1763500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create route_segments table
    await queryRunner.query(`
      CREATE TABLE "route_segments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "startLocationId" uuid NOT NULL,
        "endLocationId" uuid NOT NULL,
        "intermediateStops" jsonb DEFAULT '[]',
        "transportModes" text NOT NULL,
        "distance" numeric(10,2) NOT NULL,
        "estimatedDuration" numeric(10,2) NOT NULL,
        "minFare" numeric(10,2),
        "maxFare" numeric(10,2),
        "instructions" text NOT NULL,
        "vehicleService" jsonb,
        "landmarks" jsonb DEFAULT '[]',
        "usageCount" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "isVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_route_segments" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_route_segments_startLocationId" ON "route_segments" ("startLocationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_segments_endLocationId" ON "route_segments" ("endLocationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_segments_isActive" ON "route_segments" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_segments_isVerified" ON "route_segments" ("isVerified")`,
    );

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "route_segments" 
      ADD CONSTRAINT "FK_route_segments_startLocation" 
      FOREIGN KEY ("startLocationId") 
      REFERENCES "locations"("id") 
      ON DELETE NO ACTION 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "route_segments" 
      ADD CONSTRAINT "FK_route_segments_endLocation" 
      FOREIGN KEY ("endLocationId") 
      REFERENCES "locations"("id") 
      ON DELETE NO ACTION 
      ON UPDATE NO ACTION
    `);

    // Create the junction table for routes and segments (many-to-many)
    await queryRunner.query(`
      CREATE TABLE "routes_segments" (
        "routeId" uuid NOT NULL,
        "segmentId" uuid NOT NULL,
        "order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_routes_segments" PRIMARY KEY ("routeId", "segmentId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "routes_segments" 
      ADD CONSTRAINT "FK_routes_segments_route" 
      FOREIGN KEY ("routeId") 
      REFERENCES "routes"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "routes_segments" 
      ADD CONSTRAINT "FK_routes_segments_segment" 
      FOREIGN KEY ("segmentId") 
      REFERENCES "route_segments"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `);

    console.log('✅ Created route_segments table and routes_segments junction table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "routes_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_segments"`);
  }
}