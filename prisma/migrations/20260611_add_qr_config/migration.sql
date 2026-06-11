-- Add qrConfig JSON column to UserIntegration and AppSettings
ALTER TABLE "UserIntegration" ADD COLUMN IF NOT EXISTS "qrConfig" JSONB;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "qrConfig" JSONB;
