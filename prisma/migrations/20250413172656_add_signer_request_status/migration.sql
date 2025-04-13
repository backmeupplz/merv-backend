-- CreateEnum
CREATE TYPE "SignerRequestStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED');

-- AlterTable
ALTER TABLE "SignerRequest" ADD COLUMN     "status" "SignerRequestStatus" NOT NULL DEFAULT 'PENDING';
