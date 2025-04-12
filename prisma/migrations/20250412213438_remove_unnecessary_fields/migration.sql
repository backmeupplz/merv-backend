/*
  Warnings:

  - You are about to drop the column `ethAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pfpUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `privyUserId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropIndex
DROP INDEX "User_ethAddress_key";

-- DropIndex
DROP INDEX "User_privyUserId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ethAddress",
DROP COLUMN "passId",
DROP COLUMN "pfpUrl",
DROP COLUMN "privyUserId";

-- DropTable
DROP TABLE "ApiKey";
