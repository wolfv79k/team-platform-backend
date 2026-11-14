-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('GITHUB', 'TELEGRAM', 'VK', 'LINKEDIN', 'BEHANCE', 'OTHER', 'DISCORD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resumeUrl" VARCHAR(500),
ADD COLUMN     "websiteUrl" VARCHAR(500);

-- CreateTable
CREATE TABLE "UserSocialLink" (
    "userId" INTEGER NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR(500) NOT NULL,

    CONSTRAINT "UserSocialLink_pkey" PRIMARY KEY ("userId","platform")
);

-- AddForeignKey
ALTER TABLE "UserSocialLink" ADD CONSTRAINT "UserSocialLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
