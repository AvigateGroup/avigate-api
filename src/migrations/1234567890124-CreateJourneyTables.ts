// src/migrations/1234567890124-CreateJourneyTables.ts
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateJourneyTables1234567890124 implements MigrationInterface {
  name = 'CreateJourneyTables1234567890124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create journeys table
    await queryRunner.createTable(
      new Table({
        name: 'journeys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'routeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'startLocation',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'startLatitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'startLongitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'endLocation',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'endLatitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'endLongitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'endLandmark',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['planned', 'in_progress', 'completed', 'cancelled'],
            default: "'planned'",
          },
          {
            name: 'plannedStartTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'actualStartTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'plannedEndTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'actualEndTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'estimatedDuration',
            type: 'int',
          },
          {
            name: 'estimatedDistance',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'estimatedMinFare',
            type: 'int',
          },
          {
            name: 'estimatedMaxFare',
            type: 'int',
          },
          {
            name: 'trackingEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notificationsEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create journey_legs table
    await queryRunner.createTable(
      new Table({
        name: 'journey_legs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'journeyId',
            type: 'uuid',
          },
          {
            name: 'segmentId',
            type: 'uuid',
          },
          {
            name: 'order',
            type: 'int',
          },
          {
            name: 'transportMode',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'estimatedDuration',
            type: 'int',
          },
          {
            name: 'distance',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'minFare',
            type: 'int',
          },
          {
            name: 'maxFare',
            type: 'int',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'in_progress', 'completed', 'skipped'],
            default: "'pending'",
          },
          {
            name: 'actualStartTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'actualEndTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isTransferRequired',
            type: 'boolean',
            default: false,
          },
          {
            name: 'transferInstructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estimatedTransferWaitTime',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'transferAlertSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'transferImminentSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'destinationAlertSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'journeys',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'journeys',
      new TableForeignKey({
        columnNames: ['routeId'],
        referencedTableName: 'routes',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'journey_legs',
      new TableForeignKey({
        columnNames: ['journeyId'],
        referencedTableName: 'journeys',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'journey_legs',
      new TableForeignKey({
        columnNames: ['segmentId'],
        referencedTableName: 'route_segments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_journeys_userId_status" ON "journeys" ("userId", "status");
      CREATE INDEX "IDX_journeys_status" ON "journeys" ("status");
      CREATE INDEX "IDX_journeys_createdAt" ON "journeys" ("createdAt" DESC);
      CREATE INDEX "IDX_journey_legs_journeyId" ON "journey_legs" ("journeyId");
      CREATE INDEX "IDX_journey_legs_status" ON "journey_legs" ("status");
    `);

    console.log('✅ Created journey tables with foreign keys and indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_journeys_userId_status";
      DROP INDEX IF EXISTS "IDX_journeys_status";
      DROP INDEX IF EXISTS "IDX_journeys_createdAt";
      DROP INDEX IF EXISTS "IDX_journey_legs_journeyId";
      DROP INDEX IF EXISTS "IDX_journey_legs_status";
    `);

    // Drop foreign keys
    const journeyTable = await queryRunner.getTable('journeys');
    const journeyLegsTable = await queryRunner.getTable('journey_legs');

    if (journeyTable) {
      const userForeignKey = journeyTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('userId') !== -1,
      );
      const routeForeignKey = journeyTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('routeId') !== -1,
      );

      if (userForeignKey) {
        await queryRunner.dropForeignKey('journeys', userForeignKey);
      }
      if (routeForeignKey) {
        await queryRunner.dropForeignKey('journeys', routeForeignKey);
      }
    }

    if (journeyLegsTable) {
      const journeyForeignKey = journeyLegsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('journeyId') !== -1,
      );
      const segmentForeignKey = journeyLegsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('segmentId') !== -1,
      );

      if (journeyForeignKey) {
        await queryRunner.dropForeignKey('journey_legs', journeyForeignKey);
      }
      if (segmentForeignKey) {
        await queryRunner.dropForeignKey('journey_legs', segmentForeignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('journey_legs', true);
    await queryRunner.dropTable('journeys', true);

    console.log('✅ Removed journey tables');
  }
}