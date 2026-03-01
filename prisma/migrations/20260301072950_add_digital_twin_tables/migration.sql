-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('INTERNSHIP', 'CONTRACT', 'EMPLOYMENT');

-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('IT', 'NUTRITION', 'EDU', 'OTHER');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "focus" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "vision" TEXT;

-- CreateTable
CREATE TABLE "Experience" (
    "id" SERIAL NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "category" "ExperienceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "highlights" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechStack" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TechStack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceTech" (
    "experienceId" INTEGER NOT NULL,
    "techId" INTEGER NOT NULL,

    CONSTRAINT "ExperienceTech_pkey" PRIMARY KEY ("experienceId","techId")
);

-- CreateTable
CREATE TABLE "InterviewQA" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechStack_name_key" ON "TechStack"("name");

-- AddForeignKey
ALTER TABLE "ExperienceTech" ADD CONSTRAINT "ExperienceTech_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTech" ADD CONSTRAINT "ExperienceTech_techId_fkey" FOREIGN KEY ("techId") REFERENCES "TechStack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
