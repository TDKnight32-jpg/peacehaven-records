-- Whether an approved submission's place (overallRank / ageGroupRank) was
-- shared with an exactly equal result when approved, for "Joint 2nd" on its
-- share card. Defaults to false, so existing rows are untouched.
-- AlterTable
ALTER TABLE "RecordSubmission" ADD COLUMN     "overallJoint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ageGroupJoint" BOOLEAN NOT NULL DEFAULT false;
