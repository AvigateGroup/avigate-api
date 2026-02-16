// src/migrations/1234567890125-CreateNotificationsTable.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNotificationsTable1234567890125 implements MigrationInterface {
  name = 'CreateNotificationsTable1234567890125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the enum already exists (may have been created by synchronize)
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum'
    `);

    if (enumExists.length === 0) {
      // Create the enum from scratch
      await queryRunner.query(`
        CREATE TYPE "public"."notifications_type_enum" AS ENUM (
          'trip_started', 'trip_completed', 'trip_cancelled',
          'next_step', 'step_completed', 'approaching', 'approaching_stop',
          'location_shared', 'location_share',
          'community_post',
          'contribution_approved', 'contribution_rejected',
          'contribution_changes_requested', 'contribution_implemented',
          'journey_start', 'journey_complete', 'journey_stopped',
          'transfer_alert', 'transfer_imminent', 'transfer_complete',
          'destination_alert', 'rating_request',
          'system_alert'
        )
      `);
    } else {
      // Enum exists — add any missing values
      const newValues = [
        'step_completed', 'approaching', 'location_share',
        'contribution_changes_requested', 'contribution_implemented',
        'journey_start', 'journey_complete', 'journey_stopped',
        'transfer_alert', 'transfer_imminent', 'transfer_complete',
        'destination_alert', 'rating_request',
      ];

      for (const value of newValues) {
        // ADD VALUE IF NOT EXISTS requires PostgreSQL 9.3+
        await queryRunner.query(
          `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS '${value}'`
        );
      }
    }

    // Check if the table already exists
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    `);

    if (tableExists.length === 0) {
      // Create notifications table
      await queryRunner.createTable(
        new Table({
          name: 'notifications',
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
              name: 'type',
              type: 'notifications_type_enum',
              enumName: 'notifications_type_enum',
            },
            {
              name: 'title',
              type: 'varchar',
            },
            {
              name: 'body',
              type: 'text',
            },
            {
              name: 'data',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'imageUrl',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'isRead',
              type: 'boolean',
              default: false,
            },
            {
              name: 'actionUrl',
              type: 'varchar',
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
            },
          ],
        }),
        true,
      );

      // Create indexes
      await queryRunner.createIndex(
        'notifications',
        new TableIndex({ name: 'IDX_notifications_userId', columnNames: ['userId'] }),
      );
      await queryRunner.createIndex(
        'notifications',
        new TableIndex({ name: 'IDX_notifications_type', columnNames: ['type'] }),
      );
      await queryRunner.createIndex(
        'notifications',
        new TableIndex({ name: 'IDX_notifications_isRead', columnNames: ['isRead'] }),
      );
      await queryRunner.createIndex(
        'notifications',
        new TableIndex({ name: 'IDX_notifications_createdAt', columnNames: ['createdAt'] }),
      );

      // Create foreign key to users table
      await queryRunner.createForeignKey(
        'notifications',
        new TableForeignKey({
          name: 'FK_notifications_userId',
          columnNames: ['userId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    `);

    if (tableExists.length > 0) {
      await queryRunner.dropForeignKey('notifications', 'FK_notifications_userId');
      await queryRunner.dropTable('notifications');
    }

    await queryRunner.query('DROP TYPE IF EXISTS "public"."notifications_type_enum"');
  }
}
