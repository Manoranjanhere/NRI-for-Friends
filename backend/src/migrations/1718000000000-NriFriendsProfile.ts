import { MigrationInterface, QueryRunner } from 'typeorm';

export class NriFriendsProfile1718000000000 implements MigrationInterface {
  name = 'NriFriendsProfile1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "role",
        DROP COLUMN IF EXISTS "weeklyAllowanceExpectation",
        DROP COLUMN IF EXISTS "canProvideAllowance",
        DROP COLUMN IF EXISTS "weeklyAllowanceAmount",
        DROP COLUMN IF EXISTS "canProvideAccommodation",
        DROP COLUMN IF EXISTS "accommodationType",
        DROP COLUMN IF EXISTS "turnOffs"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'turnOns') THEN
          ALTER TABLE "users" RENAME COLUMN "turnOns" TO "passions";
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "passions" text,
        ADD COLUMN IF NOT EXISTS "relationshipStatus" varchar(32),
        ADD COLUMN IF NOT EXISTS "lookingFor" text,
        ADD COLUMN IF NOT EXISTS "interestedIn" varchar(16),
        ADD COLUMN IF NOT EXISTS "motherTongue" varchar(40),
        ADD COLUMN IF NOT EXISTS "religion" varchar(40),
        ADD COLUMN IF NOT EXISTS "education" varchar(40),
        ADD COLUMN IF NOT EXISTS "profession" varchar(60),
        ADD COLUMN IF NOT EXISTS "jobProfile" varchar(80),
        ADD COLUMN IF NOT EXISTS "salaryRange" varchar(40),
        ADD COLUMN IF NOT EXISTS "hideSalary" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "heightCm" integer,
        ADD COLUMN IF NOT EXISTS "grewUpCity" varchar(100),
        ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "dailyInterestCount" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "dailyInterestResetAt" date
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_lastActiveAt" ON "users" ("lastActiveAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_createdAt" ON "users" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "favoriteUserId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorites_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_favorites_pair" UNIQUE ("userId", "favoriteUserId"),
        CONSTRAINT "FK_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_favorites_favoriteUser" FOREIGN KEY ("favoriteUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_favorites_userId" ON "favorites" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_favorites_favoriteUserId" ON "favorites" ("favoriteUserId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_visits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "visitorId" uuid NOT NULL,
        "visitedId" uuid NOT NULL,
        "visitCount" integer NOT NULL DEFAULT 1,
        "lastVisitedAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_visits_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_profile_visits_pair" UNIQUE ("visitorId", "visitedId"),
        CONSTRAINT "FK_profile_visits_visitor" FOREIGN KEY ("visitorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_profile_visits_visited" FOREIGN KEY ("visitedId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_visits_visitorId" ON "profile_visits" ("visitorId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_visits_visitedId" ON "profile_visits" ("visitedId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_visits_lastVisitedAt" ON "profile_visits" ("lastVisitedAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "interests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "senderId" uuid NOT NULL,
        "recipientId" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interests_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interests_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_interests_senderId" ON "interests" ("senderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_interests_recipientId" ON "interests" ("recipientId")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_interests_one_pending"
        ON "interests" ("senderId", "recipientId") WHERE "status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "interests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_visits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_lastActiveAt"`);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "relationshipStatus",
        DROP COLUMN IF EXISTS "lookingFor",
        DROP COLUMN IF EXISTS "interestedIn",
        DROP COLUMN IF EXISTS "motherTongue",
        DROP COLUMN IF EXISTS "religion",
        DROP COLUMN IF EXISTS "education",
        DROP COLUMN IF EXISTS "profession",
        DROP COLUMN IF EXISTS "jobProfile",
        DROP COLUMN IF EXISTS "salaryRange",
        DROP COLUMN IF EXISTS "hideSalary",
        DROP COLUMN IF EXISTS "heightCm",
        DROP COLUMN IF EXISTS "grewUpCity",
        DROP COLUMN IF EXISTS "trialEndsAt",
        DROP COLUMN IF EXISTS "dailyInterestCount",
        DROP COLUMN IF EXISTS "dailyInterestResetAt"
    `);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "passions" TO "turnOns"`);

    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('professional', 'companion')`);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "role" "users_role_enum",
        ADD COLUMN "turnOffs" text,
        ADD COLUMN "weeklyAllowanceExpectation" integer,
        ADD COLUMN "canProvideAllowance" boolean NOT NULL DEFAULT false,
        ADD COLUMN "weeklyAllowanceAmount" integer,
        ADD COLUMN "canProvideAccommodation" boolean NOT NULL DEFAULT false,
        ADD COLUMN "accommodationType" varchar
    `);
  }
}
