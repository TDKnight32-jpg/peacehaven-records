-- Where an approved submission placed, saved at approval time: its place
-- (1-3) in the overall list and in its age-group list, or NULL where it
-- didn't make that list's top 3. Both NULL for pending and declined
-- submissions. Nullable with no default, so existing rows are untouched.
-- AlterTable
ALTER TABLE "RecordSubmission" ADD COLUMN     "overallRank" INTEGER,
ADD COLUMN     "ageGroupRank" INTEGER;
