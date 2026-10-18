-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "coverImageUrls" TEXT[],
ADD COLUMN     "logoUrl" VARCHAR(500),
ADD COLUMN     "partners" TEXT[],
ADD COLUMN     "projectUrl" VARCHAR(500),
ADD COLUMN     "slogan" VARCHAR(160),
ADD COLUMN     "videoUrl" VARCHAR(500);

-- CreateTable
CREATE TABLE "ProjectOpenRole" (
    "projectId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "slots" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProjectOpenRole_pkey" PRIMARY KEY ("projectId","roleId")
);

-- AddForeignKey
ALTER TABLE "ProjectOpenRole" ADD CONSTRAINT "ProjectOpenRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOpenRole" ADD CONSTRAINT "ProjectOpenRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
