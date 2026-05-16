-- Migrate QueryStatus enum: new/contacted/closed → new/in_progress/completed/cancelled

-- Step 1: drop the column default (it depends on the enum type)
ALTER TABLE "customer_queries" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: convert column to text so we can drop the old enum
ALTER TABLE "customer_queries" ALTER COLUMN "status" TYPE text;

-- Step 3: drop old enum
DROP TYPE "QueryStatus";

-- Step 4: create new enum with correct values
CREATE TYPE "QueryStatus" AS ENUM ('new', 'in_progress', 'completed', 'cancelled');

-- Step 5: migrate legacy data
UPDATE "customer_queries" SET "status" = 'in_progress' WHERE "status" = 'contacted';
UPDATE "customer_queries" SET "status" = 'completed'   WHERE "status" = 'closed';

-- Step 6: restore typed column with default
ALTER TABLE "customer_queries" ALTER COLUMN "status" TYPE "QueryStatus" USING "status"::"QueryStatus";
ALTER TABLE "customer_queries" ALTER COLUMN "status" SET DEFAULT 'new';
