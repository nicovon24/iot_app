ALTER TABLE "AiProviderConnection" ADD COLUMN "id" TEXT;
UPDATE "AiProviderConnection" SET "id" = gen_random_uuid()::text;
ALTER TABLE "AiProviderConnection" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AiProviderConnection" ADD COLUMN "instanceUrl" TEXT;
ALTER TABLE "AiProviderConnection" ADD COLUMN "endpointUrl" TEXT;
ALTER TABLE "AiProviderConnection" DROP CONSTRAINT "AiProviderConnection_pkey";
ALTER TABLE "AiProviderConnection" ADD CONSTRAINT "AiProviderConnection_pkey" PRIMARY KEY ("id");
CREATE INDEX "AiProviderConnection_tbUserId_instanceUrl_idx" ON "AiProviderConnection"("tbUserId", "instanceUrl");

CREATE TABLE "AiConversation" (
  "id" TEXT NOT NULL,
  "tbUserId" TEXT NOT NULL,
  "instanceUrl" TEXT NOT NULL,
  "connectionId" TEXT,
  "dashboardId" TEXT,
  "title" TEXT NOT NULL,
  "draft" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiConversation_tbUserId_instanceUrl_updatedAt_idx" ON "AiConversation"("tbUserId", "instanceUrl", "updatedAt");
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "AiProviderConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "draft" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AiUserLimits" (
  "id" TEXT NOT NULL,
  "tbUserId" TEXT NOT NULL,
  "instanceUrl" TEXT NOT NULL,
  "dailyRequests" INTEGER NOT NULL DEFAULT 20,
  "maxOutputTokens" INTEGER NOT NULL DEFAULT 2000,
  CONSTRAINT "AiUserLimits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiUserLimits_tbUserId_instanceUrl_key" ON "AiUserLimits"("tbUserId", "instanceUrl");
