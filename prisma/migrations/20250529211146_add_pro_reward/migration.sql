-- AlterTable
ALTER TABLE "Signer" ADD COLUMN     "proCastCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proCastRewardUserId" TEXT;

-- CreateTable
CREATE TABLE "ProReward" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProReward_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Signer" ADD CONSTRAINT "Signer_proCastRewardUserId_fkey" FOREIGN KEY ("proCastRewardUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProReward" ADD CONSTRAINT "ProReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
