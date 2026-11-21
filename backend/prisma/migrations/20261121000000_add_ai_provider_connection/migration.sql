CREATE TABLE "AiProviderConnection" (
  "tbUserId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiProviderConnection_pkey" PRIMARY KEY ("tbUserId")
);
