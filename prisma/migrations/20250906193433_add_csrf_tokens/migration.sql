-- CreateTable
CREATE TABLE "public"."csrf_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csrf_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csrf_tokens_token_key" ON "public"."csrf_tokens"("token");

-- CreateIndex
CREATE INDEX "csrf_tokens_token_idx" ON "public"."csrf_tokens"("token");

-- CreateIndex
CREATE INDEX "csrf_tokens_userId_idx" ON "public"."csrf_tokens"("userId");

-- CreateIndex
CREATE INDEX "csrf_tokens_sessionId_idx" ON "public"."csrf_tokens"("sessionId");

-- CreateIndex
CREATE INDEX "csrf_tokens_expiresAt_idx" ON "public"."csrf_tokens"("expiresAt");
