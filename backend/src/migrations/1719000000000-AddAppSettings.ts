import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppSettings1719000000000 implements MigrationInterface {
  name = 'AddAppSettings1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" character varying(64) NOT NULL,
        "value" text NOT NULL,
        "updatedBy" uuid,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings_key" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(
      `INSERT INTO "app_settings" ("key", "value") VALUES ('feedEnabled', 'true') ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
