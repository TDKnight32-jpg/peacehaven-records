-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('COMPLETED', 'MISSED');

-- AlterTable
ALTER TABLE "RunnerProgress" DROP COLUMN "completed",
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'COMPLETED';

