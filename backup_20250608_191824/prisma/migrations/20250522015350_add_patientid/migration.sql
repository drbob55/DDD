/*
  Warnings:

  - A unique constraint covering the columns `[patientId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "patientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_patientId_key" ON "User"("patientId");
