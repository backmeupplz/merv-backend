-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CAST');

-- AlterTable
ALTER TABLE "Signer" ADD COLUMN     "castCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "castRewardUserId" TEXT;

-- CreateTable
CREATE TABLE "MervReward" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MervReward_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Signer" ADD CONSTRAINT "Signer_castRewardUserId_fkey" FOREIGN KEY ("castRewardUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MervReward" ADD CONSTRAINT "MervReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
