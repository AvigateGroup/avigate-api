// src/migrations/1234567890123-AddBidirectionalFlagToRouteSegments.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBidirectionalFlagToRouteSegments1234567890123 implements MigrationInterface {
  name = 'AddBidirectionalFlagToRouteSegments1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isBidirectional column to route_segments table
    await queryRunner.addColumn(
      'route_segments',
      new TableColumn({
        name: 'isBidirectional',
        type: 'boolean',
        default: true,
        comment: 'Whether this segment can be traversed in both directions',
      }),
    );

    // Add reversedUsageCount column to track reverse direction usage
    await queryRunner.addColumn(
      'route_segments',
      new TableColumn({
        name: 'reversedUsageCount',
        type: 'int',
        default: 0,
        comment: 'Number of times this segment was used in reverse direction',
      }),
    );

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_route_segments_bidirectional" 
      ON "route_segments" ("isBidirectional", "isActive")
    `);

    console.log('✅ Added bidirectional support columns to route_segments table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_route_segments_bidirectional"
    `);

    // Drop columns
    await queryRunner.dropColumn('route_segments', 'reversedUsageCount');
    await queryRunner.dropColumn('route_segments', 'isBidirectional');

    console.log('✅ Removed bidirectional support columns from route_segments table');
  }
}