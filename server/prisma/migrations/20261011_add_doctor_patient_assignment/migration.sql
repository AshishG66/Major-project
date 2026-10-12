-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'INACTIVE');

-- CreateTable
CREATE TABLE "DoctorPatientAssignment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "assignedBy" TEXT,
    "revokedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorPatientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_doctorId_status_idx" ON "DoctorPatientAssignment"("doctorId", "status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_patientId_status_idx" ON "DoctorPatientAssignment"("patientId", "status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_doctorId_patientId_status_idx" ON "DoctorPatientAssignment"("doctorId", "patientId", "status");

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
