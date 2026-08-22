-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable: add KYC status + new identity/payout fields to User
ALTER TABLE "User"
  ADD COLUMN "kycStatus"           "KycStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "kycSubmittedAt"      TIMESTAMP(3),
  ADD COLUMN "kycReviewedAt"       TIMESTAMP(3),
  ADD COLUMN "kycRejectedReason"   TEXT,
  ADD COLUMN "kycDateOfBirth"      TEXT,
  ADD COLUMN "kycAddress"          TEXT,
  ADD COLUMN "kycIdNumber"         TEXT,
  ADD COLUMN "kycDocBackUrl"       TEXT,
  ADD COLUMN "payoutAccountHolder" TEXT,
  ADD COLUMN "payoutBranch"        TEXT;
