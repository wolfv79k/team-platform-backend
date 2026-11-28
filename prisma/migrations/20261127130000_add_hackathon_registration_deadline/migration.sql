BEGIN;

ALTER TABLE "Hackathon" ADD COLUMN "registrationDeadline" TIMESTAMP(3);

UPDATE "Hackathon" SET "registrationDeadline" = "startDate";

ALTER TABLE "Hackathon" ALTER COLUMN "registrationDeadline" SET NOT NULL;

COMMIT;
