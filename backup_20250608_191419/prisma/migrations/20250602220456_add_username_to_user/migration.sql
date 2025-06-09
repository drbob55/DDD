/*
  Warnings:

  - Added the required column `patientDOB` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientFirstName` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientLastName` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientSex` to the `Case` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "patientFirstName" TEXT NOT NULL,
    "patientLastName" TEXT NOT NULL,
    "patientSex" TEXT NOT NULL,
    "patientDOB" DATETIME NOT NULL,
    "scanFileUrl" TEXT NOT NULL,
    "treatmentPlanUrl" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Case" ("createdAt", "dentistId", "id", "notes", "patientId", "reviewerId", "scanFileUrl", "status", "treatmentPlanUrl", "updatedAt") SELECT "createdAt", "dentistId", "id", "notes", "patientId", "reviewerId", "scanFileUrl", "status", "treatmentPlanUrl", "updatedAt" FROM "Case";
DROP TABLE "Case";
ALTER TABLE "new_Case" RENAME TO "Case";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
