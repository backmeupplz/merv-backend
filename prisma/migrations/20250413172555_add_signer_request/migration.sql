-- CreateTable
CREATE TABLE "SignerRequest" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "deepLink" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "SignerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signer" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" TEXT NOT NULL,
    "fid" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,

    CONSTRAINT "Signer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SignerRequest" ADD CONSTRAINT "SignerRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signer" ADD CONSTRAINT "Signer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
